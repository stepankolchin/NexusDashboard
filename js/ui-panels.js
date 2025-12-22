class ToolbarPanel {
    constructor(container, onToolSelect) {
        this.container = container;
        this.onToolSelect = onToolSelect;
        this.selectedTool = null;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="toolbar-panel">
                <div class="toolbar-section">
                    <h4>Shapes</h4>
                    <div class="toolbar-tools">
                        <button class="tool-btn" data-tool="shape" data-shape="rectangle">
                            <div class="tool-icon">▭</div>
                            <span>Rectangle</span>
                        </button>
                        <button class="tool-btn" data-tool="shape" data-shape="circle">
                            <div class="tool-icon">○</div>
                            <span>Circle</span>
                        </button>
                        <button class="tool-btn" data-tool="shape" data-shape="triangle">
                            <div class="tool-icon">△</div>
                            <span>Triangle</span>
                        </button>
                        <button class="tool-btn" data-tool="shape" data-shape="star">
                            <div class="tool-icon">★</div>
                            <span>Star</span>
                        </button>
                        <button class="tool-btn" data-tool="shape" data-shape="arrow">
                            <div class="tool-icon">→</div>
                            <span>Arrow</span>
                        </button>
                        <button class="tool-btn" data-tool="shape" data-shape="line">
                            <div class="tool-icon">━</div>
                            <span>Line</span>
                        </button>
                    </div>
                </div>

                <div class="toolbar-section">
                    <h4>Elements</h4>
                    <div class="toolbar-tools">
                        <button class="tool-btn" data-tool="text">
                            <div class="tool-icon">T</div>
                            <span>Text</span>
                        </button>
                        <button class="tool-btn" data-tool="sticky">
                            <div class="tool-icon">📝</div>
                            <span>Sticky</span>
                        </button>
                        <button class="tool-btn" data-tool="image">
                            <div class="tool-icon">🖼️</div>
                            <span>Image</span>
                        </button>
                        <button class="tool-btn" data-tool="file">
                            <div class="tool-icon">📎</div>
                            <span>File</span>
                        </button>
                        <button class="tool-btn" data-tool="connector">
                            <div class="tool-icon">⤴</div>
                            <span>Connector</span>
                        </button>
                    </div>
                </div>

                <div class="toolbar-section">
                    <h4>Drawing</h4>
                    <div class="toolbar-tools">
                        <button class="tool-btn" data-tool="drawing">
                            <div class="tool-icon">✏️</div>
                            <span>Draw</span>
                        </button>
                        <button class="tool-btn" data-tool="eraser">
                            <div class="tool-icon">🧽</div>
                            <span>Erase</span>
                        </button>
                    </div>
                </div>

                <div class="toolbar-section">
                    <h4>Actions</h4>
                    <div class="toolbar-tools">
                        <button class="tool-btn" data-tool="select">
                            <div class="tool-icon">↗</div>
                            <span>Select</span>
                        </button>
                        <button class="tool-btn" data-tool="group">
                            <div class="tool-icon">🔗</div>
                            <span>Group</span>
                        </button>
                        <button class="tool-btn" data-tool="ungroup">
                            <div class="tool-icon">🔓</div>
                            <span>Ungroup</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        this.container.addEventListener('click', (e) => {
            const toolBtn = e.target.closest('.tool-btn');
            if (toolBtn) {
                this.selectTool(toolBtn);
            }
        });
    }

    selectTool(toolBtn) {
        this.container.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        toolBtn.classList.add('selected');

        const tool = toolBtn.dataset.tool;
        const shape = toolBtn.dataset.shape;

        this.selectedTool = { tool, shape };

        if (this.onToolSelect) {
            this.onToolSelect(this.selectedTool);
        }
    }

    getSelectedTool() {
        return this.selectedTool;
    }

    resetSelection() {
        this.container.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        this.selectedTool = null;
    }
}

