class ExtendedWhiteboard {
    constructor(canvas, boardId) {
        this.canvas = canvas;
        this.boardId = boardId;
        this.ctx = canvas.getContext('2d');

        this.layerManager = new LayerManager(boardId);
        this.isDrawing = false;
        this.currentPath = [];
        this.selectedTool = null;

        this.toolbarPanel = null;
        this.propertiesPanel = null;
        this.layerPanel = null;
        this.historyPanel = null;

        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };

        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeStartPos = { x: 0, y: 0 };
        this.resizeStartSize = { width: 0, height: 0 };

        this.isEditingText = false;
        this.editingElement = null;
        this.textInput = null;

        this.isDrawingLine = false;
        this.lineStartPoint = null;
        this.lineEndPoint = null;

        this.isDrawingArrow = false;
        this.arrowStartPoint = null;
        this.arrowEndPoint = null;

        this.isDrawingConnector = false;
        this.connectorStartPoint = null;
        this.connectorEndPoint = null;

        this.contextMenu = null;
        this.clipboardElement = null;

        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.zoomMin = 0.25;  
        this.zoomMax = 2;     // TODO still
        this.lastRenderTime = 0;
        this.lastDebugTime = 0;
        this.resizeTimeout = null;
        this.lastHistoryUpdate = 0;
        this.lastMouseMoveTime = 0;
        this.lastCursorUpdate = 0;
        this.isForceRendering = false;
        this.renderThrottle = 16; // ~60fps mb

        this.boardSettings = {
            backgroundColor: '#ffffff',
            gridStyle: 'dots',
            gridSize: 20,
            isLocked: false
        };

