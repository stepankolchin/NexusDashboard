class Dashboard {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.selectedTool = 'select';
        this.isDragging = false;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDemo = new URLSearchParams(window.location.search).has('demo');
        this.elements = []; // Массив элементов на доске
        this.nextElementId = 1;
        this.tempElement = null; // Временный элемент при рисовании
        
        // История для undo/redo
        this.history = []; // Массив состояний элементов
        this.historyIndex = -1; // Текущий индекс в истории
        this.maxHistorySize = 50; // Максимальное количество состояний в истории

        this.init();
    }

    async init() {
        // Получаем ID доски из URL
        const urlParams = new URLSearchParams(window.location.search);
        this.boardId = urlParams.get('board');

        if (this.boardId) {
            await this.loadBoard(this.boardId);
        }

        this.setupEventListeners();
        this.render();
    }

    async loadBoard(boardId) {
        if (this.isDemo) {
            // Для демо-режима загружаем специальную доску
            const board = await api.getDemoBoard(parseInt(boardId));
            this.board = board;
        } else {
            const board = await api.getBoard(boardId);
            this.board = board;
        }
        document.getElementById('boardTitle').textContent = this.board.title;

        // Загружаем элементы доски если они есть
        if (this.board.items && this.board.items.length > 0) {
            this.elements = this.board.items.map(item => ({
                ...item,
                id: item.id || this.nextElementId++
            }));
            const maxId = Math.max(...this.elements.map(e => e.id));
            this.nextElementId = maxId > 0 ? maxId + 1 : 1;
        }

        // Показываем индикатор демо-режима если нужно
        if (this.isDemo) {
            this.showDemoIndicator();
        }

        this.render();
        
        // Сохраняем начальное состояние после загрузки доски
        this.saveState();
    }

    showDemoIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'demo-indicator';
        indicator.innerHTML = `
        <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); 
                    background: #ff9800; color: white; padding: 0.5rem 1rem; border-radius: 4px; 
                    z-index: 1000; font-size: 0.9rem;">
            🔧 Демо-режим: Изменения не сохраняются
        </div>
    `;
        document.body.appendChild(indicator);
    }

    setupEventListeners() {
        // Инструменты
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedTool = e.target.dataset.tool;
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                // Обновляем курсор
                this.updateCursor();
            });
        });

        // События канваса
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Предотвращаем стандартное поведение средней кнопки мыши (автопрокрутка)
        this.canvas.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });
        
        // Предотвращаем контекстное меню при зажатой средней кнопке
        this.canvas.addEventListener('contextmenu', (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });

        // AI помощник
        document.getElementById('aiAssistantBtn').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Кнопка поделиться
        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareBoard();
        });

        // Кнопки undo/redo
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undo();
        });
        document.getElementById('redoBtn').addEventListener('click', () => {
            this.redo();
        });

        // Клавиатурные сокращения
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
        });

        // Обновляем курсор при загрузке
        this.updateCursor();
    }

    updateCursor() {
        if (this.selectedTool === 'select') {
            this.canvas.style.cursor = 'grab';
        } else if (this.selectedTool === 'text') {
            this.canvas.style.cursor = 'text';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    // Преобразует координаты клика в координаты канваса
    getCanvasCoordinates(e) {
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        // Получаем координаты относительно контейнера (без учета трансформации канваса)
        const containerX = e.clientX - containerRect.left;
        const containerY = e.clientY - containerRect.top;
        // Учитываем трансформацию (offset и scale) - обратное преобразование
        const x = (containerX - this.offsetX) / this.scale;
        const y = (containerY - this.offsetY) / this.scale;
        return { x, y };
    }

    handleMouseDown(e) {
        // Middle mouse button (wheel) для навигации
        if (e.button === 1) {
            e.preventDefault();
            this.isDragging = true;
            this.dragStartX = e.clientX - this.offsetX;
            this.dragStartY = e.clientY - this.offsetY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        // Левая кнопка мыши
        if (e.button !== 0) return;

        const coords = this.getCanvasCoordinates(e);
        this.startX = coords.x;
        this.startY = coords.y;
        this.currentX = coords.x;
        this.currentY = coords.y;

        if (this.selectedTool === 'select') {
            // Режим перемещения канваса
            this.isDragging = true;
            this.dragStartX = e.clientX - this.offsetX;
            this.dragStartY = e.clientY - this.offsetY;
        } else if (this.selectedTool === 'text') {
            // Для текста создаем элемент сразу и запрашиваем текст
            this.createTextElement(coords.x, coords.y);
        } else {
            // Режим рисования
            this.isDrawing = true;
            this.tempElement = null;
        }
    }

    handleMouseMove(e) {
        // Если зажата средняя кнопка мыши или select tool - перемещаем канвас
        if (this.isDragging && (this.selectedTool === 'select' || e.buttons === 4)) {
            // Перемещение канваса
            this.offsetX = e.clientX - this.dragStartX;
            this.offsetY = e.clientY - this.dragStartY;
            this.render();
            return;
        }

        const coords = this.getCanvasCoordinates(e);
        this.currentX = coords.x;
        this.currentY = coords.y;

        if (this.isDrawing && this.selectedTool !== 'text') {
            // Обновляем временный элемент при рисовании
            this.updateTempElement();
            this.render();
        }
    }

    handleMouseUp(e) {
        // Средняя кнопка мыши отпущена
        if (e.button === 1) {
            e.preventDefault();
            this.isDragging = false;
            this.updateCursor();
            return;
        }

        if (this.isDragging && this.selectedTool === 'select') {
            this.isDragging = false;
        } else if (this.isDrawing) {
            // Завершаем рисование и создаем элемент
            this.finishDrawing();
            this.isDrawing = false;
            this.tempElement = null;
        }
    }

    handleMouseLeave() {
        // Отменяем рисование если мышь покинула канвас
        if (this.isDrawing) {
            this.isDrawing = false;
            this.tempElement = null;
            this.render();
        }
        // Если мышь покинула канвас во время перетаскивания, останавливаем перетаскивание
        if (this.isDragging && this.selectedTool !== 'select') {
            this.isDragging = false;
            this.updateCursor();
        }
    }

    handleWheel(e) {
        e.preventDefault();
        
        // Если зажат Ctrl (или Cmd на Mac), используем колесо для зума
        if (e.ctrlKey || e.metaKey) {
            const zoomIntensity = 0.1;
            const wheel = e.deltaY < 0 ? 1 : -1;
            const zoom = Math.exp(wheel * zoomIntensity);

            // Зумим относительно позиции мыши
            const container = this.canvas.parentElement;
            const containerRect = container.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;
            
            // Координаты мыши в пространстве канваса до зума
            const canvasX = (mouseX - this.offsetX) / this.scale;
            const canvasY = (mouseY - this.offsetY) / this.scale;
            
            // Применяем зум
            this.scale *= zoom;
            
            // Корректируем offset чтобы зум происходил относительно позиции мыши
            this.offsetX = mouseX - canvasX * this.scale;
            this.offsetY = mouseY - canvasY * this.scale;
            
            this.render();
        } else {
            // Обычное колесо для панорамирования
            this.offsetX -= e.deltaX;
            this.offsetY -= e.deltaY;
            this.render();
        }
    }

    updateTempElement() {
        if (!this.isDrawing) return;

        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        const x = Math.min(this.startX, this.currentX);
        const y = Math.min(this.startY, this.currentY);

        switch (this.selectedTool) {
            case 'rectangle':
                this.tempElement = {
                    type: 'rectangle',
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    color: '#4263eb',
                    strokeWidth: 2
                };
                break;
            case 'circle':
                const radius = Math.sqrt(width * width + height * height) / 2;
                this.tempElement = {
                    type: 'circle',
                    x: this.startX,
                    y: this.startY,
                    radius: radius,
                    color: '#4263eb',
                    strokeWidth: 2
                };
                break;
            case 'line':
                this.tempElement = {
                    type: 'line',
                    x1: this.startX,
                    y1: this.startY,
                    x2: this.currentX,
                    y2: this.currentY,
                    color: '#4263eb',
                    strokeWidth: 2
                };
                break;
        }
    }

    finishDrawing() {
        if (!this.tempElement) return;

        // Сохраняем состояние перед добавлением элемента
        this.saveState();

        const element = {
            ...this.tempElement,
            id: this.nextElementId++
        };

        this.elements.push(element);
        this.tempElement = null;
        this.render();
    }

    createTextElement(x, y) {
        const text = prompt('Введите текст:', 'Текст');
        if (text && text.trim()) {
            // Сохраняем состояние перед добавлением элемента
            this.saveState();
            
            const element = {
                id: this.nextElementId++,
                type: 'text',
                x: x,
                y: y,
                content: text.trim(),
                fontSize: 16,
                color: '#212529'
            };
            this.elements.push(element);
            this.render();
        }
    }

    render() {
        // Обновляем трансформацию канваса
        this.canvas.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;

        // Удаляем старые элементы (кроме фона)
        const existingElements = this.canvas.querySelectorAll('.canvas-element');
        existingElements.forEach(el => el.remove());

        // Рендерим все элементы
        this.elements.forEach(element => {
            this.renderElement(element);
        });

        // Рендерим временный элемент если он есть
        if (this.tempElement) {
            this.renderElement(this.tempElement, true);
        }
    }

    renderElement(element, isTemp = false) {
        let el;

        switch (element.type) {
            case 'rectangle':
                el = document.createElement('div');
                el.className = 'canvas-element canvas-rectangle';
                el.style.position = 'absolute';
                el.style.left = `${element.x}px`;
                el.style.top = `${element.y}px`;
                el.style.width = `${element.width}px`;
                el.style.height = `${element.height}px`;
                el.style.border = `${element.strokeWidth || 2}px solid ${element.color || '#4263eb'}`;
                el.style.backgroundColor = 'transparent';
                el.style.pointerEvents = 'none';
                break;

            case 'circle':
                el = document.createElement('div');
                el.className = 'canvas-element canvas-circle';
                el.style.position = 'absolute';
                el.style.left = `${element.x - element.radius}px`;
                el.style.top = `${element.y - element.radius}px`;
                el.style.width = `${element.radius * 2}px`;
                el.style.height = `${element.radius * 2}px`;
                el.style.border = `${element.strokeWidth || 2}px solid ${element.color || '#4263eb'}`;
                el.style.borderRadius = '50%';
                el.style.backgroundColor = 'transparent';
                el.style.pointerEvents = 'none';
                break;

            case 'line':
                const length = Math.sqrt(
                    Math.pow(element.x2 - element.x1, 2) + 
                    Math.pow(element.y2 - element.y1, 2)
                );
                const angle = Math.atan2(
                    element.y2 - element.y1,
                    element.x2 - element.x1
                ) * 180 / Math.PI;

                el = document.createElement('div');
                el.className = 'canvas-element canvas-line';
                el.style.position = 'absolute';
                el.style.left = `${element.x1}px`;
                el.style.top = `${element.y1}px`;
                el.style.width = `${length}px`;
                el.style.height = `${element.strokeWidth || 2}px`;
                el.style.backgroundColor = element.color || '#4263eb';
                el.style.transformOrigin = '0 50%';
                el.style.transform = `rotate(${angle}deg)`;
                el.style.pointerEvents = 'none';
                break;

            case 'text':
                el = document.createElement('div');
                el.className = 'canvas-element canvas-text';
                el.style.position = 'absolute';
                el.style.left = `${element.x}px`;
                el.style.top = `${element.y}px`;
                el.style.fontSize = `${element.fontSize || 16}px`;
                el.style.color = element.color || '#212529';
                el.style.pointerEvents = 'none';
                el.style.userSelect = 'none';
                el.textContent = element.content || '';
                break;
        }

        if (el) {
            if (isTemp) {
                el.style.opacity = '0.7';
            }
            this.canvas.appendChild(el);
        }
    }

    // Сохраняет текущее состояние в историю
    saveState() {
        // Создаем глубокую копию элементов
        const state = JSON.parse(JSON.stringify(this.elements));
        
        // Если мы не в конце истории (после undo), удаляем все состояния после текущего индекса
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Добавляем новое состояние
        this.history.push(state);
        this.historyIndex++;
        
        // Ограничиваем размер истории
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
        
        // Обновляем состояние кнопок
        this.updateHistoryButtons();
    }
    
    // Отменяет последнее действие
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            this.updateHistoryButtons();
        }
    }
    
    // Повторяет отмененное действие
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            this.updateHistoryButtons();
        }
    }
    
    // Восстанавливает состояние из истории
    restoreState(state) {
        this.elements = JSON.parse(JSON.stringify(state));
        this.render();
    }
    
    // Обновляет состояние кнопок undo/redo
    updateHistoryButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        undoBtn.disabled = this.historyIndex <= 0;
        redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
    }

    async shareBoard() {
        // Заглушка для функционала "Поделиться"
        const shareUrl = `${window.location.origin}/dashboard.html?board=${this.boardId}`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Ссылка скопирована в буфер обмена!');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем авторизацию
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    // Устанавливаем аватар пользователя
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();

    new Dashboard();
});

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}