document.addEventListener('DOMContentLoaded', function () {
    // Проверяем авторизацию
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    // Устанавливаем имя пользователя
    document.getElementById('userName').textContent = user.name;

    // Проверяем, выбрано ли рабочее пространство
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceId = urlParams.get('workspace') || localStorage.getItem('currentWorkspaceId');

    if (workspaceId) {
        // Есть выбранное рабочее пространство, загружаем его доски
        localStorage.setItem('currentWorkspaceId', workspaceId);
        initializeWorkspaceView(workspaceId);
    } else {
        showWorkspaceSelection();
    }
});

async function initializeWorkspaceView(workspaceId) {
    try {
        // Загружаем информацию о рабочем пространстве
        const workspace = await api.getWorkspace(workspaceId);
        localStorage.setItem('currentWorkspace', JSON.stringify(workspace));

        // Показываем селектор рабочего пространства
        setupWorkspaceSelector(workspace);
        document.getElementById('createBoardBtn').style.display = 'inline-block';

        // Загружаем доски для этого рабочего пространства
        loadBoards(workspaceId);

    // Обработчики событий
    document.getElementById('createBoardBtn').addEventListener('click', () => {
        openModal('createBoardModal');
    });

    document.getElementById('createBoardForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('boardTitle').value;
        const description = document.getElementById('boardDescription').value;

            // TODO: Обновить API для создания доски в рабочем пространстве
            const newBoard = await api.createBoard({ title, description, workspaceId });
        closeModal('createBoardModal');
            loadBoards(workspaceId);
    });

    // Поиск досок
    document.getElementById('searchBoards').addEventListener('input', (e) => {
        filterBoards(e.target.value);
    });

    } catch (error) {
        console.error('Error loading workspace:', error);
        showWorkspaceSelection();
    }
}

