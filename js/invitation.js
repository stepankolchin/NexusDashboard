document.addEventListener('DOMContentLoaded', function () {
    // Получаем токен приглашения из URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showError('Неверная ссылка приглашения');
        return;
    }

    // Загружаем информацию о приглашении
    loadInvitation(token);
});

async function loadInvitation(token) {
    const container = document.getElementById('invitationContainer');

    try {
        const invitation = await api.getInvitation(token);

        container.innerHTML = `
            <h2>Приглашение в рабочее пространство</h2>
            <div class="invitation-details">
                <h3>${invitation.workspace_name}</h3>
                <p>${invitation.workspace_description || 'Без описания'}</p>
                <p><strong>Роль:</strong> ${getRoleDisplayName(invitation.role)}</p>
                <p><strong>Приглашает:</strong> ${invitation.invited_by_name}</p>
                <p><em>Ссылка действительна до ${new Date(invitation.expires_at).toLocaleString()}</em></p>
            </div>
            <div class="invitation-actions">
                <button id="acceptBtn" class="btn-primary">Принять приглашение</button>
                <button id="rejectBtn" class="btn-secondary">Отклонить</button>
            </div>
        `;

        // Обработчики кнопок
        document.getElementById('acceptBtn').addEventListener('click', () => acceptInvitation(invitation));
        document.getElementById('rejectBtn').addEventListener('click', () => rejectInvitation(invitation));

    } catch (error) {
        showError('Приглашение не найдено или истекло срок действия');
        console.error('Ошибка загрузки приглашения:', error);
    }
}

async function acceptInvitation(invitation) {
    // Проверяем авторизацию
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!user || !token) {
        // Пользователь не авторизован, перенаправляем на страницу входа
        // с параметром для возврата после авторизации
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = `login.html?returnUrl=${currentUrl}`;
        return;
    }

    try {
        await api.acceptInvitation(invitation.workspace_id, invitation.id);
        alert('Приглашение принято! Вы добавлены в рабочее пространство.');
        window.location.href = 'workspaces.html';
    } catch (error) {
        alert('Ошибка при принятии приглашения: ' + error.message);
    }
}

async function rejectInvitation(invitation) {
    // Проверяем авторизацию
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!user || !token) {
        // Для отклонения тоже нужна авторизация
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = `login.html?returnUrl=${currentUrl}`;
        return;
    }

    try {
        await api.rejectInvitation(invitation.workspace_id, invitation.id);
        alert('Приглашение отклонено.');
        window.location.href = 'login.html'; // Возвращаемся на страницу входа
    } catch (error) {
        alert('Ошибка при отклонении приглашения: ' + error.message);
    }
}

function getRoleDisplayName(role) {
    const roles = {
        'owner': 'Владелец',
        'admin': 'Администратор',
        'member': 'Участник',
        'viewer': 'Наблюдатель'
    };
    return roles[role] || role;
}

function showError(message) {
    const container = document.getElementById('invitationContainer');
    container.innerHTML = `
        <h2>Ошибка</h2>
        <p>${message}</p>
        <div class="invitation-actions">
            <a href="login.html" class="btn-primary">Войти</a>
            <a href="index.html" class="btn-secondary">На главную</a>
        </div>
    `;
}