        this.init();
        this.bindEvents();
        this.loadBoardData();
    }

    init() {
        this.resizeCanvas();
        this.initializeUIPanels();
    }

    handleWindowResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            this.resizeCanvas();
            this.resizeTimeout = null;
        }, 150);
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;

        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        if (this.canvas.width !== oldWidth || this.canvas.height !== oldHeight) {
            this.render();
        }
    }

    initializeUIPanels() {
        this.createUIPanelContainers();

        this.toolbarPanel = new ToolbarPanel(
            document.getElementById('toolbar-container'),
            (tool) => this.onToolSelect(tool)
        );

        this.propertiesPanel = new PropertiesPanel(
            document.getElementById('properties-container'),
            (elementId, property, value) => this.onPropertyChange(elementId, property, value)
        );

        this.layerPanel = new LayerPanel(
            document.getElementById('layer-container'),
            this.layerManager,
            (action) => this.onLayerAction(action)
        );

        this.historyPanel = new HistoryPanel(
            document.getElementById('history-container'),
            (action) => this.onHistoryAction(action)
        );
    }

    createUIPanelContainers() {
        const containers = [
            'toolbar-container',
            'properties-container',
            'layer-container',
            'history-container'
        ];

        containers.forEach(id => {
            if (!document.getElementById(id)) {
                const div = document.createElement('div');
                div.id = id;
                div.className = 'ui-panel';
                document.body.appendChild(div);
            }
        });
    }

    bindEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));

        // Mouse wheel
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        // Context menu
        this.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));

        // Keyboard
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        window.addEventListener('resize', () => this.handleWindowResize());
    }

    onToolSelect(tool) {
        this.selectedTool = tool;
        this.canvas.style.cursor = this.getCursorForTool(tool);
    }

    onDoubleClick(e) {
        const pos = this.getMousePos(e);
        const element = this.layerManager.getElementAtPoint(pos.x, pos.y);

        if (element && element.type === 'text') {
            this.startTextEditing(element, pos);
        } else if (element && element.type === 'sticky') {
            this.startTextEditing(element, pos);
        }
    }

    onContextMenu(e) {
        e.preventDefault();
        const pos = this.getMousePos(e);
        const element = this.layerManager.getElementAtPoint(pos.x, pos.y);

        if (element) {
            this.showContextMenu(element, e.clientX, e.clientY);
        } else {
            this.showCanvasContextMenu(pos, e.clientX, e.clientY);
        }
    }

    onPropertyChange(elementId, property, value) {
        this.layerManager.updateElement(elementId, { [property]: value });
        this.render();
        this.syncElementToServer(elementId);
    }

    onLayerAction(action) {
        this.render();
    }

    onHistoryAction(action) {
        let success = false;

        switch (action) {
            case 'undo':
                success = this.layerManager.undo();
                break;
            case 'redo':
                success = this.layerManager.redo();
                break;
            case 'snapshot':
                this.createSnapshot();
                success = true;
                break;
        }

        if (success) {
            this.render();
            this.updateHistoryPanel();
        }
    }

    getCursorForTool(tool) {
        switch (tool?.tool) {
            case 'drawing':
                return 'crosshair';
            case 'eraser':
                return 'not-allowed';
            case 'text':
                return 'text';
            case 'select':
            default:
                return 'default';
        }
    }

    onMouseDown(e) {
        const pos = this.getMousePos(e);
        this.lastMousePos = pos;

        if (this.boardSettings.isLocked) return;

        if (e.button === 1) {
            this.startPanning(pos);
            return;
        }

        if (this.selectedTool?.tool === 'select' || !this.selectedTool) {
            const resizeHandle = this.getResizeHandleAtPoint(pos);
            if (resizeHandle) {
                this.startResize(resizeHandle.element, resizeHandle.handle, pos);
                return;
            }
        }

        switch (this.selectedTool?.tool) {
            case 'select':
                this.handleSelect(pos);
                break;
            case 'shape':
                if (this.selectedTool.shape === 'line' || this.selectedTool.shape === 'arrow') {
                    if (this.selectedTool.shape === 'line') {
                        this.startLineDrawing(pos);
                    } else if (this.selectedTool.shape === 'arrow') {
                        this.startArrowDrawing(pos);
                    }
                } else {
                    this.createElementAt(pos);
                }
                break;
            case 'connector':
                this.startConnectorDrawing(pos);
                break;
            case 'text':
            case 'sticky':
            case 'image':
            case 'file':
            case 'connector':
                this.createElementAt(pos);
                break;
            case 'drawing':
                this.startDrawing(pos);
                break;
            case 'eraser':
                this.handleErase(pos);
                break;
            case 'group':
                this.handleGroup(pos);
                break;
            case 'ungroup':
                this.handleUngroup(pos);
                break;
        }
    }

    onMouseMove(e) {
        const now = Date.now();
        if (now - this.lastMouseMoveTime < 8) { // Ограничиваем прослушивание mousemove
            return;
        }
        this.lastMouseMoveTime = now;

        const pos = this.getMousePos(e);

        if (this.isPanning) {
            this.updatePanning(pos);
        } else if (this.isResizing) {
            this.updateResize(pos);
        } else if (this.isDrawingLine) {
            this.updateLineDrawing(pos);
        } else if (this.isDrawingArrow) {
            this.updateArrowDrawing(pos);
        } else if (this.isDrawingConnector) {
            this.updateConnectorDrawing(pos);
        } else if (this.isDragging && this.layerManager.getSelectedElements().length > 0) {
            this.handleDrag(pos);
        } else if (this.isDrawing) {
            this.continueDrawing(pos);
        } else {
            if (now - (this.lastCursorUpdate || 0) > 50) {
                this.updateCursorForResize(pos);
                this.lastCursorUpdate = now;
            }
        }

        this.lastMousePos = pos;
    }

    onMouseUp(e) {
        if (this.isPanning) {
            this.endPanning();
        } else if (this.isResizing) {
            this.endResize();
        } else if (this.isDrawingLine) {
            this.finishLineDrawing();
        } else if (this.isDrawingArrow) {
            this.finishArrowDrawing();
        } else if (this.isDrawingConnector) {
            this.finishConnectorDrawing();
        } else if (this.isDragging) {
            this.endDrag();
        } else if (this.isDrawing) {
            this.endDrawing();
        }
    }

    onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    onTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    onTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup');
        this.canvas.dispatchEvent(mouseEvent);
    }

    onKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteSelectedElements();
        } else if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                this.layerManager.undo();
                this.render();
                this.updateHistoryPanel();
            } else if (e.key === 'y') {
                e.preventDefault();
                this.layerManager.redo();
                this.render();
                this.updateHistoryPanel();
            } else if (e.key === 'g') {
                e.preventDefault();
                this.groupSelectedElements();
            }
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            this.resetView();
        } else if (e.key === 'o' || e.key === 'O') {
            e.preventDefault();
            this.centerAtOrigin();
        } else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            this.findContent();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.panOffset.y += 50 / this.zoom;
            this.throttledRender();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.panOffset.y -= 50 / this.zoom;
            this.throttledRender();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.panOffset.x += 50 / this.zoom;
            this.throttledRender();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.panOffset.x -= 50 / this.zoom;
            this.throttledRender();
        } else if (e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            console.log('Manual pan test: moving pan offset by 100 pixels');
            this.panOffset.x += 100;
            this.render();
        }
    }

    onKeyUp(e) {
        // Пока заглушка
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Перевод координат экрана в координаты канваса
        const pos = this.inverseTransformPoint(screenX, screenY);

        return {
            x: Math.round(pos.x * 1000) / 1000,
            y: Math.round(pos.y * 1000) / 1000
        };
    }

    handleSelect(pos) {
        const element = this.layerManager.getElementAtPoint(pos.x, pos.y);

        if (element) {
            if (this.layerManager.getSelectedElements().find(el => el.id === element.id)) {
                this.startDrag(pos);
            } else {
                this.layerManager.selectElements([element.id]);
                this.propertiesPanel.showElementProperties(element);
                this.startDrag(pos);
            }
        } else {
            this.layerManager.clearSelection();
            this.propertiesPanel.hideElementProperties();
        }

        this.layerPanel.updateLayers();
        this.render();
    }

    startDrag(pos) {
        this.isDragging = true;
        const selectedElements = this.layerManager.getSelectedElements();

        if (selectedElements.length > 0) {
            const element = selectedElements[0];
            this.dragOffset = {
                x: pos.x - element.properties.x,
                y: pos.y - element.properties.y
            };
        }
    }

    handleDrag(pos) {
        const selectedElements = this.layerManager.getSelectedElements();

        selectedElements.forEach(element => {
            element.properties.x = Math.round((pos.x - this.dragOffset.x) * 1000) / 1000;
            element.properties.y = Math.round((pos.y - this.dragOffset.y) * 1000) / 1000;

            this.updateConnectedElements(element);
        });

        this.render();
    }

    endDrag() {
        this.isDragging = false;

        const selectedElements = this.layerManager.getSelectedElements();
        selectedElements.forEach(element => {
            this.syncElementToServer(element.id);
        });
    }

    updateConnectedElements(element) {
        const layers = this.layerManager.layers;
        layers.forEach(layer => {
            if (layer.type === 'connector') {
                if (layer.properties.startElement === element.id) {
                    layer.properties.startPoint = {
                        x: Math.round((element.properties.x + element.properties.width / 2) * 1000) / 1000,
                        y: Math.round((element.properties.y + element.properties.height / 2) * 1000) / 1000
                    };
                }
                if (layer.properties.endElement === element.id) {
                    layer.properties.endPoint = {
                        x: Math.round((element.properties.x + element.properties.width / 2) * 1000) / 1000,
                        y: Math.round((element.properties.y + element.properties.height / 2) * 1000) / 1000
                    };
                }
            }
        });
    }

    createElementAt(pos) {
        let elementType = this.selectedTool.tool;
        let shapeType = null;

        if (elementType === 'arrow' || elementType === 'line') {
            elementType = 'shape';
            shapeType = elementType === 'arrow' ? 'arrow' : 'line';
        }

        const properties = ElementTypes.getDefaultProperties(elementType);

        properties.x = Math.round((pos.x - properties.width / 2) * 1000) / 1000;
        properties.y = Math.round((pos.y - properties.height / 2) * 1000) / 1000;

        if (elementType === 'shape' && (this.selectedTool.shape || shapeType)) {
            properties.shape = this.selectedTool.shape || shapeType;
        }

        if (elementType === 'image') {
            this.handleImageUpload(pos, properties);
            return;
        }

        if (elementType === 'file') {
            this.handleFileUpload(pos, properties);
            return;
        }

        const elementData = {
            type: elementType,
            properties: properties,
            z_index: this.getNextZIndex()
        };

        this.createElement(elementData);

        this.toolbarPanel.resetSelection();
        this.selectedTool = null;
        this.canvas.style.cursor = 'default';
    }

    createElement(elementData) {
        // Создание нового элемента
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id || 1;

        const element = {
            id: Date.now().toString(),
            board_id: this.boardId,
            ...elementData,
            created_by: userId,
            updated_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.layerManager.addElement(element);
        this.layerPanel.updateLayers();
        this.updateHistoryPanel();
        this.forceRender(); // Принудительная отрисовка для новых элементов

        // Синхронизация с сервером
        this.syncElementToServer(element.id);
    }

    getNextZIndex() {
        const layers = this.layerManager.layers;
        const maxZIndex = layers.length > 0 ? Math.max(...layers.map(l => l.z_index || 0)) : 0;
        return maxZIndex + 1;
    }

    startDrawing(pos) {
        this.isDrawing = true;
        this.currentPath = [{
            points: [pos],
            strokeColor: '#000000',
            strokeWidth: 2
        }];
    }

    startLineDrawing(pos) {
        this.isDrawingLine = true;
        this.lineStartPoint = { ...pos };
        this.lineEndPoint = { ...pos };
        this.canvas.style.cursor = 'crosshair';
    }

    startArrowDrawing(pos) {
        this.isDrawingArrow = true;
        this.arrowStartPoint = { ...pos };
        this.arrowEndPoint = { ...pos };
        this.canvas.style.cursor = 'crosshair';
    }

    startConnectorDrawing(pos) {
        this.isDrawingConnector = true;
        this.connectorStartPoint = { ...pos };
        this.connectorEndPoint = { ...pos };
        this.canvas.style.cursor = 'crosshair';
    }

    updateLineDrawing(pos) {
        this.lineEndPoint = { ...pos };
        this.render();
    }

    finishLineDrawing() {
        console.log('Finishing line drawing, checking conditions...');
        if (!this.isDrawingLine || !this.lineStartPoint || !this.lineEndPoint) {
            console.log('Line drawing not ready:', { isDrawingLine: this.isDrawingLine, startPoint: this.lineStartPoint, endPoint: this.lineEndPoint });
            return;
        }

        const startX = Math.min(this.lineStartPoint.x, this.lineEndPoint.x);
        const startY = Math.min(this.lineStartPoint.y, this.lineEndPoint.y);
        const width = Math.abs(this.lineEndPoint.x - this.lineStartPoint.x);
        const height = Math.abs(this.lineEndPoint.y - this.lineStartPoint.y);

        console.log('Line dimensions:', { startX, startY, width, height });

        if (width > 2 || height > 2) {
            console.log('Creating line element...');
            const properties = ElementTypes.getDefaultProperties('shape');
            properties.shape = 'line';
            properties.x = Math.round(startX * 1000) / 1000;
            properties.y = Math.round(startY * 1000) / 1000;
            properties.width = Math.round((width || 1) * 1000) / 1000;
            properties.height = Math.round((height || 1) * 1000) / 1000;

            properties.startPoint = {
                x: Math.round(this.lineStartPoint.x * 1000) / 1000,
                y: Math.round(this.lineStartPoint.y * 1000) / 1000
            };
            properties.endPoint = {
                x: Math.round(this.lineEndPoint.x * 1000) / 1000,
                y: Math.round(this.lineEndPoint.y * 1000) / 1000
            };

            const elementData = {
                type: 'shape',
                properties: properties,
                z_index: this.getNextZIndex()
            };

            console.log('Element data:', elementData);
            this.createElement(elementData);
        } else {
            console.log('Line too short, not creating');
        }

        this.isDrawingLine = false;
        this.lineStartPoint = null;
        this.lineEndPoint = null;
        this.canvas.style.cursor = 'default';

        this.toolbarPanel.resetSelection();
        this.selectedTool = null;
    }

    updateArrowDrawing(pos) {
        this.arrowEndPoint = { ...pos };
        this.render();
    }

    finishArrowDrawing() {
        if (!this.isDrawingArrow || !this.arrowStartPoint || !this.arrowEndPoint) return;

        const startX = Math.min(this.arrowStartPoint.x, this.arrowEndPoint.x);
        const startY = Math.min(this.arrowStartPoint.y, this.arrowEndPoint.y);
        const width = Math.abs(this.arrowEndPoint.x - this.arrowStartPoint.x);
        const height = Math.abs(this.arrowEndPoint.y - this.arrowStartPoint.y);

        if (width > 2 || height > 2) {
            const properties = ElementTypes.getDefaultProperties('shape');
            properties.shape = 'arrow';
            properties.x = Math.round(startX * 1000) / 1000;
            properties.y = Math.round(startY * 1000) / 1000;
            properties.width = Math.round((width || 1) * 1000) / 1000;
            properties.height = Math.round((height || 1) * 1000) / 1000;

            properties.startPoint = {
                x: Math.round(this.arrowStartPoint.x * 1000) / 1000,
                y: Math.round(this.arrowStartPoint.y * 1000) / 1000
            };
            properties.endPoint = {
                x: Math.round(this.arrowEndPoint.x * 1000) / 1000,
                y: Math.round(this.arrowEndPoint.y * 1000) / 1000
            };

            const elementData = {
                type: 'shape',
                properties: properties,
                z_index: this.getNextZIndex()
            };

            this.createElement(elementData);
        }

        this.isDrawingArrow = false;
        this.arrowStartPoint = null;
        this.arrowEndPoint = null;
        this.canvas.style.cursor = 'default';

        this.toolbarPanel.resetSelection();
        this.selectedTool = null;
    }

    updateConnectorDrawing(pos) {
        this.connectorEndPoint = { ...pos };
        this.render();
    }

    finishConnectorDrawing() {
        if (!this.isDrawingConnector || !this.connectorStartPoint || !this.connectorEndPoint) return;

        const startX = Math.min(this.connectorStartPoint.x, this.connectorEndPoint.x);
        const startY = Math.min(this.connectorStartPoint.y, this.connectorEndPoint.y);
        const width = Math.abs(this.connectorEndPoint.x - this.connectorStartPoint.x);
        const height = Math.abs(this.connectorEndPoint.y - this.connectorStartPoint.y);

        if (width > 2 || height > 2) {
            const properties = ElementTypes.getDefaultProperties('connector');
            properties.x = Math.round(startX * 1000) / 1000;
            properties.y = Math.round(startY * 1000) / 1000;
            properties.width = Math.round((width || 1) * 1000) / 1000;
            properties.height = Math.round((height || 1) * 1000) / 1000;

            properties.startPoint = {
                x: Math.round(this.connectorStartPoint.x * 1000) / 1000,
                y: Math.round(this.connectorStartPoint.y * 1000) / 1000
            };
            properties.endPoint = {
                x: Math.round(this.connectorEndPoint.x * 1000) / 1000,
                y: Math.round(this.connectorEndPoint.y * 1000) / 1000
            };

            const elementData = {
                type: 'connector',
                properties: properties,
                z_index: this.getNextZIndex()
            };

            this.createElement(elementData);
        }

        this.isDrawingConnector = false;
        this.connectorStartPoint = null;
        this.connectorEndPoint = null;
        this.canvas.style.cursor = 'default';

        this.toolbarPanel.resetSelection();
        this.selectedTool = null;
    }

    continueDrawing(pos) {
        if (this.currentPath.length > 0) {
            this.currentPath[0].points.push(pos);
            this.render();
        }
    }

    endDrawing() {
        if (this.isDrawing && this.currentPath.length > 0) {
            const points = this.currentPath[0].points;
            if (points.length >= 2) {
                // Очистка текущего пути перед созданием элемента
                const pathData = this.currentPath[0];
                this.isDrawing = false;
                this.currentPath = [];

                const drawingProperties = {
                    x: Math.min(...points.map(p => p.x)),
                    y: Math.min(...points.map(p => p.y)),
                    width: Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)),
                    height: Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)),
                    paths: [pathData],
                    strokeColor: pathData.strokeColor,
                    strokeWidth: pathData.strokeWidth
                };

                const elementData = {
                    type: 'shape',
                    properties: {
                        ...drawingProperties,
                        shape: 'drawing'
                    },
                    z_index: this.getNextZIndex()
                };

                this.createElement(elementData);
            }
        }

        // Очистка состояния
        this.isDrawing = false;
        this.currentPath = [];
    }

    handleErase(pos) {
        const element = this.layerManager.getElementAtPoint(pos.x, pos.y);
        if (element) {
            this.layerManager.removeElement(element.id);
            this.layerPanel.updateLayers();
            this.updateHistoryPanel();
            this.render();

            // синхронизация удаления
            this.deleteElementFromServer(element.id);
        }
    }

    handleGroup(pos) {
        const element = this.layerManager.getElementAtPoint(pos.x, pos.y);
        if (element && element.type !== 'group') {
            // находим все элементы в группе или создаем новую
            const elementsToGroup = this.layerManager.getSelectedElements();
            if (elementsToGroup.length > 1) {
                this.groupSelectedElements();
            }
        }
    }

    handleUngroup(pos) {
        const element = this.layerManager.getElementAtPoint(pos.x, pos.y);
        if (element && element.type === 'group') {
            this.layerManager.ungroupElements(element.id);
            this.layerPanel.updateLayers();
            this.updateHistoryPanel();
            this.render();
        }
    }

    groupSelectedElements() {
        const selectedElements = this.layerManager.getSelectedElements();
        if (selectedElements.length > 1) {
            const elementIds = selectedElements.map(el => el.id);
            this.layerManager.groupElements(elementIds);
            this.layerPanel.updateLayers();
            this.updateHistoryPanel();
            this.render();
        }
    }

    deleteSelectedElements() {
        const selectedElements = this.layerManager.getSelectedElements();
        selectedElements.forEach(element => {
            this.layerManager.removeElement(element.id);
            this.deleteElementFromServer(element.id);
        });

        this.layerManager.clearSelection();
        this.propertiesPanel.hideElementProperties();
        this.layerPanel.updateLayers();
        this.updateHistoryPanel();
        this.render();
    }

    throttledRender() {
        const now = Date.now();
        if (now - this.lastRenderTime >= this.renderThrottle) {
            this.render();
            this.lastRenderTime = now;
        }
    }

    forceRender() {
        if (this.isForceRendering) return;

        this.isForceRendering = true;
        this.render();
        this.lastRenderTime = Date.now();
        this.isForceRendering = false;
    }

    render() {
        const startTime = performance.now();

        // Очистка холста
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Сброс состояния холста для корректной отрисовки
        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';

        if (!this.ctx.imageSmoothingEnabled) {
            this.ctx.imageSmoothingEnabled = false; // Disable anti-aliasing
        }

        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);

        this.renderBackground();
        this.renderGrid();
        this.renderOriginMarker();
        this.renderElements();
        this.renderSelection();
        this.renderResizeHandles();

        // Отрисовка текущего пути рисования
        if (this.isDrawing && this.currentPath.length > 0) {
            this.renderDrawingPath();
        }

        if (this.isDrawingLine && this.lineStartPoint && this.lineEndPoint) {
            this.renderLinePreview();
        }

        if (this.isDrawingArrow && this.arrowStartPoint && this.arrowEndPoint) {
            this.renderArrowPreview();
        }

        if (this.isDrawingConnector && this.connectorStartPoint && this.connectorEndPoint) {
            this.renderConnectorPreview();
        }

        this.ctx.restore();

        this.renderUI();

        const endTime = performance.now();
        const renderTime = endTime - startTime;
        if (renderTime > 16.67) {
            console.warn(`Slow render: ${renderTime.toFixed(2)}ms (${(1000/renderTime).toFixed(1)}fps)`);
        }
    }

    renderUI() {
        const worldX = Math.round(-this.panOffset.x / this.zoom);
        const worldY = Math.round(-this.panOffset.y / this.zoom);

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.canvas.width - 200, this.canvas.height - 50, 190, 40);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${worldX}, ${worldY} (zoom: ${this.zoom.toFixed(2)}x)`, this.canvas.width - 10, this.canvas.height - 35);

        let statusText = 'Ready';
        if (this.isPanning) {
            statusText = 'PANNING';
            this.ctx.fillStyle = '#ff6b6b';
        } else {
            this.ctx.fillStyle = '#66ff66';
        }
        this.ctx.fillText(statusText, this.canvas.width - 10, this.canvas.height - 20);

        this.ctx.textAlign = 'left';
    }

    renderLinePreview() {
        this.ctx.save();

        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);

        this.ctx.strokeStyle = '#007bff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        this.ctx.beginPath();
        this.ctx.moveTo(this.lineStartPoint.x, this.lineStartPoint.y);
        this.ctx.lineTo(this.lineEndPoint.x, this.lineEndPoint.y);
        this.ctx.stroke();

        this.ctx.setLineDash([]);

        this.ctx.fillStyle = '#007bff';
        this.ctx.beginPath();
        this.ctx.arc(this.lineStartPoint.x, this.lineStartPoint.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(this.lineEndPoint.x, this.lineEndPoint.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.restore();
    }

    renderArrowPreview() {
        this.ctx.save();

        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);

        // Рисуем превью
        this.ctx.strokeStyle = '#007bff';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(this.arrowStartPoint.x, this.arrowStartPoint.y);
        this.ctx.lineTo(this.arrowEndPoint.x, this.arrowEndPoint.y);
        this.ctx.stroke();

        // Рисуем по конечным точкам
        ElementTypes.drawArrow(this.ctx, this.arrowEndPoint, this.arrowStartPoint, false);

        this.ctx.restore();
    }

    renderConnectorPreview() {
        this.ctx.save();

        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);

        // Рисуем превью
        this.ctx.strokeStyle = '#007bff';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(this.connectorStartPoint.x, this.connectorStartPoint.y);
        this.ctx.lineTo(this.connectorEndPoint.x, this.connectorEndPoint.y);
        this.ctx.stroke();

        // Рисуем по конечным точкам
        ElementTypes.drawArrow(this.ctx, this.connectorStartPoint, this.connectorEndPoint, true);
        ElementTypes.drawArrow(this.ctx, this.connectorEndPoint, this.connectorStartPoint, false);

        this.ctx.restore();
    }

    renderBackground() {
        this.ctx.fillStyle = this.boardSettings.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderGrid() {
        if (this.boardSettings.gridStyle === 'none') return;

        const zoom = this.zoom;
        const invZoom = 1 / zoom;

        const baseDotSize = 1;
        const dotSize = Math.max(0.5, Math.min(3, baseDotSize * Math.sqrt(invZoom)));

        const baseGridSize = this.boardSettings.gridSize;
        const zoomFactor = Math.max(1, Math.pow(2, Math.floor(Math.log2(invZoom))));
        const gridSize = baseGridSize * zoomFactor;

        const baseRenderMargin = Math.max(this.canvas.width, this.canvas.height) * 2;
        const renderMargin = baseRenderMargin / Math.sqrt(zoomFactor);

        const panOffsetX = this.panOffset.x;
        const panOffsetY = this.panOffset.y;
        const worldCenterX = -panOffsetX * invZoom;
        const worldCenterY = -panOffsetY * invZoom;
        const worldHalfWidth = (this.canvas.width / 2 + renderMargin) * invZoom;
        const worldHalfHeight = (this.canvas.height / 2 + renderMargin) * invZoom;

        const worldLeft = worldCenterX - worldHalfWidth;
        const worldTop = worldCenterY - worldHalfHeight;
        const worldRight = worldCenterX + worldHalfWidth;
        const worldBottom = worldCenterY + worldHalfHeight;

        const startX = Math.floor(worldLeft / gridSize) * gridSize;
        const startY = Math.floor(worldTop / gridSize) * gridSize;

        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;

        if (this.boardSettings.gridStyle === 'dots') {
            this.ctx.setLineDash([]);

            const zoom = this.zoom;
            const panOffsetX = this.panOffset.x;
            const panOffsetY = this.panOffset.y;
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;

            const maxGridPoints = 50000;
            let renderedPoints = 0;

            const endX = Math.min(worldRight + gridSize, startX + gridSize * 1000);
            const endY = Math.min(worldBottom + gridSize, startY + gridSize * 1000);

            for (let x = startX; x <= endX && renderedPoints < maxGridPoints; x += gridSize) {
                const baseScreenX = (x * zoom) + panOffsetX;
                const xInBounds = baseScreenX >= -renderMargin && baseScreenX <= canvasWidth + renderMargin;

                if (!xInBounds) continue;

                for (let y = startY; y <= endY && renderedPoints < maxGridPoints; y += gridSize) {
                    const screenY = (y * zoom) + panOffsetY;

                    if (screenY >= -renderMargin && screenY <= canvasHeight + renderMargin) {
                        this.ctx.beginPath();
                        this.ctx.arc(baseScreenX, screenY, dotSize, 0, 2 * Math.PI);
                        this.ctx.stroke();
                        renderedPoints++;
                    }
                }
            }
        } else if (this.boardSettings.gridStyle === 'lines') {
            this.ctx.setLineDash([]);

            this.ctx.lineWidth = Math.max(0.5, 1 * Math.sqrt(invZoom));

            const zoom = this.zoom;
            const panOffsetX = this.panOffset.x;
            const panOffsetY = this.panOffset.y;
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;

            const endX = Math.min(worldRight + gridSize, startX + gridSize * 1000);
            for (let x = startX; x <= endX; x += gridSize) {
                const screenX = (x * zoom) + panOffsetX;
                if (screenX >= -renderMargin && screenX <= canvasWidth + renderMargin) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenX, -renderMargin);
                    this.ctx.lineTo(screenX, canvasHeight + renderMargin);
                    this.ctx.stroke();
                }
            }

            const endY = Math.min(worldBottom + gridSize, startY + gridSize * 1000);
            for (let y = startY; y <= endY; y += gridSize) {
                const screenY = (y * zoom) + panOffsetY;
                if (screenY >= -renderMargin && screenY <= canvasHeight + renderMargin) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(-renderMargin, screenY);
                    this.ctx.lineTo(canvasWidth + renderMargin, screenY);
                    this.ctx.stroke();
                }
            }
        }

        this.ctx.setLineDash([]);
    }

    renderOriginMarker() {
        const originScreenX = this.panOffset.x;
        const originScreenY = this.panOffset.y;

        if (originScreenX >= -50 && originScreenX <= this.canvas.width + 50 &&
            originScreenY >= -50 && originScreenY <= this.canvas.height + 50) {

            this.ctx.strokeStyle = '#ff6b6b';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([]);

            const size = 10;
            this.ctx.beginPath();
            this.ctx.moveTo(originScreenX - size, originScreenY);
            this.ctx.lineTo(originScreenX + size, originScreenY);
            this.ctx.moveTo(originScreenX, originScreenY - size);
            this.ctx.lineTo(originScreenX, originScreenY + size);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.arc(originScreenX, originScreenY, 3, 0, 2 * Math.PI);
            this.ctx.stroke();
        }
    }

    renderElements() {
        const layers = this.layerManager.getRenderableLayers();
        layers.forEach(element => {
            ElementTypes.renderElement(this.ctx, element);
        });
    }

    renderSelection() {
        const selectedElements = this.layerManager.getSelectedElements();

        selectedElements.forEach(element => {
            const bounds = ElementTypes.getElementBounds(element);

            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
            this.ctx.setLineDash([]);
        });
    }

    renderResizeHandles() {
        const selectedElements = this.layerManager.getSelectedElements();
        if (selectedElements.length === 0) return;

        const element = selectedElements[0];
        const handles = this.getResizeHandles(element);

        this.ctx.fillStyle = '#007bff';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;

        handles.forEach(handle => {
            this.ctx.beginPath();
            this.ctx.arc(handle.x, handle.y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    renderDrawingPath() {
        if (this.currentPath.length === 0) return;

        const path = this.currentPath[0];
        this.ctx.strokeStyle = path.strokeColor;
        this.ctx.lineWidth = path.strokeWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(path.points[0].x, path.points[0].y);

        for (let i = 1; i < path.points.length; i++) {
            this.ctx.lineTo(path.points[i].x, path.points[i].y);
        }

        this.ctx.stroke();
    }

    async loadBoardData() {
        try {
            const response = await api.getBoardElements(this.boardId);
            if (response.elements) {
                this.layerManager.loadState({ elements: response.elements });
                this.render();
                this.layerPanel.updateLayers();
                this.updateHistoryPanel();
            }
        } catch (error) {
            console.error('Failed to load board data:', error);
            // graceful degradation
            if (error.message.includes('Board not found')) {
                console.log('Board not found, starting with empty board');
                this.layerManager.loadState({ elements: [] });
                this.render();
                this.layerPanel.updateLayers();
                this.updateHistoryPanel();
            }
        }
    }

    async syncElementToServer(elementId) {
        const element = this.layerManager.layers.find(el => el.id === elementId);
        if (!element) return;

        try {
            const updateData = {
                type: element.type,
                properties: element.properties,
                z_index: element.z_index
            };

            if (element.version) {
                updateData.version = element.version;
            }

            const response = await api.updateBoardElement(this.boardId, elementId, updateData);

            if (response.success) {
                // Обновление локального элемента данными от сервера
                const updatedElement = response.element;
                Object.assign(element, updatedElement);
                element.synced = true;
            } else if (response.conflict) {
                console.log('Version conflict detected, resolving...');
                this.resolveVersionConflict(elementId, response.serverElement);
            }
        } catch (error) {
            console.error('Failed to sync element to server:', error);

            if (error.message && error.message.includes('409')) {
                try {
                    const errorData = JSON.parse(error.message.split(': ')[1] || '{}');
                    if (errorData.conflict) {
                        this.resolveVersionConflict(elementId, errorData.serverElement);
                    }
                } catch (parseError) {
                    console.error('Error parsing conflict response:', parseError);
                }
            }
        }
    }

    resolveVersionConflict(elementId, serverElement) {
        const localElement = this.layerManager.layers.find(el => el.id === elementId);
        if (!localElement) return;

        // Last-writer-wins strategy
        console.log('Resolving conflict for element', elementId);
        console.log('Server version:', serverElement.version, 'Local version:', localElement.version);

        Object.assign(localElement, serverElement);
        localElement.synced = true;

        this.render();

        this.showNotification('Element was modified by another user - changes merged', 'warning');
    }

    async deleteElementFromServer(elementId) {
        try {
            await api.deleteBoardElement(this.boardId, elementId);
        } catch (error) {
            console.error('Failed to delete element from server:', error);
        }
    }

    async createSnapshot() {
        try {
            await api.createBoardSnapshot(this.boardId);
            this.updateHistoryPanel();
        } catch (error) {
            console.error('Failed to create snapshot:', error);
        }
    }

    updateHistoryPanel() {
        if (this.historyPanel) {
            if (!this.lastHistoryUpdate || Date.now() - this.lastHistoryUpdate > 100) {
                this.historyPanel.updateHistory(this.layerManager.history, this.layerManager.historyIndex);
                this.lastHistoryUpdate = Date.now();
            }
        }
    }

    handleImageUpload(pos, properties) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processImageFile(file, pos, properties);
            }
            document.body.removeChild(input);
        };

        document.body.appendChild(input);
        input.click();
    }

    handleFileUpload(pos, properties) {
        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processFile(file, pos, properties);
            }
            document.body.removeChild(input);
        };

        document.body.appendChild(input);
        input.click();
    }

    async processImageFile(file, pos, properties) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await api.uploadFile(this.boardId, formData);

            if (uploadResponse) {
                properties.fileId = uploadResponse.id;
                properties.src = uploadResponse.url;
                properties.alt = file.name;
                properties.width = 200;
                properties.height = 200;

                const elementData = {
                    type: 'image',
                    properties: properties,
                    z_index: this.getNextZIndex()
                };

                this.createElement(elementData);

                this.toolbarPanel.resetSelection();
                this.selectedTool = null;
                this.canvas.style.cursor = 'default';
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('Failed to upload image. Please try again.');
        }
    }

    async processFile(file, pos, properties) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await api.uploadFile(this.boardId, formData);

            if (uploadResponse) {
                properties.fileId = uploadResponse.id;
                properties.fileName = file.name;
                properties.fileType = file.type;
                properties.fileSize = file.size;
                properties.url = uploadResponse.url;

                if (file.type.startsWith('image/')) {
                    properties.previewUrl = uploadResponse.url;
                }

                const elementData = {
                    type: 'file',
                    properties: properties,
                    z_index: this.getNextZIndex()
                };

                this.createElement(elementData);

                this.toolbarPanel.resetSelection();
                this.selectedTool = null;
                this.canvas.style.cursor = 'default';
            }
        } catch (error) {
            console.error('Failed to upload file:', error);
            alert('Failed to upload file. Please try again.');
        }
    }

    getResizeHandleAtPoint(pos) {
        const selectedElements = this.layerManager.getSelectedElements();
        if (selectedElements.length === 0) return null;

        const element = selectedElements[0];
        const handles = this.getResizeHandles(element);

        for (const handle of handles) {
            const distance = Math.sqrt(
                Math.pow(pos.x - handle.x, 2) + Math.pow(pos.y - handle.y, 2)
            );
            if (distance <= 8) { // 8px hit area
                return { element, handle: handle.type };
            }
        }

        return null;
    }

    getResizeHandles(element) {
        const props = element.properties;
        const handles = [];

        handles.push({ type: 'nw', x: props.x, y: props.y });
        handles.push({ type: 'ne', x: props.x + props.width, y: props.y });
        handles.push({ type: 'sw', x: props.x, y: props.y + props.height });
        handles.push({ type: 'se', x: props.x + props.width, y: props.y + props.height });

        handles.push({ type: 'n', x: props.x + props.width / 2, y: props.y });
        handles.push({ type: 's', x: props.x + props.width / 2, y: props.y + props.height });
        handles.push({ type: 'w', x: props.x, y: props.y + props.height / 2 });
        handles.push({ type: 'e', x: props.x + props.width, y: props.y + props.height / 2 });

        return handles;
    }

    startResize(element, handle, pos) {
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeElement = element;
        this.resizeStartPos = { ...pos };
        this.resizeStartSize = {
            width: element.properties.width,
            height: element.properties.height,
            x: element.properties.x,
            y: element.properties.y
        };
        this.canvas.style.cursor = this.getResizeCursor(handle);
    }

    updateResize(pos) {
        if (!this.isResizing || !this.resizeElement) return;

        const deltaX = pos.x - this.resizeStartPos.x;
        const deltaY = pos.y - this.resizeStartPos.y;
        const element = this.resizeElement;
        const startSize = this.resizeStartSize;

        let newX = startSize.x;
        let newY = startSize.y;
        let newWidth = startSize.width;
        let newHeight = startSize.height;

        switch (this.resizeHandle) {
            case 'nw':
                newX = startSize.x + deltaX;
                newY = startSize.y + deltaY;
                newWidth = startSize.width - deltaX;
                newHeight = startSize.height - deltaY;
                break;
            case 'ne':
                newY = startSize.y + deltaY;
                newWidth = startSize.width + deltaX;
                newHeight = startSize.height - deltaY;
                break;
            case 'sw':
                newX = startSize.x + deltaX;
                newWidth = startSize.width - deltaX;
                newHeight = startSize.height + deltaY;
                break;
            case 'se':
                newWidth = startSize.width + deltaX;
                newHeight = startSize.height + deltaY;
                break;
            case 'n':
                newY = startSize.y + deltaY;
                newHeight = startSize.height - deltaY;
                break;
            case 's':
                newHeight = startSize.height + deltaY;
                break;
            case 'w':
                newX = startSize.x + deltaX;
                newWidth = startSize.width - deltaX;
                break;
            case 'e':
                newWidth = startSize.width + deltaX;
                break;
        }

        if (newWidth < 10) newWidth = 10;
        if (newHeight < 10) newHeight = 10;

        element.properties.x = Math.round(newX * 1000) / 1000;
        element.properties.y = Math.round(newY * 1000) / 1000;
        element.properties.width = Math.round(newWidth * 1000) / 1000;
        element.properties.height = Math.round(newHeight * 1000) / 1000;

        const now = Date.now();
        if (now - this.lastRenderTime >= this.renderThrottle) {
            this.render();
            this.lastRenderTime = now;
        }

        this.render();
    }

    getResizeCursor(handle) {
        switch (handle) {
            case 'nw': case 'se': return 'nw-resize';
            case 'ne': case 'sw': return 'ne-resize';
            case 'n': case 's': return 'ns-resize';
            case 'w': case 'e': return 'ew-resize';
            default: return 'default';
        }
    }

    endResize() {
        if (this.resizeElement) {
            this.syncElementToServer(this.resizeElement.id);
        }

        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeElement = null;
        this.canvas.style.cursor = 'default';

        this.render();
    }

    updateCursorForResize(pos) {
        if (this.selectedTool?.tool === 'select' || !this.selectedTool) {
            const resizeHandle = this.getResizeHandleAtPoint(pos);
            if (resizeHandle) {
                this.canvas.style.cursor = this.getResizeCursor(resizeHandle.handle);
                return;
            }
        }

        // Reset cursor if not over a resize handle
        this.canvas.style.cursor = this.selectedTool ? this.getCursorForTool(this.selectedTool) : 'default';
    }

    // Pan and zoom methods
    startPanning(pos) {
        this.isPanning = true;
        this.panStart = { ...pos };

        // Track mouse position directly in screen coordinates
        const rect = this.canvas.getBoundingClientRect();
        const mouseEvent = window.event; // Get the original mouse event
        this.lastPanScreenPos = {
            x: mouseEvent.clientX - rect.left,
            y: mouseEvent.clientY - rect.top
        };

        this.canvas.style.cursor = 'grabbing';
    }

    updatePanning(pos) {
        if (!this.isPanning) return;

        const now = Date.now();

        const mouseEvent = window.event; // Get the original mouse event
        const rect = this.canvas.getBoundingClientRect();
        const currentScreenPos = {
            x: mouseEvent.clientX - rect.left,
            y: mouseEvent.clientY - rect.top
        };

        const deltaX = currentScreenPos.x - this.lastPanScreenPos.x;
        const deltaY = currentScreenPos.y - this.lastPanScreenPos.y;

        this.panOffset.x += deltaX;
        this.panOffset.y += deltaY;

        this.lastPanScreenPos = { ...currentScreenPos };
        this.constrainPanOffset();

        if (now - this.lastRenderTime >= this.renderThrottle) {
            this.render();
            this.lastRenderTime = now;
        }
    }

    endPanning() {
        this.isPanning = false;
        this.lastPanScreenPos = null;
        this.canvas.style.cursor = 'default';
        this.render();
    }

    destroy() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }
    }

    onWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY > 0 ? 0.85 : 1.15;
        this.zoomAt(mouseX, mouseY, zoomFactor);
    }

    zoomAt(centerX, centerY, factor) {
        const newZoom = Math.max(this.zoomMin, Math.min(this.zoomMax, this.zoom * factor));

        if (newZoom === this.zoom) return;

        const canvasCenterX = (centerX - this.panOffset.x) / this.zoom;
        const canvasCenterY = (centerY - this.panOffset.y) / this.zoom;

        const oldZoom = this.zoom;
        this.zoom = newZoom;

        const newPanOffsetX = centerX - canvasCenterX * this.zoom;
        const newPanOffsetY = centerY - canvasCenterY * this.zoom;

        if (!isFinite(newPanOffsetX) || !isFinite(newPanOffsetY)) {
            console.warn('Invalid pan offset calculation detected, resetting view');
            this.resetView();
            return;
        }
        
        const maxPanChange = 50000;
        this.panOffset.x = Math.max(-maxPanChange, Math.min(maxPanChange,
            newPanOffsetX - this.panOffset.x)) + this.panOffset.x;
        this.panOffset.y = Math.max(-maxPanChange, Math.min(maxPanChange,
            newPanOffsetY - this.panOffset.y)) + this.panOffset.y;

        // TODO
        console.log(`Zoom: ${oldZoom.toFixed(3)} → ${this.zoom.toFixed(3)}, Pan: (${this.panOffset.x.toFixed(0)}, ${this.panOffset.y.toFixed(0)})`);

        this.constrainPanOffset();

        this.render();
    }

    transformPoint(canvasX, canvasY) {
        return {
            x: canvasX * this.zoom + this.panOffset.x,
            y: canvasY * this.zoom + this.panOffset.y
        };
    }

    // Transform screen coordinates to canvas coordinates
    inverseTransformPoint(screenX, screenY) {
        return {
            x: (screenX - this.panOffset.x) / this.zoom,
            y: (screenY - this.panOffset.y) / this.zoom
        };
    }

    constrainPanOffset() {
        if (!isFinite(this.panOffset.x) || !isFinite(this.panOffset.y)) {
            this.resetView();
            return;
        }


        const maxSafeOffset = 10000000; // 10 млн пкс
        if (Math.abs(this.panOffset.x) > maxSafeOffset || Math.abs(this.panOffset.y) > maxSafeOffset) {
            this.resetView();
            return;
        }

    }

    startTextEditing(element, pos) {
        if (this.isEditingText) {
            this.finishTextEditing();
        }

        this.isEditingText = true;
        this.editingElement = element;

        this.textInput = document.createElement('input');
        this.textInput.type = 'text';
        this.textInput.value = element.properties.text || '';

        const screenPos = this.transformPoint(element.properties.x, element.properties.y);

        this.textInput.style.position = 'absolute';
        this.textInput.style.left = (this.canvas.offsetLeft + screenPos.x) + 'px';
        this.textInput.style.top = (this.canvas.offsetTop + screenPos.y) + 'px';
        this.textInput.style.width = (element.properties.width * this.zoom) + 'px';
        this.textInput.style.fontSize = (element.properties.fontSize * this.zoom) + 'px';
        this.textInput.style.fontFamily = element.properties.fontFamily || 'Arial';
        this.textInput.style.border = '2px solid #007bff';
        this.textInput.style.padding = '4px';
        this.textInput.style.background = element.properties.backgroundColor || 'transparent';
        this.textInput.style.color = element.properties.textColor || '#000000';
        this.textInput.style.zIndex = '1000';

        document.body.appendChild(this.textInput);
        this.textInput.focus();
        this.textInput.select();

        // Event handlers
        this.textInput.addEventListener('blur', () => this.finishTextEditing());
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.finishTextEditing();
            } else if (e.key === 'Escape') {
                this.cancelTextEditing();
            }
        });
    }

    finishTextEditing() {
        if (!this.isEditingText || !this.editingElement || !this.textInput) return;

        this.editingElement.properties.text = this.textInput.value;

        document.body.removeChild(this.textInput);
        this.textInput = null;

        this.isEditingText = false;
        this.editingElement = null;

        this.render();
        this.syncElementToServer(this.editingElement.id);
    }

    cancelTextEditing() {
        if (!this.isEditingText || !this.textInput) return;

        document.body.removeChild(this.textInput);
        this.textInput = null;

        this.isEditingText = false;
        this.editingElement = null;

        this.render();
    }

    connectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
        }

        this.websocket = new WebSocket(`ws://localhost:3002?boardId=${this.boardId}`);

        this.websocket.onopen = () => {
            console.log('Connected to WebSocket server for board', this.boardId);
            this.showNotification('Connected to real-time collaboration', 'success');
        };

        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.websocket.onclose = () => {
            console.log('Disconnected from WebSocket server');
            this.showNotification('Disconnected from real-time collaboration', 'warning');
            setTimeout(() => this.connectWebSocket(), 5000);
        };

        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showNotification('Connection error - real-time features disabled', 'error');
        };
    }

    handleWebSocketMessage(data) {
        const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
        if (data.userId === currentUserId) {
            return;
        }

        switch (data.type) {
            case 'element_created':
                this.handleRemoteElementCreated(data.element);
                break;
            case 'element_updated':
                this.handleRemoteElementUpdated(data.element);
                break;
            case 'element_deleted':
                this.handleRemoteElementDeleted(data.elementId);
                break;
            case 'elements_grouped':
                this.handleRemoteElementsGrouped(data.groupElement, data.elementIds);
                break;
            case 'elements_ungrouped':
                this.handleRemoteElementsUngrouped(data.groupId, data.elements);
                break;
            case 'board_restored':
                this.handleRemoteBoardRestored(data.snapshotData);
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    handleRemoteElementCreated(element) {
        this.layerManager.layers.push(element);
        this.render();
        this.showNotification('New element added by collaborator', 'info');
    }

    handleRemoteElementUpdated(element) {
        const existingElement = this.layerManager.layers.find(el => el.id === element.id);
        if (existingElement) {
            Object.assign(existingElement, element);
            this.render();
        }
    }

    handleRemoteElementDeleted(elementId) {
        const index = this.layerManager.layers.findIndex(el => el.id === elementId);
        if (index !== -1) {
            this.layerManager.layers.splice(index, 1);
            this.render();
            this.showNotification('Element removed by collaborator', 'info');
        }
    }

    handleRemoteElementsGrouped(groupElement, elementIds) {
        this.layerManager.layers.push(groupElement);
        elementIds.forEach(id => {
            const element = this.layerManager.layers.find(el => el.id === id);
            if (element) {
                element.group_id = groupElement.id;
            }
        });
        this.render();
        this.showNotification('Elements grouped by collaborator', 'info');
    }

    handleRemoteElementsUngrouped(groupId, elements) {
        const groupIndex = this.layerManager.layers.findIndex(el => el.id === groupId);
        if (groupIndex !== -1) {
            this.layerManager.layers.splice(groupIndex, 1);
        }
        elements.forEach(element => {
            const existing = this.layerManager.layers.find(el => el.id === element.id);
            if (existing) {
                Object.assign(existing, element);
            }
        });
        this.render();
        this.showNotification('Elements ungrouped by collaborator', 'info');
    }

    handleRemoteBoardRestored(snapshotData) {
        this.layerManager.layers = snapshotData.elements || [];
        this.render();
        this.showNotification('Board restored from snapshot by collaborator', 'info');
    }

    showContextMenu(element, x, y) {
        this.hideContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'absolute';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.background = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        menu.style.zIndex = '10000';
        menu.style.minWidth = '150px';

        const menuItems = this.getContextMenuItems(element);

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.label;
            menuItem.style.padding = '8px 12px';
            menuItem.style.cursor = 'pointer';
            menuItem.style.borderBottom = '1px solid #eee';

            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f0f0f0';
            });

            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'white';
            });

            menuItem.addEventListener('click', () => {
                item.action();
                this.hideContextMenu();
            });

            menu.appendChild(menuItem);
        });

        menu.lastChild.style.borderBottom = 'none';

        document.body.appendChild(menu);
        this.contextMenu = menu;

        const hideMenu = (e) => {
            if (!menu.contains(e.target)) {
                this.hideContextMenu();
                document.removeEventListener('click', hideMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', hideMenu);
        }, 100);
    }

    showCanvasContextMenu(pos, x, y) {
        this.hideContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'absolute';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.background = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        menu.style.zIndex = '10000';
        menu.style.minWidth = '150px';

        const menuItems = [
            {
                label: 'Reset View (R)',
                action: () => this.resetView()
            },
            {
                label: 'Center at Origin',
                action: () => this.centerAtOrigin()
            },
            {
                label: 'Paste',
                action: () => this.pasteAtPosition(pos)
            }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.label;
            menuItem.style.padding = '8px 12px';
            menuItem.style.cursor = 'pointer';
            menuItem.style.borderBottom = '1px solid #eee';

            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f0f0f0';
            });

            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'white';
            });

            menuItem.addEventListener('click', () => {
                item.action();
                this.hideContextMenu();
            });

            menu.appendChild(menuItem);
        });

        menu.lastChild.style.borderBottom = 'none';

        document.body.appendChild(menu);
        this.contextMenu = menu;

        const hideMenu = (e) => {
            if (!menu.contains(e.target)) {
                this.hideContextMenu();
                document.removeEventListener('click', hideMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', hideMenu);
        }, 100);
    }

    getContextMenuItems(element) {
        const items = [];

        items.push({
            label: 'Bring to Front',
            action: () => this.layerManager.bringToFront(element.id)
        });

        items.push({
            label: 'Send to Back',
            action: () => this.layerManager.sendToBack(element.id)
        });

        items.push({
            label: 'Duplicate',
            action: () => this.duplicateElement(element)
        });

        items.push({
            label: 'Delete',
            action: () => this.deleteSelectedElements()
        });

        if (element.type === 'text' || element.type === 'sticky') {
            items.splice(0, 0, {
                label: 'Edit Text',
                action: () => this.startTextEditing(element, { x: element.properties.x, y: element.properties.y })
            });
        }

        if (element.type === 'shape' || element.type === 'text' || element.type === 'sticky') {
            items.splice(4, 0, {
                label: 'Copy',
                action: () => this.copyElement(element)
            });
        }

        return items;
    }

    duplicateElement(element) {
        const newElement = {
            ...element,
            id: Date.now().toString(),
            properties: {
                ...element.properties,
                x: element.properties.x + 20,
                y: element.properties.y + 20
            }
        };

        this.layerManager.addElement(newElement);
        this.render();
        this.syncElementToServer(newElement.id);
    }

    copyElement(element) {
        this.clipboardElement = element;
        this.showNotification('Element copied to clipboard', 'info');
    }

    pasteAtPosition(pos) {
        if (this.clipboardElement) {
            const newElement = {
                ...this.clipboardElement,
                id: Date.now().toString(),
                properties: {
                    ...this.clipboardElement.properties,
                    x: pos.x,
                    y: pos.y
                }
            };

            this.layerManager.addElement(newElement);
            this.render();
            this.syncElementToServer(newElement.id);
            this.showNotification('Element pasted', 'info');
        }
    }

    resetView() {
        this.zoom = 1;
        this.panOffset = { x: 0, y: 0 };
        this.render();
        this.showNotification('View reset to center (R: reset, O: origin, F: find content)', 'info');
    }

    centerAtOrigin() {
        this.panOffset = { x: 0, y: 0 };
        this.render();
        this.showNotification('Centered at origin (0,0) - Press F to find content', 'info');
    }

    findContent() {
        const elements = this.layerManager.getRenderableLayers();
        if (elements.length === 0) {
            this.centerAtOrigin();
            this.showNotification('No elements found, centered at origin - Use R, O, F for view controls', 'info');
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        elements.forEach(element => {
            const bounds = ElementTypes.getElementBounds(element);
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        this.panOffset.x = this.canvas.width / 2 - centerX * this.zoom;
        this.panOffset.y = this.canvas.height / 2 - centerY * this.zoom;

        this.render();
        this.showNotification('Centered on content - Use R, O, F for view controls', 'success');
    }

    hideContextMenu() {
        if (this.contextMenu) {
            document.body.removeChild(this.contextMenu);
            this.contextMenu = null;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : type === 'warning' ? '#ffaa44' : '#4444ff'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
        `;

        document.body.appendChild(notification);

        setTimeout(() => notification.style.opacity = '1', 100);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    // Export/import functionality
    exportBoard() {
        const boardData = {
            boardId: this.boardId,
            elements: this.layerManager.layers,
            settings: this.boardSettings,
            timestamp: new Date().toISOString()
        };

        const dataStr = JSON.stringify(boardData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `board-${this.boardId}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    async importBoard(file) {
        try {
            const text = await file.text();
            const boardData = JSON.parse(text);

            if (boardData.elements) {
                this.layerManager.loadState({ elements: boardData.elements });
                this.render();
                this.layerPanel.updateLayers();
                this.updateHistoryPanel();
            }
        } catch (error) {
            console.error('Failed to import board:', error);
            alert('Invalid board file format');
        }
    }
}

window.ExtendedWhiteboard = ExtendedWhiteboard;
