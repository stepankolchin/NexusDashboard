class LayerManager {
    constructor(boardId) {
        this.boardId = boardId;
        this.layers = [];
        this.selectedElements = new Set();
        this.groups = new Map();
        this.history = [];
        this.historyIndex = -1;
    }

    addElement(element) {
        this.layers.push(element);
        this.sortByZIndex();
        this.saveSnapshot('add_element');
    }

    removeElement(elementId) {
        const index = this.layers.findIndex(el => el.id === elementId);
        if (index !== -1) {
            this.layers.splice(index, 1);
            this.saveSnapshot('remove_element');
        }
    }

    updateElement(elementId, updates) {
        const element = this.layers.find(el => el.id === elementId);
        if (element) {
            Object.assign(element.properties, updates);
            element.updated_at = new Date().toISOString();
            this.saveSnapshot('update_element');
        }
    }

    moveToLayer(elementId, targetZIndex) {
        const element = this.layers.find(el => el.id === elementId);
        if (element) {
            element.z_index = targetZIndex;
            this.sortByZIndex();
            this.saveSnapshot('move_layer');
        }
    }

    bringToFront(elementId) {
        const maxZIndex = Math.max(...this.layers.map(el => el.z_index || 0));
        this.moveToLayer(elementId, maxZIndex + 1);
    }

    sendToBack(elementId) {
        const minZIndex = Math.min(...this.layers.map(el => el.z_index || 0));
        this.moveToLayer(elementId, minZIndex - 1);
    }

    moveUp(elementId) {
        const element = this.layers.find(el => el.id === elementId);
        if (element) {
            const currentZ = element.z_index || 0;
            const nextElement = this.layers.find(el => (el.z_index || 0) > currentZ);
            if (nextElement) {
                const tempZ = element.z_index;
                element.z_index = nextElement.z_index;
                nextElement.z_index = tempZ;
                this.sortByZIndex();
                this.saveSnapshot('move_up');
            }
        }
    }

    moveDown(elementId) {
        const element = this.layers.find(el => el.id === elementId);
        if (element) {
            const currentZ = element.z_index || 0;
            const prevElement = this.layers
                .filter(el => (el.z_index || 0) < currentZ)
                .sort((a, b) => (b.z_index || 0) - (a.z_index || 0))[0];

            if (prevElement) {
                const tempZ = element.z_index;
                element.z_index = prevElement.z_index;
                prevElement.z_index = tempZ;
                this.sortByZIndex();
                this.saveSnapshot('move_down');
            }
        }
    }

    groupElements(elementIds, groupProperties = {}) {
        if (!elementIds || elementIds.length < 2) return null;

        const elements = this.layers.filter(el => elementIds.includes(el.id));
        if (elements.length === 0) return null;

        const bounds = this.calculateGroupBounds(elements);

        const groupElement = {
            id: Date.now().toString(),
            type: 'group',
            properties: {
                ...bounds,
                children: elementIds,
                ...groupProperties
            },
            z_index: Math.max(...elements.map(el => el.z_index || 0)) + 1,
            group_id: null,
            created_by: null,
            updated_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.layers.push(groupElement);

        elements.forEach(el => {
            el.group_id = groupElement.id;
        });

        this.groups.set(groupElement.id, elements);
        this.sortByZIndex();
        this.saveSnapshot('group_elements');

        return groupElement;
    }

    ungroupElements(groupId) {
        const groupElement = this.layers.find(el => el.id === groupId && el.type === 'group');
        if (!groupElement) return;

        const childElements = this.layers.filter(el =>
            groupElement.properties.children.includes(el.id)
        );

        childElements.forEach(el => {
            el.group_id = null;
        });

        const groupIndex = this.layers.findIndex(el => el.id === groupId);
        if (groupIndex !== -1) {
            this.layers.splice(groupIndex, 1);
        }

        this.groups.delete(groupId);
        this.saveSnapshot('ungroup_elements');
    }

    calculateGroupBounds(elements) {
        if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        elements.forEach(el => {
            const bounds = ElementTypes.getElementBounds(el);
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    selectElements(elementIds) {
        this.selectedElements.clear();
        elementIds.forEach(id => this.selectedElements.add(id));
    }

    addToSelection(elementIds) {
        elementIds.forEach(id => this.selectedElements.add(id));
    }

    removeFromSelection(elementIds) {
        elementIds.forEach(id => this.selectedElements.delete(id));
    }

    clearSelection() {
        this.selectedElements.clear();
    }

    getSelectedElements() {
        return this.layers.filter(el => this.selectedElements.has(el.id));
    }

    getElementAtPoint(x, y) {
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const element = this.layers[i];
            if (ElementTypes.isPointInElement(x, y, element)) {
                return element;
            }
        }
        return null;
    }

    sortByZIndex() {
        this.layers.sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
    }

    saveSnapshot(action) {
        const snapshot = {
            action,
            timestamp: new Date().toISOString(),
            layers: JSON.parse(JSON.stringify(this.layers)),
            selectedElements: Array.from(this.selectedElements)
        };

        this.history = this.history.slice(0, this.historyIndex + 1);

        this.history.push(snapshot);
        this.historyIndex = this.history.length - 1;

        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const snapshot = this.history[this.historyIndex];
            this.restoreSnapshot(snapshot);
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const snapshot = this.history[this.historyIndex];
            this.restoreSnapshot(snapshot);
            return true;
        }
        return false;
    }

    restoreSnapshot(snapshot) {
        this.layers = JSON.parse(JSON.stringify(snapshot.layers));
        this.selectedElements = new Set(snapshot.selectedElements);
        this.sortByZIndex();
    }

    getCurrentState() {
        return {
            elements: this.layers,
            selectedElements: Array.from(this.selectedElements)
        };
    }

    loadState(state) {
        this.layers = state.elements || [];
        this.selectedElements = new Set(state.selectedElements || []);
        this.sortByZIndex();
        this.history = [];
        this.historyIndex = -1;
    }

    getRenderableLayers() {
        return [...this.layers].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
    }
}

window.LayerManager = LayerManager;