class PropertiesPanel {
    constructor(container, onPropertyChange) {
        this.container = container;
        this.onPropertyChange = onPropertyChange;
        this.selectedElement = null;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="properties-panel">
                <div class="panel-header">
                    <h4>Properties</h4>
                </div>
                <div class="panel-content">
                    <div class="no-selection">
                        <p>Select an element to edit its properties</p>
                    </div>
                    <div class="element-properties" style="display: none;">
                        <!-- Properties will be dynamically generated -->
                    </div>
                </div>
            </div>
        `;
    }

    showElementProperties(element) {
        this.selectedElement = element;
        const propertiesDiv = this.container.querySelector('.element-properties');
        const noSelectionDiv = this.container.querySelector('.no-selection');

        noSelectionDiv.style.display = 'none';
        propertiesDiv.style.display = 'block';

        propertiesDiv.innerHTML = this.generatePropertiesForm(element);
        this.bindPropertyEvents();
    }

    hideElementProperties() {
        this.selectedElement = null;
        const propertiesDiv = this.container.querySelector('.element-properties');
        const noSelectionDiv = this.container.querySelector('.no-selection');

        propertiesDiv.style.display = 'none';
        noSelectionDiv.style.display = 'block';
    }

    generatePropertiesForm(element) {
        const { type, properties } = element;
        let formHtml = `<h5>${type.charAt(0).toUpperCase() + type.slice(1)} Properties</h5>`;

        switch (type) {
            case 'shape':
                formHtml += this.generateShapeProperties(properties);
                break;
            case 'text':
                formHtml += this.generateTextProperties(properties);
                break;
            case 'sticky':
                formHtml += this.generateStickyProperties(properties);
                break;
            case 'image':
                formHtml += this.generateImageProperties(properties);
                break;
            case 'connector':
                formHtml += this.generateConnectorProperties(properties);
                break;
            default:
                formHtml += '<p>No editable properties for this element type.</p>';
        }

        formHtml += `
            <div class="property-group">
                <h6>Transform</h6>
                <div class="property-row">
                    <label>X:</label>
                    <input type="number" class="property-input" data-property="x" value="${properties.x || 0}">
                </div>
                <div class="property-row">
                    <label>Y:</label>
                    <input type="number" class="property-input" data-property="y" value="${properties.y || 0}">
                </div>
                <div class="property-row">
                    <label>Width:</label>
                    <input type="number" class="property-input" data-property="width" value="${properties.width || 100}">
                </div>
                <div class="property-row">
                    <label>Height:</label>
                    <input type="number" class="property-input" data-property="height" value="${properties.height || 100}">
                </div>
                <div class="property-row">
                    <label>Rotation:</label>
                    <input type="number" class="property-input" data-property="rotation" value="${properties.rotation || 0}" min="0" max="360">
                </div>
            </div>
        `;

        return formHtml;
    }

    generateShapeProperties(props) {
        return `
            <div class="property-group">
                <h6>Shape</h6>
                <div class="property-row">
                    <label>Fill Color:</label>
                    <input type="color" class="property-input" data-property="fillColor" value="${props.fillColor || '#ffffff'}">
                </div>
                <div class="property-row">
                    <label>Stroke Color:</label>
                    <input type="color" class="property-input" data-property="strokeColor" value="${props.strokeColor || '#000000'}">
                </div>
                <div class="property-row">
                    <label>Stroke Width:</label>
                    <input type="number" class="property-input" data-property="strokeWidth" value="${props.strokeWidth || 2}" min="1" max="20">
                </div>
            </div>
        `;
    }

    generateTextProperties(props) {
        return `
            <div class="property-group">
                <h6>Text</h6>
                <div class="property-row">
                    <label>Text:</label>
                    <textarea class="property-input" data-property="text" rows="3">${props.text || ''}</textarea>
                </div>
                <div class="property-row">
                    <label>Font Size:</label>
                    <input type="number" class="property-input" data-property="fontSize" value="${props.fontSize || 16}" min="8" max="72">
                </div>
                <div class="property-row">
                    <label>Font Color:</label>
                    <input type="color" class="property-input" data-property="fontColor" value="${props.fontColor || '#000000'}">
                </div>
                <div class="property-row">
                    <label>
                        <input type="checkbox" class="property-input" data-property="bold" ${props.bold ? 'checked' : ''}>
                        Bold
                    </label>
                </div>
                <div class="property-row">
                    <label>
                        <input type="checkbox" class="property-input" data-property="italic" ${props.italic ? 'checked' : ''}>
                        Italic
                    </label>
                </div>
                <div class="property-row">
                    <label>
                        <input type="checkbox" class="property-input" data-property="underline" ${props.underline ? 'checked' : ''}>
                        Underline
                    </label>
                </div>
            </div>
        `;
    }

    generateStickyProperties(props) {
        return `
            <div class="property-group">
                <h6>Sticky Note</h6>
                <div class="property-row">
                    <label>Text:</label>
                    <textarea class="property-input" data-property="text" rows="4">${props.text || ''}</textarea>
                </div>
                <div class="property-row">
                    <label>Background:</label>
                    <input type="color" class="property-input" data-property="backgroundColor" value="${props.backgroundColor || '#ffff88'}">
                </div>
                <div class="property-row">
                    <label>Text Color:</label>
                    <input type="color" class="property-input" data-property="textColor" value="${props.textColor || '#000000'}">
                </div>
                <div class="property-row">
                    <label>Font Size:</label>
                    <input type="number" class="property-input" data-property="fontSize" value="${props.fontSize || 14}" min="8" max="32">
                </div>
            </div>
        `;
    }

    generateImageProperties(props) {
        return `
            <div class="property-group">
                <h6>Image</h6>
                <div class="property-row">
                    <label>Alt Text:</label>
                    <input type="text" class="property-input" data-property="alt" value="${props.alt || ''}">
                </div>
                <div class="property-row">
                    <label>Change Image:</label>
                    <input type="file" class="property-input" data-property="file" accept="image/*">
                </div>
            </div>
        `;
    }

    generateConnectorProperties(props) {
        return `
            <div class="property-group">
                <h6>Connector</h6>
                <div class="property-row">
                    <label>Stroke Color:</label>
                    <input type="color" class="property-input" data-property="strokeColor" value="${props.strokeColor || '#000000'}">
                </div>
                <div class="property-row">
                    <label>Stroke Width:</label>
                    <input type="number" class="property-input" data-property="strokeWidth" value="${props.strokeWidth || 2}" min="1" max="10">
                </div>
                <div class="property-row">
                    <label>Style:</label>
                    <select class="property-input" data-property="strokeStyle">
                        <option value="solid" ${props.strokeStyle === 'solid' ? 'selected' : ''}>Solid</option>
                        <option value="dashed" ${props.strokeStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
                        <option value="dotted" ${props.strokeStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
                    </select>
                </div>
                <div class="property-row">
                    <label>
                        <input type="checkbox" class="property-input" data-property="arrowStart" ${props.arrowStart ? 'checked' : ''}>
                        Arrow at start
                    </label>
                </div>
                <div class="property-row">
                    <label>
                        <input type="checkbox" class="property-input" data-property="arrowEnd" ${props.arrowEnd ? 'checked' : ''}>
                        Arrow at end
                    </label>
                </div>
            </div>
        `;
    }

    bindPropertyEvents() {
        const inputs = this.container.querySelectorAll('.property-input');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const property = e.target.dataset.property;
                let value = e.target.value;

                // Handle checkboxes
                if (e.target.type === 'checkbox') {
                    value = e.target.checked;
                }

                // Handle numbers
                if (e.target.type === 'number') {
                    value = parseFloat(value);
                }

                if (this.onPropertyChange && this.selectedElement) {
                    this.onPropertyChange(this.selectedElement.id, property, value);
                }
            });
        });
    }
}

class LayerPanel {
    constructor(container, layerManager, onLayerAction) {
        this.container = container;
        this.layerManager = layerManager;
        this.onLayerAction = onLayerAction;
        this.lastLayerUpdate = 0;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="layer-panel">
                <div class="panel-header">
                    <h4>Layers</h4>
                    <div class="layer-actions">
                        <button class="layer-btn" data-action="bring-front">↑↑</button>
                        <button class="layer-btn" data-action="bring-forward">↑</button>
                        <button class="layer-btn" data-action="send-backward">↓</button>
                        <button class="layer-btn" data-action="send-back">↓↓</button>
                    </div>
                </div>
                <div class="layer-list">
                    <!-- Layers will be populated here -->
                </div>
            </div>
        `;

        this.bindEvents();
        this.updateLayers();
    }

    bindEvents() {
        this.container.addEventListener('click', (e) => {
            const layerBtn = e.target.closest('.layer-btn');
            const layerItem = e.target.closest('.layer-item');

            if (layerBtn) {
                const action = layerBtn.dataset.action;
                const selectedElements = this.layerManager.getSelectedElements();

                if (selectedElements.length > 0) {
                    selectedElements.forEach(element => {
                        switch (action) {
                            case 'bring-front':
                                this.layerManager.bringToFront(element.id);
                                break;
                            case 'bring-forward':
                                this.layerManager.moveUp(element.id);
                                break;
                            case 'send-backward':
                                this.layerManager.moveDown(element.id);
                                break;
                            case 'send-back':
                                this.layerManager.sendToBack(element.id);
                                break;
                        }
                    });

                    this.updateLayers();
                    if (this.onLayerAction) {
                        this.onLayerAction(action);
                    }
                }
            }

            if (layerItem && !e.target.closest('.layer-btn')) {
                const elementId = layerItem.dataset.elementId;
                const selectedElements = this.layerManager.getSelectedElements();

                if (e.ctrlKey || e.metaKey) {
                    if (selectedElements.find(el => el.id === elementId)) {
                        this.layerManager.removeFromSelection([elementId]);
                    } else {
                        this.layerManager.addToSelection([elementId]);
                    }
                } else {
                    this.layerManager.selectElements([elementId]);
                }

                this.updateLayers();
            }
        });
    }

    updateLayers() {
        if (!this.lastLayerUpdate || Date.now() - this.lastLayerUpdate > 100) {
            const layerList = this.container.querySelector('.layer-list');
            const layers = this.layerManager.getRenderableLayers();
            const selectedElements = this.layerManager.getSelectedElements();

        layerList.innerHTML = layers.map(layer => {
            const isSelected = selectedElements.find(el => el.id === layer.id);
            const elementType = layer.type.charAt(0).toUpperCase() + layer.type.slice(1);
            const zIndex = layer.z_index || 0;

            return `
                <div class="layer-item ${isSelected ? 'selected' : ''}" data-element-id="${layer.id}">
                    <div class="layer-icon">${this.getLayerIcon(layer.type)}</div>
                    <div class="layer-info">
                        <div class="layer-name">${elementType}</div>
                        <div class="layer-zindex">Z: ${zIndex}</div>
                    </div>
                    ${layer.group_id ? '<div class="layer-group-indicator">🔗</div>' : ''}
                </div>
            `;
        }).join('');

            if (layers.length === 0) {
                layerList.innerHTML = '<div class="no-layers">No elements on board</div>';
            }

            this.lastLayerUpdate = Date.now();
        }
    }

    getLayerIcon(type) {
        const icons = {
            shape: '▭',
            text: 'T',
            sticky: '📝',
            image: '🖼️',
            file: '📎',
            drawing: '✏️',
            connector: '⤴',
            group: '🔗'
        };
        return icons[type] || '■';
    }
}

class HistoryPanel {
    constructor(container, onHistoryAction) {
        this.container = container;
        this.onHistoryAction = onHistoryAction;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="history-panel">
                <div class="panel-header">
                    <h4>History</h4>
                    <div class="history-actions">
                        <button class="history-btn" data-action="undo">↶ Undo</button>
                        <button class="history-btn" data-action="redo">↷ Redo</button>
                    </div>
                </div>
                <div class="history-list">
                    <!-- History will be populated here -->
                </div>
                <div class="history-snapshot">
                    <button class="snapshot-btn">📸 Save Snapshot</button>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        this.container.addEventListener('click', (e) => {
            const historyBtn = e.target.closest('.history-btn');
            const snapshotBtn = e.target.closest('.snapshot-btn');

            if (historyBtn) {
                const action = historyBtn.dataset.action;
                if (this.onHistoryAction) {
                    this.onHistoryAction(action);
                }
            }

            if (snapshotBtn) {
                if (this.onHistoryAction) {
                    this.onHistoryAction('snapshot');
                }
            }
        });
    }

    updateHistory(history, currentIndex) {
        const historyList = this.container.querySelector('.history-list');

        historyList.innerHTML = history.map((item, index) => {
            const isCurrent = index === currentIndex;
            const action = item.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            return `
                <div class="history-item ${isCurrent ? 'current' : ''}">
                    <div class="history-icon">${this.getHistoryIcon(item.action)}</div>
                    <div class="history-info">
                        <div class="history-action">${action}</div>
                        <div class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
        }).join('');

        if (history.length === 0) {
            historyList.innerHTML = '<div class="no-history">No actions yet</div>';
        }

        const undoBtn = this.container.querySelector('[data-action="undo"]');
        const redoBtn = this.container.querySelector('[data-action="redo"]');

        undoBtn.disabled = currentIndex <= 0;
        redoBtn.disabled = currentIndex >= history.length - 1;
    }

    getHistoryIcon(action) {
        const icons = {
            add_element: '➕',
            remove_element: '➖',
            update_element: '✏️',
            move_layer: '↕️',
            move_up: '⬆️',
            move_down: '⬇️',
            group_elements: '🔗',
            ungroup_elements: '🔓'
        };
        return icons[action] || '📝';
    }
}

window.ToolbarPanel = ToolbarPanel;
window.PropertiesPanel = PropertiesPanel;
window.LayerPanel = LayerPanel;
window.HistoryPanel = HistoryPanel;
