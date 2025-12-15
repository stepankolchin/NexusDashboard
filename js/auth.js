document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Переключение между вкладками
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Активируем кнопку
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Показываем соответствующую форму
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.remove('active');
            });
            document.getElementById(`${tab}Form`).classList.add('active');
        });
    });

    // Обработка входа
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        // const result = await api.login(email, password);
        
        // if (result.success) {
            // Сохраняем данные пользователя
            localStorage.setItem('user', JSON.stringify(result.user));
            localStorage.setItem('token', 123);//result.token);
            
            // Перенаправляем на главную
            window.location.href = 'index.html';
        // } else {
        //     alert('Ошибка входа: ' + (result.error || 'Неверные данные'));
        // }
    });

    // Обработка регистрации
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
            name: document.getElementById('registerName').value,
            email: document.getElementById('registerEmail').value,
            password: document.getElementById('registerPassword').value
        };
        
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        if (userData.password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }
        
        const result = await api.register(userData);
        
        if (result.success) {
            localStorage.setItem('user', JSON.stringify(result.user));
            localStorage.setItem('token', result.token);
            window.location.href = 'index.html';
        } else {
            alert('Ошибка регистрации: ' + (result.error || 'Попробуйте еще раз'));
        }
    });

    document.getElementById('testUserBtn').addEventListener('click', async () => {
    const testUser = {
        id: 999,
        name: 'Тестовый Пользователь',
        email: 'test@example.com'
    };
    
    // Сохраняем данные пользователя
    localStorage.setItem('user', JSON.stringify(testUser));
    localStorage.setItem('token', 'test-token-' + Date.now());
    localStorage.setItem('isTestUser', 'true'); // Помечаем как тестового пользователя
    
    // Перенаправляем на главную
    window.location.href = 'index.html';
});

// Также обновляем проверку авторизации в конце файла:
// Проверяем, авторизован ли пользователь
const token = localStorage.getItem('token');
if (token && window.location.pathname.includes('login.html')) {
    window.location.href = 'index.html';
}

    
});