async function showWorkspaceSelection() {
    // Загружаем доступные рабочие пространства
    try {
        const workspaces = await api.getWorkspaces();

        if (workspaces.length === 0) {
            // Нет рабочих пространств, перенаправляем на страницу создания
            window.location.href = 'workspaces.html';
            return;
        }

        // Показываем выбор рабочего пространства
        document.querySelector('.container').innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2>Выберите рабочее пространство</h2>
                <div class="workspace-list" style="max-width: 600px; margin: 2rem auto;">
                    ${workspaces.map(workspace => `
                        <div class="workspace-card" onclick="selectWorkspace(${workspace.id})">
                            <div class="workspace-card-header">
                                <div class="workspace-card-avatar">
                                    ${getWorkspaceInitials(workspace.name)}
                                </div>
                            </div>
                            <div class="workspace-card-info">
                                <h3>${workspace.name}</h3>
                                <p>${workspace.description || 'Без описания'}</p>
                            </div>
                            <div class="workspace-card-stats">
                                <span>${workspace.members_count} участников</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <a href="workspaces.html" class="btn-secondary">Управление пространствами</a>
            </div>
        `;

    } catch (error) {
        console.error('Error loading workspaces:', error);
        document.querySelector('.container').innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2>Ошибка загрузки</h2>
                <p>Не удалось загрузить рабочие пространства</p>
                <a href="workspaces.html" class="btn-primary">К рабочим пространствам</a>
            </div>
        `;
    }
}

function selectWorkspace(workspaceId) {
    localStorage.setItem('currentWorkspaceId', workspaceId);
    window.location.href = `index.html?workspace=${workspaceId}`;
}

function setupWorkspaceSelector(currentWorkspace) {
    const selector = document.getElementById('workspaceSelector');
    selector.style.display = 'flex';

    selector.innerHTML = `
        <div class="workspace-avatar">
            ${getWorkspaceInitials(currentWorkspace.name)}
        </div>
        <div class="workspace-info">
            <h3>${currentWorkspace.name}</h3>
            <p>${currentWorkspace.members.length} участников</p>
        </div>
    `;

    // Добавляем обработчик для переключения рабочего пространства
    selector.addEventListener('click', showWorkspaceDropdown);
}

async function showWorkspaceDropdown() {
    try {
        const workspaces = await api.getWorkspaces();
        const currentWorkspaceId = localStorage.getItem('currentWorkspaceId');

        const dropdown = document.createElement('div');
        dropdown.className = 'workspace-dropdown';

        dropdown.innerHTML = workspaces.map(workspace => `
            <div class="workspace-option ${workspace.id == currentWorkspaceId ? 'active' : ''}"
                 onclick="switchWorkspace(${workspace.id})">
                <div class="workspace-option-avatar">
                    ${getWorkspaceInitials(workspace.name)}
                </div>
                <div class="workspace-option-info">
                    <h4>${workspace.name}</h4>
                    <p>${workspace.members_count} участников</p>
                </div>
            </div>
        `).join('');

        // Добавляем кнопку создания нового пространства
        dropdown.innerHTML += `
            <div class="workspace-option" onclick="window.location.href='workspaces.html'">
                <div class="workspace-option-avatar" style="background: var(--primary-color);">
                    +
                </div>
                <div class="workspace-option-info">
                    <h4>Создать пространство</h4>
                    <p>Новое рабочее пространство</p>
                </div>
            </div>
        `;

        const selector = document.getElementById('workspaceSelector');
        selector.appendChild(dropdown);

        // Закрываем dropdown при клике вне его
        document.addEventListener('click', function closeDropdown(e) {
            if (!selector.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });

    } catch (error) {
        console.error('Error loading workspaces for dropdown:', error);
    }
}

function switchWorkspace(workspaceId) {
    localStorage.setItem('currentWorkspaceId', workspaceId);
    window.location.href = `index.html?workspace=${workspaceId}`;
}

function getWorkspaceInitials(name) {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
}

async function loadBoards(workspaceId) {
    const boardsGrid = document.getElementById('boardsGrid');
    const isTestUser = localStorage.getItem('isTestUser') === 'true';

    // Показываем индикатор тестового режима
    if (isTestUser) {
        showTestUserIndicator();
    }

    boardsGrid.innerHTML = '<div class="loading">Загрузка досок рабочего пространства...</div>';

    try {
        // TODO: Обновить API для получения досок конкретного рабочего пространства
        // Пока используем заглушку
        const boards = await api.getBoards();

        // Фильтруем доски по рабочему пространству (пока заглушка)
        const workspaceBoards = boards.filter(board => {
            // В будущем здесь будет фильтрация по workspaceId
            return true; // Пока показываем все доски
        });

        renderBoards(workspaceBoards);
    } catch (error) {
        boardsGrid.innerHTML = '<div class="loading">Ошибка загрузки досок</div>';
        console.error('Error loading boards:', error);
    }
}

// Функция для показа индикатора тестового пользователя
function showTestUserIndicator() {
    const existingIndicator = document.querySelector('.test-user-indicator');
    if (existingIndicator) return;

    const indicator = document.createElement('div');
    indicator.className = 'test-user-indicator';
    indicator.innerHTML = `
        <div style="background: #ffeb3b; color: #333; padding: 0.5rem 1rem; border-radius: 4px; 
                    margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <span>🔧 Вы в тестовом режиме. Данные сохраняются локально.</span>
            <button onclick="exitTestMode()" style="background: transparent; border: 1px solid #333; 
                    padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">
                Выйти
            </button>
        </div>
    `;

    const container = document.querySelector('.container');
    container.insertBefore(indicator, container.firstChild);
}

// Функция для выхода из тестового режима
function exitTestMode() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isTestUser');
    window.location.href = 'login.html';
}

// Храним данные о досках для проверки демо-режима
let boardsData = [];

// Открытие досок с поддержкой демо-режима
function openBoard(boardId) {
    // Проверяем, является ли доска демо-доской
    const board = boardsData.find(b => b.id === boardId);
    const isDemo = board?.isDemo === true;
    
    if (isDemo) {
        window.location.href = `dashboard.html?board=${boardId}&demo=true`;
    } else {
        window.location.href = `dashboard.html?board=${boardId}`;
    }
}

function renderBoards(boards) {
    const boardsGrid = document.getElementById('boardsGrid');
    
    // Сохраняем данные о досках для использования в openBoard
    boardsData = boards;
    
    if (boards.length === 0) {
        boardsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <h3>У вас пока нет досок</h3>
                <p>Создайте свою первую доску для начала работы</p>
                <button class="btn-primary" onclick="openModal('createBoardModal')">Создать доску</button>
            </div>
        `;
        return;
    }
    
    boardsGrid.innerHTML = boards.map(board => `
        <div class="board-card" onclick="openBoard(${board.id})">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h3>${board.title}</h3>
                ${board.isDemo ? '<span class="demo-badge" style="background: #ffeb3b; color: #333; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.7rem;">DEMO</span>' : ''}
            </div>
            <p>${board.description || 'Без описания'}</p>
            <div class="board-meta">
                <span>${new Date(board.updatedAt).toLocaleDateString()}</span>
                <span>${board.itemsCount} элементов</span>
            </div>
        </div>
    `).join('');
}

function filterBoards(searchTerm) {
    const boards = document.querySelectorAll('.board-card');
    boards.forEach(board => {
        const title = board.querySelector('h3').textContent.toLowerCase();
        const description = board.querySelector('p').textContent.toLowerCase();
        const search = searchTerm.toLowerCase();

        if (title.includes(search) || description.includes(search)) {
            board.style.display = 'block';
        } else {
            board.style.display = 'none';
        }
    });
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.getElementById(modalId).querySelector('form').reset();
}

// Закрытие модального окна при клике вне его
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});