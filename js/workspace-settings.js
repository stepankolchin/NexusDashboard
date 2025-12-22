document.addEventListener('DOMContentLoaded', function () {
    // Проверяем авторизацию
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    // Получаем ID рабочего пространства из URL
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceId = urlParams.get('id');

    if (!workspaceId) {
        window.location.href = 'workspaces.html';
        return;
    }

    // Устанавливаем имя пользователя
    document.getElementById('userName').textContent = user.name;

    // Загружаем настройки рабочего пространства
    loadWorkspaceSettings(workspaceId);

    // Обработчики событий
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
});

async function loadWorkspaceSettings(workspaceId) {
    const container = document.getElementById('workspaceSettings');

    try {
        const workspace = await api.getWorkspace(workspaceId);

        // Определяем роль текущего пользователя
        const currentUserRole = workspace.members.find(m => m.user_id === JSON.parse(localStorage.getItem('user')).id)?.role || 'viewer';
        const isOwner = currentUserRole === 'owner';
        const isAdmin = currentUserRole === 'admin' || isOwner;
        const canManageMembers = isAdmin;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Общие настройки</h3>
                <form id="workspaceForm" class="settings-form">
                    <div class="form-group">
                        <label for="workspaceName">Название</label>
                        <input type="text" id="workspaceName" value="${workspace.name}" ${isAdmin ? '' : 'disabled'}>
                    </div>
                    <div class="form-group">
                        <label for="workspaceDescription">Описание</label>
                        <textarea id="workspaceDescription" ${isAdmin ? '' : 'disabled'}>${workspace.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="workspaceAvatar">URL аватара</label>
                        <input type="url" id="workspaceAvatar" value="${workspace.avatar_url || ''}" ${isAdmin ? '' : 'disabled'}>
                    </div>
                    ${isAdmin ? '<button type="submit" class="btn-primary">Сохранить изменения</button>' : ''}
                </form>
            </div>

            <div class="settings-section">
                <h3>Участники (${workspace.members.length})</h3>
                ${canManageMembers ? `
                    <form id="inviteMemberForm" class="invite-form">
                        <input type="email" id="inviteEmail" placeholder="Email адрес" required>
                        <select id="inviteRole" required>
                            <option value="viewer">Наблюдатель</option>
                            <option value="member">Участник</option>
                            <option value="admin">Администратор</option>
                        </select>
                        <button type="submit">Пригласить</button>
                    </form>
                ` : ''}
                <div class="members-list" id="membersList">
                    ${renderMembers(workspace.members, currentUserRole)}
                </div>
            </div>

            ${isOwner ? `
                <div class="settings-section">
                    <h3>Опасная зона</h3>
                    <button id="transferOwnershipBtn" class="btn-secondary">Передать владение</button>
                    <button id="deleteWorkspaceBtn" class="btn-danger">Удалить пространство</button>
                </div>
            ` : ''}
        `;

        // Обработчики для формы рабочего пространства
        if (isAdmin) {
            document.getElementById('workspaceForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await updateWorkspace(workspaceId);
            });
        }

        // Обработчики для приглашения участников
        if (canManageMembers) {
            document.getElementById('inviteMemberForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await inviteMember(workspaceId);
            });
        }

        // Обработчики для опасных действий
        if (isOwner) {
            document.getElementById('transferOwnershipBtn').addEventListener('click', () => {
                showTransferOwnershipModal(workspace);
            });

            document.getElementById('deleteWorkspaceBtn').addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите удалить это рабочее пространство? Это действие нельзя отменить.')) {
                    deleteWorkspace(workspaceId);
                }
            });
        }

    } catch (error) {
        container.innerHTML = '<div class="loading">Ошибка загрузки настроек</div>';
        console.error('Ошибка загрузки настроек рабочего пространства:', error);
    }
}

function renderMembers(members, currentUserRole) {
    const currentUserId = JSON.parse(localStorage.getItem('user')).id;
    const isOwner = currentUserRole === 'owner';
    const isAdmin = currentUserRole === 'admin' || isOwner;

    return members.map(member => {
        const canEditRole = isAdmin && member.user_id !== currentUserId; // Нельзя менять свою роль
        const canRemove = isAdmin && member.role !== 'owner' && member.user_id !== currentUserId; // Нельзя удалить владельца или себя

        return `
            <div class="member-item">
                <div class="member-info">
                    <div class="member-avatar">
                        ${getMemberInitials(member.name)}
                    </div>
                    <div class="member-details">
                        <h4>${member.name} ${member.user_id === currentUserId ? '(Вы)' : ''}</h4>
                        <p>${member.email}</p>
                    </div>
                </div>
                <div class="member-role">${getRoleDisplayName(member.role)}</div>
                <div class="member-actions">
                    ${canEditRole ? `<button class="btn-secondary" onclick="changeMemberRole(${member.user_id}, '${member.role}', '${member.name}')">Изменить роль</button>` : ''}
                    ${canRemove ? `<button class="btn-danger" onclick="removeMember(${member.user_id}, '${member.name}')">Удалить</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function getMemberInitials(name) {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
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

// Глобальные функции для обработчиков событий
window.changeMemberRole = function(userId, currentRole, userName) {
    document.getElementById('changeRoleUser').innerHTML = `Пользователь: <strong>${userName}</strong>`;
    document.getElementById('newRole').value = currentRole;
    document.getElementById('changeRoleModal').dataset.userId = userId;
    openModal('changeRoleModal');
};

window.removeMember = function(userId, userName) {
    if (confirm(`Вы уверены, что хотите удалить ${userName} из этого рабочего пространства?`)) {
        // Получаем workspaceId из URL
        const urlParams = new URLSearchParams(window.location.search);
        const workspaceId = urlParams.get('id');
        removeMemberFromWorkspace(workspaceId, userId);
    }
};

async function updateWorkspace(workspaceId) {
    const name = document.getElementById('workspaceName').value.trim();
    const description = document.getElementById('workspaceDescription').value;
    const avatar_url = document.getElementById('workspaceAvatar').value;

    if (!name) {
        alert('Название рабочего пространства обязательно');
        return;
    }

    try {
        await api.updateWorkspace(workspaceId, { name, description, avatar_url });
        alert('Настройки сохранены');
        loadWorkspaceSettings(workspaceId); // Перезагружаем
    } catch (error) {
        alert('Ошибка при сохранении настроек: ' + error.message);
    }
}

async function inviteMember(workspaceId) {
    const email = document.getElementById('inviteEmail').value;
    const role = document.getElementById('inviteRole').value;

    try {
        await api.inviteMember(workspaceId, { email, role });
        alert('Приглашение отправлено');
        document.getElementById('inviteMemberForm').reset();
        loadWorkspaceSettings(workspaceId); // Перезагружаем
    } catch (error) {
        alert('Ошибка при отправке приглашения: ' + error.message);
    }
}

async function removeMemberFromWorkspace(workspaceId, userId) {
    try {
        await api.removeMember(workspaceId, userId);
        loadWorkspaceSettings(workspaceId); // Перезагружаем
    } catch (error) {
        alert('Ошибка при удалении участника: ' + error.message);
    }
}

function showTransferOwnershipModal(workspace) {
    const select = document.getElementById('newOwner');
    select.innerHTML = workspace.members
        .filter(member => member.role !== 'owner')
        .map(member => `<option value="${member.user_id}">${member.name} (${member.email})</option>`)
        .join('');

    openModal('transferOwnershipModal');

    document.getElementById('transferOwnershipForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const urlParams = new URLSearchParams(window.location.search);
        const workspaceId = urlParams.get('id');
        await transferOwnership(workspaceId);
    });
}

async function transferOwnership(workspaceId) {
    const newOwnerId = document.getElementById('newOwner').value;

    try {
        await api.transferOwnership(workspaceId, newOwnerId);
        alert('Владение передано успешно');
        closeModal('transferOwnershipModal');
        // Перезагружаем страницу, так как роль пользователя изменилась
        window.location.reload();
    } catch (error) {
        alert('Ошибка при передаче владения: ' + error.message);
    }
}

async function deleteWorkspace(workspaceId) {
    try {
        await api.deleteWorkspace(workspaceId);
        window.location.href = 'workspaces.html';
    } catch (error) {
        alert('Ошибка при удалении рабочего пространства: ' + error.message);
    }
}

// Обработчики для модальных окон ролей
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('changeRoleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const urlParams = new URLSearchParams(window.location.search);
        const workspaceId = urlParams.get('id');
        const userId = document.getElementById('changeRoleModal').dataset.userId;
        const newRole = document.getElementById('newRole').value;

        try {
            await api.updateMemberRole(workspaceId, userId, newRole);
            closeModal('changeRoleModal');
            loadWorkspaceSettings(workspaceId); // Перезагружаем
        } catch (error) {
            alert('Ошибка при изменении роли: ' + error.message);
        }
    });
});

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

