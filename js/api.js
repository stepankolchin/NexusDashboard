// Модуль для работы с API - сейчас заглушки
class ApiService {
    constructor() {
        this.baseUrl = '/api'; // Будет заменено на реальный URL
    }

    // Авторизация
    async login(email, password) {
        console.log('Login attempt:', email);
        // Заглушка - в реальности будет POST запрос
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    user: {
                        id: 1,
                        name: 'Тестовый пользователь',
                        email: email
                    },
                    token: 'fake-jwt-token'
                });
            }, 1000);
        });
    }

    async register(userData) {
        console.log('Register attempt:', userData);
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    user: {
                        id: 1,
                        name: userData.name,
                        email: userData.email
                    },
                    token: 'fake-jwt-token'
                });
            }, 1000);
        });
    }

    // Доски
    async getBoards() {
    const isTestUser = localStorage.getItem('isTestUser') === 'true';
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const baseBoards = [
                {
                    id: 1,
                    title: 'Проект А',
                    description: 'Мозговой штурм по новому проекту',
                    updatedAt: new Date().toISOString(),
                    itemsCount: 15
                },
                {
                    id: 2,
                    title: 'Архитектура системы',
                    description: 'Диаграмма компонентов',
                    updatedAt: new Date(Date.now() - 86400000).toISOString(),
                    itemsCount: 8
                }
            ];

            // Если это тестовый пользователь, добавляем демо-доски
            if (isTestUser) {
                baseBoards.push(
                    {
                        id: 3,
                        title: 'Демо: User Flow приложения',
                        description: 'Автоматически сгенерированная AI диаграмма',
                        updatedAt: new Date().toISOString(),
                        itemsCount: 23,
                        isDemo: true
                    },
                    {
                        id: 4,
                        title: 'Демо: CI/CD Pipeline',
                        description: 'Пример workflow разработки',
                        updatedAt: new Date(Date.now() - 172800000).toISOString(),
                        itemsCount: 12,
                        isDemo: true
                    }
                );
            }

            resolve(baseBoards);
        }, 500);
    });
}

// Добавляем метод для получения демо-доски
async getDemoBoard(boardId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const demoBoards = {
                3: {
                    id: 3,
                    title: 'Демо: User Flow приложения',
                    items: [
                        { id: 1, type: 'rectangle', x: 100, y: 100, width: 200, height: 80, content: 'Старт', color: '#4CAF50' },
                        { id: 2, type: 'rectangle', x: 400, y: 100, width: 200, height: 80, content: 'Авторизация', color: '#2196F3' },
                        { id: 3, type: 'rectangle', x: 700, y: 100, width: 200, height: 80, content: 'Главная страница', color: '#2196F3' },
                        { id: 4, type: 'line', x1: 300, y1: 140, x2: 400, y2: 140, points: [] },
                        { id: 5, type: 'line', x1: 600, y1: 140, x2: 700, y2: 140, points: [] },
                        { id: 6, type: 'text', x: 150, y: 200, content: 'AI-помощник может автоматически создавать такие схемы!', fontSize: 16 }
                    ]
                },
                4: {
                    id: 4,
                    title: 'Демо: CI/CD Pipeline',
                    items: [
                        { id: 1, type: 'rectangle', x: 100, y: 100, width: 180, height: 60, content: 'Git Commit', color: '#FF9800' },
                        { id: 2, type: 'rectangle', x: 350, y: 100, width: 180, height: 60, content: 'Build', color: '#FF9800' },
                        { id: 3, type: 'rectangle', x: 600, y: 100, width: 180, height: 60, content: 'Test', color: '#FF9800' },
                        { id: 4, type: 'rectangle', x: 850, y: 100, width: 180, height: 60, content: 'Deploy', color: '#4CAF50' },
                        { id: 5, type: 'line', x1: 280, y1: 130, x2: 350, y2: 130, points: [] },
                        { id: 6, type: 'line', x1: 530, y1: 130, x2: 600, y2: 130, points: [] },
                        { id: 7, type: 'line', x1: 780, y1: 130, x2: 850, y2: 130, points: [] }
                    ]
                }
            };

            resolve(demoBoards[boardId] || {
                id: boardId,
                title: 'Демо доска',
                items: []
            });
        }, 500);
    });
}

// Обновляем метод getBoard для поддержки демо-досок
async getBoard(boardId) {
    const isTestUser = localStorage.getItem('isTestUser') === 'true';
    
    if (isTestUser && (boardId == 3 || boardId == 4)) {
        return this.getDemoBoard(boardId);
    }

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                id: boardId,
                title: 'Тестовая доска',
                items: [
                    { id: 1, type: 'rectangle', x: 100, y: 100, width: 200, height: 100, content: 'Прямоугольник 1' },
                    { id: 2, type: 'text', x: 150, y: 200, content: 'Текстовый блок' }
                ]
            });
        }, 500);
    });
}

    async createBoard(boardData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    id: Date.now(),
                    ...boardData,
                    createdAt: new Date().toISOString(),
                    itemsCount: 0
                });
            }, 500);
        });
    }
    
    async updateBoard(boardId, data) {
        console.log('Updating board:', boardId, data);
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 300);
        });
    }

    // AI функционал
    async aiGenerate(prompt, context) {
        console.log('AI request:', prompt, context);
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    result: `Сгенерированный контент для: "${prompt}"`,
                    elements: [
                        { type: 'rectangle', x: 300, y: 300, width: 150, height: 80, content: 'AI элемент' }
                    ]
                });
            }, 2000);
        });
    }
}

// Создаем глобальный экземпляр API
window.api = new ApiService();