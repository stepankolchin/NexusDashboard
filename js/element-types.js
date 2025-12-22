class ElementTypes {
    static SHAPE = 'shape';
    static TEXT = 'text';
    static STICKY = 'sticky';
    static IMAGE = 'image';
    static FILE = 'file';
    static DRAWING = 'drawing';
    static CONNECTOR = 'connector';
    static GROUP = 'group';

    static SHAPES = {
        RECTANGLE: 'rectangle',
        CIRCLE: 'circle',
        TRIANGLE: 'triangle',
        STAR: 'star',
        ARROW: 'arrow',
        LINE: 'line'
    };

    static getDefaultProperties(type) {
        const defaults = {
            [this.SHAPE]: {
                shape: this.SHAPES.RECTANGLE,
                x: 100,
                y: 100,
                width: 100,
                height: 100,
                fillColor: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 2,
                rotation: 0
            },
            [this.TEXT]: {
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                text: 'New Text',
                fontSize: 16,
                fontFamily: 'Arial',
                fontColor: '#000000',
                bold: false,
                italic: false,
                underline: false,
                align: 'left',
                rotation: 0
            },
            [this.STICKY]: {
                x: 100,
                y: 100,
                width: 150,
                height: 150,
                text: 'Sticky Note',
                backgroundColor: '#ffff88',
                textColor: '#000000',
                fontSize: 14,
                rotation: 0
            },
            [this.IMAGE]: {
                x: 100,
                y: 100,
                width: 200,
                height: 200,
                src: '',
                alt: 'Image',
                rotation: 0
            },
            [this.FILE]: {
                x: 100,
                y: 100,
                width: 120,
                height: 80,
                fileId: null,
                fileName: '',
                fileType: '',
                fileSize: 0,
                previewUrl: '',
                rotation: 0
            },
            [this.DRAWING]: {
                x: 100,
                y: 100,
                width: 200,
                height: 200,
                paths: [],
                strokeColor: '#000000',
                strokeWidth: 2,
                fillColor: 'transparent'
            },
            [this.CONNECTOR]: {
                x: 100,
                y: 100,
                width: 200,
                height: 2,
                startElement: null,
                endElement: null,
                startPoint: { x: 0, y: 0 },
                endPoint: { x: 200, y: 0 },
                strokeColor: '#000000',
                strokeWidth: 2,
                strokeStyle: 'solid',
                arrowStart: false,
                arrowEnd: true
            },
            [this.GROUP]: {
                x: 100,
                y: 100,
                width: 200,
                height: 200,
                children: [],
                backgroundColor: 'transparent',
                borderColor: '#cccccc',
                borderWidth: 1
            }
        };

        return defaults[type] ? { ...defaults[type] } : {};
    }

    static validateProperties(type, properties) {
        const requiredFields = {
            [this.SHAPE]: ['shape', 'x', 'y', 'width', 'height'],
            [this.TEXT]: ['x', 'y', 'width', 'height', 'text'],
            [this.STICKY]: ['x', 'y', 'width', 'height', 'text'],
            [this.IMAGE]: ['x', 'y', 'width', 'height'],
            [this.FILE]: ['x', 'y', 'width', 'height'],
            [this.DRAWING]: ['x', 'y', 'width', 'height', 'paths'],
            [this.CONNECTOR]: ['x', 'y', 'startPoint', 'endPoint'],
            [this.GROUP]: ['x', 'y', 'width', 'height']
        };

        const required = requiredFields[type];
        if (!required) return false;

        return required.every(field => properties.hasOwnProperty(field));
    }

    // Отрисовка элемента
    static renderElement(ctx, element) {
        const { type, properties } = element;

        // Сохранение контекста только при необходимости вращения
        const needsRotation = properties.rotation && properties.rotation !== 0;

        if (needsRotation) {
            ctx.save();
            ctx.translate(properties.x + properties.width / 2, properties.y + properties.height / 2);
            ctx.rotate((properties.rotation * Math.PI) / 180);
            ctx.translate(-(properties.x + properties.width / 2), -(properties.y + properties.height / 2));
        }

        switch (type) {
            case this.SHAPE:
                console.log('Rendering SHAPE element with properties:', properties);
                this.renderShape(ctx, properties);
                break;
            case this.TEXT:
                this.renderText(ctx, properties);
                break;
            case this.STICKY:
                this.renderSticky(ctx, properties);
                break;
            case this.IMAGE:
                this.renderImage(ctx, properties);
                break;
            case this.FILE:
                this.renderFile(ctx, properties);
                break;
            case this.DRAWING:
                this.renderDrawing(ctx, properties);
                break;
            case this.CONNECTOR:
                this.renderConnector(ctx, properties);
                break;
            case this.GROUP:
                this.renderGroup(ctx, properties);
                break;
        }

        if (needsRotation) {
            ctx.restore();
        }
    }

    static renderShape(ctx, props) {
        // Отрисовка фигуры
        const strokeColor = props.strokeColor || '#000000';
        const lineWidth = props.strokeWidth || 2;
        const fillColor = props.fillColor || '#ffffff';

        // Оптимизация: установка свойств только при изменении
        if (ctx.strokeStyle !== strokeColor) ctx.strokeStyle = strokeColor;
        if (ctx.lineWidth !== lineWidth) ctx.lineWidth = lineWidth;
        if (ctx.fillStyle !== fillColor) ctx.fillStyle = fillColor;

        switch (props.shape) {
            case this.SHAPES.RECTANGLE:
                ctx.beginPath();
                ctx.rect(props.x, props.y, props.width, props.height);
                ctx.fill();
                ctx.stroke();
                break;

            case this.SHAPES.CIRCLE:
                ctx.beginPath();
                ctx.arc(props.x + props.width / 2, props.y + props.height / 2,
                       Math.min(props.width, props.height) / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;

            case this.SHAPES.TRIANGLE:
                ctx.beginPath();
                ctx.moveTo(props.x + props.width / 2, props.y);
                ctx.lineTo(props.x, props.y + props.height);
                ctx.lineTo(props.x + props.width, props.y + props.height);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case this.SHAPES.STAR:
                this.renderStar(ctx, props);
                break;

            case this.SHAPES.LINE:
                // Отрисовка линии
                ctx.beginPath();
                if (props.startPoint && props.endPoint) {
                    ctx.moveTo(props.startPoint.x, props.startPoint.y);
                    ctx.lineTo(props.endPoint.x, props.endPoint.y);
                } else {
                    // Резервный вариант для совместимости
                    ctx.moveTo(props.x, props.y);
                    ctx.lineTo(props.x + props.width, props.y + props.height);
                }
                ctx.stroke();
                break;

            case 'drawing':
                // Отрисовка свободного рисования
                if (!props.paths || !Array.isArray(props.paths)) break;

                ctx.strokeStyle = props.strokeColor || '#000000';
                ctx.lineWidth = props.strokeWidth || 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                for (const path of props.paths) {
                    if (!path.points || path.points.length < 2) continue;

                    ctx.beginPath();
                    ctx.moveTo(path.points[0].x, path.points[0].y);

                    for (let i = 1; i < path.points.length; i++) {
                        ctx.lineTo(path.points[i].x, path.points[i].y);
                    }

                    ctx.stroke();
                }
                break;

            case this.SHAPES.ARROW:
                ctx.beginPath();
                if (props.startPoint && props.endPoint) {
                    ctx.moveTo(props.startPoint.x, props.startPoint.y);
                    ctx.lineTo(props.endPoint.x, props.endPoint.y);
                    ctx.stroke();

                    this.drawArrow(ctx, props.endPoint, props.startPoint, false);
                } else {
                    ctx.moveTo(props.x, props.y);
                    ctx.lineTo(props.x + props.width, props.y + props.height);
                    ctx.stroke();

                    const endPoint = { x: props.x + props.width, y: props.y + props.height };
                    const startPoint = { x: props.x, y: props.y };
                    this.drawArrow(ctx, endPoint, startPoint, false);
                }
                break;

            default:
                // Неизвестный тип фигуры
                break;
        }
    }

    static renderStar(ctx, props) {
        const spikes = 5;
        const outerRadius = Math.min(props.width, props.height) / 2;
        const innerRadius = outerRadius * 0.5;
        const centerX = props.x + props.width / 2;
        const centerY = props.y + props.height / 2;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    static renderText(ctx, props) {
        ctx.font = `${props.bold ? 'bold ' : ''}${props.italic ? 'italic ' : ''}${props.fontSize || 16}px ${props.fontFamily || 'Arial'}`;
        ctx.fillStyle = props.fontColor || '#000000';
        ctx.textAlign = props.align || 'left';

        const words = props.text.split(' ');
        let line = '';
        let y = props.y + props.fontSize;

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > props.width && i > 0) {
                ctx.fillText(line, props.x, y);
                line = words[i] + ' ';
                y += props.fontSize * 1.2;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, props.x, y);

        if (props.underline) {
            const metrics = ctx.measureText(props.text);
            ctx.beginPath();
            ctx.moveTo(props.x, y + 2);
            ctx.lineTo(props.x + metrics.width, y + 2);
            ctx.stroke();
        }
    }

    static renderSticky(ctx, props) {
        ctx.fillStyle = props.backgroundColor || '#ffff88';
        ctx.fillRect(props.x, props.y, props.width, props.height);

        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(props.x, props.y, props.width, props.height);

        ctx.fillStyle = props.textColor || '#000000';
        ctx.font = `${props.fontSize || 14}px Arial`;
        ctx.textAlign = 'left';

        const lines = props.text.split('\n');
        let y = props.y + 20;

        for (const line of lines) {
            ctx.fillText(line, props.x + 10, y);
            y += props.fontSize + 5;
        }
    }

    static renderImage(ctx, props) {
        if (props.imageElement && props.imageElement.complete && props.imageElement.naturalHeight !== 0) {
            ctx.drawImage(props.imageElement, props.x, props.y, props.width, props.height);
        } else if (props.src) {
            if (!props.imageElement) {
                props.imageElement = new Image();
                props.imageElement.crossOrigin = 'anonymous';
                props.imageElement.onload = () => {
                    if (window.whiteboard) {
                        window.whiteboard.render();
                    }
                };
                props.imageElement.onerror = () => {
                    console.error('Failed to load image:', props.src);
                };
                props.imageElement.src = props.src;
            }

            if (!props.imageElement || !props.imageElement.complete) {
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(props.x, props.y, props.width, props.height);
                ctx.strokeStyle = '#cccccc';
                ctx.strokeRect(props.x, props.y, props.width, props.height);

                ctx.fillStyle = '#666666';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Loading...', props.x + props.width / 2, props.y + props.height / 2);
            }
        } else {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(props.x, props.y, props.width, props.height);
            ctx.strokeStyle = '#cccccc';
            ctx.strokeRect(props.x, props.y, props.width, props.height);

            ctx.fillStyle = '#666666';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No Image', props.x + props.width / 2, props.y + props.height / 2);
        }
    }

    static renderFile(ctx, props) {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(props.x, props.y, props.width, props.height);

        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(props.x, props.y, props.width, props.height);

        ctx.fillStyle = '#666666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(props.fileName || 'File', props.x + props.width / 2, props.y + props.height / 2 + 5);

        if (props.fileSize) {
            const sizeText = this.formatFileSize(props.fileSize);
            ctx.font = '8px Arial';
            ctx.fillText(sizeText, props.x + props.width / 2, props.y + props.height / 2 + 15);
        }
    }

    static renderDrawing(ctx, props) {
        if (!props.paths || !Array.isArray(props.paths)) return;

        ctx.strokeStyle = props.strokeColor || '#000000';
        ctx.lineWidth = props.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const path of props.paths) {
            if (!path.points || path.points.length < 2) continue;

            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);

            for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(path.points[i].x, path.points[i].y);
            }

            ctx.stroke();
        }
    }

    static renderConnector(ctx, props) {
        ctx.strokeStyle = props.strokeColor || '#000000';
        ctx.lineWidth = props.strokeWidth || 2;

        if (props.strokeStyle === 'dashed') {
            ctx.setLineDash([5, 5]);
        } else if (props.strokeStyle === 'dotted') {
            ctx.setLineDash([2, 2]);
        } else {
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(props.startPoint.x, props.startPoint.y);
        ctx.lineTo(props.endPoint.x, props.endPoint.y);
        ctx.stroke();

        if (props.arrowStart) {
            this.drawArrow(ctx, props.startPoint, props.endPoint, true);
        }
        if (props.arrowEnd) {
            this.drawArrow(ctx, props.endPoint, props.startPoint, false);
        }

        ctx.setLineDash([]);
    }

    static drawArrow(ctx, tip, base, isStart) {
        const angle = Math.atan2(tip.y - base.y, tip.x - base.x);
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6; // 30 deg

        const x1 = tip.x - arrowLength * Math.cos(angle - arrowAngle);
        const y1 = tip.y - arrowLength * Math.sin(angle - arrowAngle);
        const x2 = tip.x - arrowLength * Math.cos(angle + arrowAngle);
        const y2 = tip.y - arrowLength * Math.sin(angle + arrowAngle);

        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(x1, y1);
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    static renderGroup(ctx, props) {
        // Draw group border
        ctx.strokeStyle = props.borderColor || '#cccccc';
        ctx.lineWidth = props.borderWidth || 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(props.x, props.y, props.width, props.height);
        ctx.setLineDash([]);
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    static isPointInElement(x, y, element) {
        const { properties } = element;

        // Обратное вращение для точки
        if (properties.rotation) {
            const centerX = properties.x + properties.width / 2;
            const centerY = properties.y + properties.height / 2;
            const angle = -(properties.rotation * Math.PI) / 180;

            const translatedX = x - centerX;
            const translatedY = y - centerY;

            const rotatedX = translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
            const rotatedY = translatedX * Math.sin(angle) + translatedY * Math.cos(angle);

            x = rotatedX + centerX;
            y = rotatedY + centerY;
        }

        return x >= properties.x &&
               x <= properties.x + properties.width &&
               y >= properties.y &&
               y <= properties.y + properties.height;
    }

    static getElementBounds(element) {
        const { properties } = element;
        return {
            x: properties.x,
            y: properties.y,
            width: properties.width,
            height: properties.height
        };
    }
}

window.ElementTypes = ElementTypes;
