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

    // Загружаем рабочие пространства
    loadWorkspaces();

    // Обработчики событий
    document.getElementById('createWorkspaceBtn').addEventListener('click', () => {
        openModal('createWorkspaceModal');
    });

    document.getElementById('createWorkspaceForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('workspaceName').value.trim();
        const description = document.getElementById('workspaceDescription').value;
        const avatar_url = document.getElementById('workspaceAvatar').value;

        try {
            await api.createWorkspace({ name, description, avatar_url });
            closeModal('createWorkspaceModal');
            loadWorkspaces(); // Перезагружаем список
        } catch (error) {
            alert('Ошибка при создании рабочего пространства: ' + error.message);
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
});

async function loadWorkspaces() {
    const workspaceList = document.getElementById('workspaceList');
    workspaceList.innerHTML = '<div class="loading">Загрузка рабочих пространств...</div>';

    try {
        const workspaces = await api.getWorkspaces();
        renderWorkspaces(workspaces);
    } catch (error) {
        workspaceList.innerHTML = '<div class="loading">Ошибка загрузки рабочих пространств</div>';
        console.error('Ошибка загрузки рабочих пространств:', error);
    }
}

function renderWorkspaces(workspaces) {
    const workspaceList = document.getElementById('workspaceList');

    if (workspaces.length === 0) {
        workspaceList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <h3>У вас пока нет рабочих пространств</h3>
                <p>Создайте свое первое рабочее пространство для начала работы</p>
                <button class="btn-primary" onclick="openModal('createWorkspaceModal')">Создать пространство</button>
            </div>
        `;
        return;
    }

    workspaceList.innerHTML = workspaces.map(workspace => `
        <div class="workspace-card" onclick="openWorkspace(${workspace.id})">
            <div class="workspace-card-header">
                <div class="workspace-card-avatar">
                    ${getWorkspaceInitials(workspace.name)}
                </div>
                <div class="workspace-card-actions">
                    <button class="workspace-action-btn" onclick="showWorkspaceActions(event, ${workspace.id}, '${workspace.name}')">
                        ⋮
                    </button>
                </div>
            </div>
            <div class="workspace-card-info">
                <h3>${workspace.name}</h3>
                <p>${workspace.description || 'Без описания'}</p>
            </div>
            <div class="workspace-card-stats">
                <span>${workspace.members_count} участников</span>
                <span>Владелец: ${workspace.owner_name}</span>
            </div>
        </div>
    `).join('');
}

function getWorkspaceInitials(name) {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
}

function openWorkspace(workspaceId) {
    // Сохраняем выбранное рабочее пространство
    localStorage.setItem('currentWorkspaceId', workspaceId);
    // Переходим на страницу досок с выбранным пространством
    window.location.href = `index.html?workspace=${workspaceId}`;
}

function showWorkspaceActions(event, workspaceId, workspaceName) {
    event.stopPropagation();

    document.getElementById('workspaceActionsTitle').textContent = `Действия: ${workspaceName}`;

    // Сохраняем ID рабочего пространства для действий
    document.getElementById('workspaceActionsModal').dataset.workspaceId = workspaceId;

    openModal('workspaceActionsModal');
}

// Обработчики для действий с рабочим пространством
document.addEventListener('click', function(e) {
    if (e.target.id === 'editWorkspaceBtn') {
        const workspaceId = document.getElementById('workspaceActionsModal').dataset.workspaceId;
        window.location.href = `workspace-settings.html?id=${workspaceId}`;
        closeModal('workspaceActionsModal');
    }

    if (e.target.id === 'manageMembersBtn') {
        const workspaceId = document.getElementById('workspaceActionsModal').dataset.workspaceId;
        window.location.href = `workspace-settings.html?id=${workspaceId}#members`;
        closeModal('workspaceActionsModal');
    }

    if (e.target.id === 'deleteWorkspaceBtn') {
        const workspaceId = document.getElementById('workspaceActionsModal').dataset.workspaceId;
        if (confirm('Вы уверены, что хотите удалить это рабочее пространство? Это действие нельзя отменить.')) {
            deleteWorkspace(workspaceId);
        }
    }
});

async function deleteWorkspace(workspaceId) {
    try {
        await api.deleteWorkspace(workspaceId);
        closeModal('workspaceActionsModal');
        loadWorkspaces(); // Перезагружаем список
    } catch (error) {
        alert('Ошибка при удалении рабочего пространства: ' + error.message);
    }
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    const form = document.getElementById(modalId).querySelector('form');
    if (form) form.reset();
}

// Закрытие модального окна при клике вне его
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

