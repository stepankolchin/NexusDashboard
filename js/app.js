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

    // Загружаем доски
    loadBoards();

    // Обработчики событий
    document.getElementById('createBoardBtn').addEventListener('click', () => {
        openModal('createBoardModal');
    });

    document.getElementById('createBoardForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('boardTitle').value;
        const description = document.getElementById('boardDescription').value;

        const newBoard = await api.createBoard({ title, description });
        closeModal('createBoardModal');
        loadBoards(); // Перезагружаем список
    });

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // Поиск досок
    document.getElementById('searchBoards').addEventListener('input', (e) => {
        filterBoards(e.target.value);
    });
});

async function loadBoards() {
    const boardsGrid = document.getElementById('boardsGrid');
    const isTestUser = localStorage.getItem('isTestUser') === 'true';

    // Показываем индикатор тестового режима
    if (isTestUser) {
        showTestUserIndicator();
    }

    boardsGrid.innerHTML = '<div class="loading">Загрузка ваших досок...</div>';
    boardsGrid.innerHTML = '<div class="loading">Загрузка ваших досок...</div>';
    try {
        const boards = await api.getBoards();
        renderBoards(boards);
    } catch (error) {
        boardsGrid.innerHTML = '<div class="loading">Ошибка загрузки досок</div>';
    }
}

// Добавляем новую функцию для показа индикатора тестового пользователя
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

// Функция openBoard для открытия досок с поддержкой демо-режима
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

// async function loadBoards() {


//     const boardsGrid = document.getElementById('boardsGrid');
//     boardsGrid.innerHTML = '<div class="loading">Загрузка ваших досок...</div>';

//     try {
//         const boards = await api.getBoards();
//         renderBoards(boards);
//     } catch (error) {
//         boardsGrid.innerHTML = '<div class="loading">Ошибка загрузки досок</div>';
//     }
// }

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

// function renderBoards(boards) {
//     const boardsGrid = document.getElementById('boardsGrid');

//     if (boards.length === 0) {
//         boardsGrid.innerHTML = `
//             <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
//                 <h3>У вас пока нет досок</h3>
//                 <p>Создайте свою первую доску для начала работы</p>
//                 <button class="btn-primary" onclick="openModal('createBoardModal')">Создать доску</button>
//             </div>
//         `;
//         return;
//     }

//     boardsGrid.innerHTML = boards.map(board => `
//         <div class="board-card" onclick="openBoard(${board.id})">
//             <h3>${board.title}</h3>
//             <p>${board.description || 'Без описания'}</p>
//             <div class="board-meta">
//                 <span>${new Date(board.updatedAt).toLocaleDateString()}</span>
//                 <span>${board.itemsCount} элементов</span>
//             </div>
//         </div>
//     `).join('');
// }

function filterBoards(searchTerm) {
    // В реальном приложении это будет делаться на бэкенде
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