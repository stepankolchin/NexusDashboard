// Модуль для работы с API - сейчас заглушки
class ApiService {
    constructor() {
        // Always use full URL to backend API server for consistency
        this.baseUrl = 'http://localhost:3001/api';
    }

    // Авторизация
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async register(userData) {
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
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 300);
        });
    }

    async getWorkspaces() {
        return this.request('/workspaces');
    }

    async createWorkspace(workspaceData) {
        return this.request('/workspaces', {
            method: 'POST',
            body: JSON.stringify(workspaceData)
        });
    }

    async getWorkspace(workspaceId) {
        return this.request(`/workspaces/${workspaceId}`);
    }

    async updateWorkspace(workspaceId, workspaceData) {
        return this.request(`/workspaces/${workspaceId}`, {
            method: 'PUT',
            body: JSON.stringify(workspaceData)
        });
    }

    async deleteWorkspace(workspaceId) {
        return this.request(`/workspaces/${workspaceId}`, {
            method: 'DELETE'
        });
    }

    async inviteMember(workspaceId, invitationData) {
        return this.request(`/workspaces/${workspaceId}/invite`, {
            method: 'POST',
            body: JSON.stringify(invitationData)
        });
    }

    async acceptInvitation(workspaceId, invitationId) {
        return this.request(`/workspaces/${workspaceId}/invitations/${invitationId}/accept`, {
            method: 'POST'
        });
    }

    async rejectInvitation(workspaceId, invitationId) {
        return this.request(`/workspaces/${workspaceId}/invitations/${invitationId}/reject`, {
            method: 'POST'
        });
    }

    async updateMemberRole(workspaceId, userId, role) {
        return this.request(`/workspaces/${workspaceId}/members/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
    }

    async removeMember(workspaceId, userId) {
        return this.request(`/workspaces/${workspaceId}/members/${userId}`, {
            method: 'DELETE'
        });
    }

    async transferOwnership(workspaceId, newOwnerId) {
        return this.request(`/workspaces/${workspaceId}/transfer-ownership`, {
            method: 'POST',
            body: JSON.stringify({ newOwnerId })
        });
    }

    async getInvitation(token) {
        return this.request(`/invitations/${token}`);
    }

    async getBoardElements(boardId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/boards/${boardId}/elements${queryString ? `?${queryString}` : ''}`;
        return this.request(url);
    }

    async createBoardElement(boardId, elementData) {
        return this.request(`/boards/${boardId}/elements`, {
            method: 'POST',
            body: JSON.stringify(elementData)
        });
    }

    async updateBoardElement(boardId, elementId, updates) {
        return this.request(`/boards/${boardId}/elements/${elementId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteBoardElement(boardId, elementId) {
        return this.request(`/boards/${boardId}/elements/${elementId}`, {
            method: 'DELETE'
        });
    }

    async uploadFile(boardId, formData) {
        const token = localStorage.getItem('token');

        const config = {
            method: 'POST',
            body: formData,
            headers: {}
        };

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${this.baseUrl}/boards/${boardId}/upload`, config);

            if (!response.ok) {
                let errorMessage = 'File upload failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonError) {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            throw error;
        }
    }

    async groupBoardElements(boardId, elementIds, groupProperties = {}) {
        return this.request(`/boards/${boardId}/elements/group`, {
            method: 'POST',
            body: JSON.stringify({ elementIds, groupProperties })
        });
    }

    async ungroupBoardElements(boardId, groupId) {
        return this.request(`/boards/${boardId}/elements/ungroup`, {
            method: 'POST',
            body: JSON.stringify({ groupId })
        });
    }

    async createBoardSnapshot(boardId, changeType = 'manual') {
        return this.request(`/boards/${boardId}/snapshot`, {
            method: 'POST',
            body: JSON.stringify({ change_type: changeType })
        });
    }

    async getBoardHistory(boardId, limit = 50) {
        return this.request(`/boards/${boardId}/history?limit=${limit}`);
    }

    async undoBoardAction(boardId) {
        return this.request(`/boards/${boardId}/undo`, {
            method: 'POST'
        });
    }

    async redoBoardAction(boardId) {
        return this.request(`/boards/${boardId}/redo`, {
            method: 'POST'
        });
    }

    async uploadBoardFile(boardId, file) {
        const formData = new FormData();
        formData.append('file', file);

        return this.request(`/boards/${boardId}/upload`, {
            method: 'POST',
            body: formData,
            headers: {}
        });
    }

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                data = { error: `HTTP ${response.status}: ${response.statusText}` };
            }

            if (!response.ok) {
                if (response.status === 409) {
                    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
                }
                const errorMessage = data.error || 'Ошибка API запроса:';
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error('Ошибка API запроса:', error);
            throw error;
        }
    }

    // AI функционал
    async aiGenerate(prompt, context) {
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