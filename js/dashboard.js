document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const boardId = urlParams.get('board');

    if (!boardId) {
        alert('Board ID not found in URL');
        window.location.href = 'index.html';
        return;
    }

    const canvas = document.getElementById('mainCanvas');
    if (!canvas) {
        alert('Canvas element not found!');
        return;
    }

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    window.whiteboard = new ExtendedWhiteboard(canvas, boardId);
    window.whiteboard.connectWebSocket();

    fetchBoardInfo(boardId);
    initializeUserMenu();
});

function initializeUserMenu() {
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.style.display = 'none';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user && user.name) {
        userAvatar.textContent = user.name.charAt(0).toUpperCase();
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function fetchBoardInfo(boardId) {
    try {
        document.getElementById('boardTitle').textContent = `Board ${boardId}`;
    } catch (error) {
        console.error('Ошибка получения информации о доске:', error);
    }
}