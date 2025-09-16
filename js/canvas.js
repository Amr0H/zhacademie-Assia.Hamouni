    document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initializeAuth();
    } catch (error) {
    }

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');

    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenuBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        document.addEventListener('click', function(event) {
            if (!mobileMenuBtn.contains(event.target) && !navMenu.contains(event.target)) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    let canvas;
    let isDrawing = false;
    let currentCanvasId = null;
    let savedCanvases = [];
    let trashedCanvases = [];
    let contextMenuTarget = null;
    let activeTextObject = null;
    let history = [];
    let historyIndex = -1;
    let isUndoRedoAction = false;
    let contextMenuPosition = { x: 0, y: 0 };
    let lastCursorPosition = { x: 100, y: 100 };

    const canvasWrapper = document.querySelector('.canvas-wrapper');
    const fabricCanvasElement = document.getElementById('fabricCanvas');
    const canvasPageTitle = document.getElementById('canvasPageTitle');
    
    const canvasContextMenu = document.getElementById('canvasContextMenu');
    
    const selectBtn = document.getElementById('selectBtn');
    const panBtn = document.getElementById('panBtn');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    const imageUpload = document.getElementById('imageUpload');
    const saveCanvasBtn = document.getElementById('saveCanvasBtn');
    const newCanvasBtn = document.getElementById('newCanvasBtn');
    const trashBtn = document.getElementById('trashBtn');
    
    const saveCanvasModal = document.getElementById('saveCanvasModal');
    const trashModal = document.getElementById('trashModal');
    const canvasGalleryModal = document.getElementById('canvasGalleryModal');
    const contextMenu = document.getElementById('contextMenu');
    const saveCanvasForm = document.getElementById('saveCanvasForm');
    const closeSaveModal = document.getElementById('closeSaveModal');
    const closeTrashModal = document.getElementById('closeTrashModal');
    const closeGalleryModal = document.getElementById('closeGalleryModal');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const canvasGalleryBtn = document.getElementById('canvasGalleryBtn');
    const newCanvasFromGallery = document.getElementById('newCanvasFromGallery');
    const gallerySearch = document.getElementById('gallerySearch');
    const canvasGalleryGrid = document.getElementById('canvasGalleryGrid');
    const galleryEmpty = document.getElementById('galleryEmpty');
    const cancelSaveBtn = document.getElementById('cancelSaveBtn');
    const deleteCanvasBtn = document.getElementById('deleteCanvasBtn');
    const emptyTrashBtn = document.getElementById('emptyTrashBtn');
    
    const textToolbar = document.getElementById('textToolbar');
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const textColorPicker = document.getElementById('textColorPicker');
    const alignLeftBtn = document.getElementById('alignLeftBtn');
    const alignCenterBtn = document.getElementById('alignCenterBtn');
    const alignRightBtn = document.getElementById('alignRightBtn');

    const shapeToolbar = document.getElementById('shapeToolbar');
    const shapeColorPicker = document.getElementById('shapeColorPicker');
    const strokeColorPicker = document.getElementById('strokeColorPicker');
    const strokeWidthSlider = document.getElementById('strokeWidthSlider');
    const strokeWidthValue = document.getElementById('strokeWidthValue');
    
    let activeShapeObject = null;

    initializeCanvas();
    await loadSavedCanvases();
    showCanvasGallery();

    function initializeCanvas() {
        const containerWidth = canvasWrapper.clientWidth;
        const containerHeight = canvasWrapper.clientHeight;
        
        canvas = new fabric.Canvas('fabricCanvas', {
            width: containerWidth,
            height: containerHeight,
            backgroundColor: 'white',
            selection: true
        });

        canvas.on('mouse:down', (e) => {
            if (e.target && e.target.type === 'i-text' && e.target.text) {
                const textObj = e.target;
                if (textObj.text.startsWith('☐') || textObj.text.startsWith('☑')) {
                    const pointer = canvas.getPointer(e.e);
                    const objectBounds = textObj.getBoundingRect();
                    const relativeX = pointer.x - objectBounds.left;
                    
                    const fontSize = textObj.fontSize || 20;
                    const checkboxWidth = fontSize * 1.2;
                    
                    if (relativeX >= 0 && relativeX <= checkboxWidth) {
                        const currentText = textObj.text;
                        if (currentText.startsWith('☐')) {
                            textObj.set({
                                text: currentText.replace('☐', '☑'),
                                fill: '#10b981'
                            });
                        } else if (currentText.startsWith('☑')) {
                            textObj.set({
                                text: currentText.replace('☑', '☐'),
                                fill: '#374151'
                            });
                        }
                        canvas.renderAll();
                        saveState();
                        
                        e.e.preventDefault();
                        e.e.stopPropagation();
                        return;
                    }
                }
            }
        });

        canvas.on('text:editing', (e) => {
            const textObj = e.target;
            if (textObj && textObj.text) {
                const text = textObj.text;
                let protectedLength = 0;
                
                if (text.startsWith('☐') || text.startsWith('☑')) {
                    protectedLength = 2;
                } else if (text.startsWith('• ')) {
                    protectedLength = 2;
                } else if (text.match(/^\d+\. /)) {
                    const match = text.match(/^(\d+\. )/);
                    protectedLength = match ? match[1].length : 0;
                }
                
                if (protectedLength > 0) {
                    if (textObj.selectionStart < protectedLength) {
                        textObj.selectionStart = protectedLength;
                    }
                    if (textObj.selectionEnd < protectedLength) {
                        textObj.selectionEnd = protectedLength;
                    }
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            const activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'i-text' && activeObject.isEditing) {
                const text = activeObject.text;
                if (text) {
                    let protectedLength = 0;
                    
                    if (text.startsWith('☐') || text.startsWith('☑')) {
                        protectedLength = 2;
                    } else if (text.startsWith('• ')) {
                        protectedLength = 2;
                    } else if (text.match(/^\d+\. /)) {
                        const match = text.match(/^(\d+\. )/);
                        protectedLength = match ? match[1].length : 0;
                    }
                    
                    if (protectedLength > 0) {
                        if ((e.key === 'Backspace' && activeObject.selectionStart <= protectedLength) ||
                            (e.key === 'Delete' && activeObject.selectionStart < protectedLength) ||
                            (e.key === 'ArrowLeft' && activeObject.selectionStart <= protectedLength - 1) ||
                            (e.key === 'Home')) {
                            e.preventDefault();
                            if (e.key === 'ArrowLeft' || e.key === 'Home') {
                                activeObject.selectionStart = protectedLength;
                                activeObject.selectionEnd = protectedLength;
                            }
                        }
                    }
                    
                    if (e.key === 'Enter') {
                        if (text.startsWith('• ')) {
                            e.preventDefault();
                            const currentText = activeObject.text;
                            const newText = currentText + '\n• ';
                            activeObject.set('text', newText);
                            activeObject.selectionStart = newText.length;
                            activeObject.selectionEnd = newText.length;
                            canvas.renderAll();
                        } else if (text.match(/^\d+\. /)) {
                            e.preventDefault();
                            const lines = activeObject.text.split('\n');
                            const lastLine = lines[lines.length - 1];
                            const match = lastLine.match(/^(\d+)\. /);
                            if (match) {
                                const nextNumber = parseInt(match[1]) + 1;
                                const currentText = activeObject.text;
                                const newText = currentText + '\n' + nextNumber + '. ';
                                activeObject.set('text', newText);
                                activeObject.selectionStart = newText.length;
                                activeObject.selectionEnd = newText.length;
                                canvas.renderAll();
                            }
                        }
                    }
                }
            }
        });

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', clearSelection);
        canvas.on('object:modified', (e) => {
            constrainObjectToBounds(e.target);
            hideRotationIndicator();
            if (!isUndoRedoAction) {
                saveState();
            }
        });
        canvas.on('object:moving', (e) => {
            constrainObjectToBounds(e.target);
        });
        canvas.on('object:scaling', (e) => {
            constrainObjectToBounds(e.target);
        });
        canvas.on('object:rotating', (e) => {
            constrainObjectToBounds(e.target);
            showRotationIndicator(e.target);
        });
        canvas.on('object:added', (e) => {
            constrainObjectToBounds(e.target);
            if (!isUndoRedoAction) {
                saveState();
            }
        });
        canvas.on('object:removed', (e) => {
            if (!isUndoRedoAction) {
                saveState();
            }
        });
        canvas.on('path:created', (e) => {
            if (e.path) {
                e.path.set({
                    selectable: true,
                    evented: true
                });
                canvas.setActiveObject(e.path);
                canvas.renderAll();
            }
        });
        canvas.on('text:editing:entered', (e) => {
            activeTextObject = e.target;
            if (!isEmoji(e.target.text)) {
                showTextToolbar(e.target);
            }
        });
        canvas.on('text:editing:exited', (e) => {
            hideTextToolbar();
            activeTextObject = null;
            if (e.target && e.target.fontFamily === 'Courier New') {
                applySyntaxHighlighting(e.target);
            }
        });
        canvas.on('selection:cleared', () => {
            hideTextToolbar();
            hideRotationIndicator();
            activeTextObject = null;
        });

        canvas.on('mouse:wheel', function(opt) {
            const delta = opt.e.deltaY;
            let zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 3) zoom = 3;
            if (zoom < 0.1) zoom = 0.1;
            canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            updateZoomIndicator();
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });

        canvas.on('mouse:move', function(opt) {
            const pointer = canvas.getPointer(opt.e);
            lastCursorPosition.x = pointer.x;
            lastCursorPosition.y = pointer.y;
        });

        canvas.on('mouse:up', function() {
            hideRotationIndicator();
        });

        saveState();
        selectBtn.classList.add('active');
        updatePageTitle('Untitled Canvas');
        updateZoomIndicator();
        
        setupContextMenu();
        setupToolbarEvents();
        setupTextToolbar();
        setupShapeToolbar();
        setupModals();
        setupKeyboardShortcuts();
        setupFullscreenEvents();
    }

    function setupFullscreenEvents() {
        document.addEventListener('fullscreenchange', () => {
            const fullscreenIcon = fullscreenBtn.querySelector('i');
            if (!document.fullscreenElement) {
                fullscreenIcon.className = 'fas fa-expand';
                fullscreenBtn.title = 'Toggle Fullscreen';
                setTimeout(() => {
                    resizeCanvas();
                }, 100);
            }
        });
    }

    function setupKeyboardShortcuts() {
        let canvasFocused = false;

        canvasWrapper.addEventListener('mouseenter', () => {
            canvasFocused = true;
        });

        canvasWrapper.addEventListener('mouseleave', () => {
            canvasFocused = false;
        });

        canvasWrapper.addEventListener('click', () => {
            canvasFocused = true;
        });

        document.addEventListener('keydown', (e) => {
            const activeElement = document.activeElement;
            const isInputFocused = activeElement.tagName === 'INPUT' || 
                                 activeElement.tagName === 'TEXTAREA' || 
                                 activeElement.contentEditable === 'true';

            if (!isInputFocused && canvasFocused) {
                if (e.ctrlKey && e.key.toLowerCase() === 'a') {
                    e.preventDefault();
                    e.stopPropagation();
                    selectAllObjects();
                    return false;
                } else if (e.ctrlKey && e.key.toLowerCase() === 'd') {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteSelectedObjects();
                    return false;
                }
            }
        }, true);
    }

    function selectAllObjects() {
        const allObjects = canvas.getObjects();
        if (allObjects.length > 0) {
            const selection = new fabric.ActiveSelection(allObjects, {
                canvas: canvas
            });
            canvas.setActiveObject(selection);
            canvas.renderAll();
        }
    }

    function deleteSelectedObjects() {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            activeObjects.forEach(obj => {
                canvas.remove(obj);
            });
            canvas.discardActiveObject();
            canvas.renderAll();
            saveState();
        }
    }

    function setupContextMenu() {
        canvasWrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showCanvasContextMenu(e);
        });

        document.addEventListener('click', (e) => {
            if (!canvasContextMenu.contains(e.target)) {
                hideCanvasContextMenu();
            }
        });

        document.getElementById('addTextMenu').addEventListener('click', () => {
        });

        document.querySelectorAll('.context-submenu .text-type-item').forEach(item => {
            item.addEventListener('click', () => {
                const textType = item.dataset.type;
                const textInfo = getTextTypeInfo(textType);
                
                let textContent = 'Text';
                let placeholderText = 'Text';
                
                if (textType === 'text') {
                    textContent = 'Text';
                    placeholderText = 'Text';
                } else if (textType === 'heading1') {
                    textContent = 'Heading 1';
                    placeholderText = 'Heading 1';
                } else if (textType === 'heading2') {
                    textContent = 'Heading 2';
                    placeholderText = 'Heading 2';
                } else if (textType === 'heading3') {
                    textContent = 'Heading 3';
                    placeholderText = 'Heading 3';
                } else if (textType === 'todolist') {
                    textContent = '☐ To-do';
                    placeholderText = 'To-do';
                } else if (textType === 'bulletlist') {
                    textContent = '• Bulleted list';
                    placeholderText = 'Bulleted list';
                } else if (textType === 'numberlist') {
                    textContent = '1. Numbered list';
                    placeholderText = 'Numbered list';
                } else if (textType === 'togglelist') {
                    textContent = '▶ Toggle list';
                    placeholderText = 'Toggle list';
                } else if (textType === 'quote') {
                    textContent = '" Quote';
                    placeholderText = 'Quote';
                } else if (textType === 'code') {
                    textContent = 'Code';
                    placeholderText = 'Code';
                } else if (textType === 'callout') {
                    textContent = '💡 Callout';
                    placeholderText = 'Callout';
                } else if (textType === 'equation') {
                    textContent = 'E = mc²';
                    placeholderText = 'E = mc²';
                }

                const text = new fabric.IText(textContent, {
                    left: contextMenuPosition.x,
                    top: contextMenuPosition.y,
                    fontFamily: textInfo.fontFamily || 'Arial',
                    fontSize: textInfo.fontSize || 20,
                    fill: textInfo.color || '#000000',
                    fontWeight: textInfo.fontWeight || 'normal',
                    fontStyle: textInfo.fontStyle || 'normal',
                    backgroundColor: textInfo.backgroundColor || 'transparent',
                    selectable: true,
                    editable: true
                });

                text.isPlaceholder = true;
                text.placeholderText = placeholderText;
                text.textType = textType;

                canvas.add(text);
                canvas.setActiveObject(text);
                canvas.renderAll();
                
                if (textType === 'todolist') {
                    setupTodoInteraction(text);
                } else if (textType === 'bulletlist') {
                    setupListProtection(text, 'bullet');
                } else if (textType === 'numberlist') {
                    setupListProtection(text, 'number');
                }

                setupPlaceholderHandling(text);
                
                setTimeout(() => {
                    text.enterEditing();
                }, 100);
                saveState();
                hideCanvasContextMenu();
            });
        });

        document.getElementById('addRectangleMenu').addEventListener('click', () => {
            const rect = new fabric.Rect({
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                width: 100,
                height: 80,
                fill: '#3b82f6',
                stroke: '#1e40af',
                strokeWidth: 2
            });
            canvas.add(rect);
            canvas.setActiveObject(rect);
            canvas.renderAll();
            hideCanvasContextMenu();
        });

        document.getElementById('addCircleMenu').addEventListener('click', () => {
            const circle = new fabric.Circle({
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                radius: 50,
                fill: '#10b981',
                stroke: '#047857',
                strokeWidth: 2
            });
            canvas.add(circle);
            canvas.setActiveObject(circle);
            canvas.renderAll();
            hideCanvasContextMenu();
        });

        document.getElementById('addTriangleMenu').addEventListener('click', () => {
            const triangle = new fabric.Triangle({
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                width: 100,
                height: 100,
                fill: '#f59e0b',
                stroke: '#d97706',
                strokeWidth: 2
            });
            canvas.add(triangle);
            canvas.setActiveObject(triangle);
            canvas.renderAll();
            hideCanvasContextMenu();
        });

        document.getElementById('addLineMenu').addEventListener('click', () => {
            const line = new fabric.Line([contextMenuPosition.x, contextMenuPosition.y, contextMenuPosition.x + 150, contextMenuPosition.y], {
                stroke: '#000000',
                strokeWidth: 3
            });
            canvas.add(line);
            canvas.setActiveObject(line);
            canvas.renderAll();
            hideCanvasContextMenu();
        });

        document.getElementById('addArrowMenu').addEventListener('click', () => {
            const arrowPath = new fabric.Path('M 0 10 L 80 10 L 70 0 L 100 15 L 70 30 L 80 20 L 0 20 Z', {
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                fill: '#3b82f6',
                stroke: '#1e40af',
                strokeWidth: 1,
                scaleX: 1,
                scaleY: 1
            });
            canvas.add(arrowPath);
            canvas.setActiveObject(arrowPath);
            canvas.renderAll();
            hideCanvasContextMenu();
            saveState();
        });

        document.getElementById('addPolygonMenu').addEventListener('click', () => {
            const polygonPath = new fabric.Path('M 50 0 L 90 35 L 75 90 L 25 90 L 10 35 Z', {
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                fill: '#3b82f6',
                stroke: '#1e40af',
                strokeWidth: 2,
                scaleX: 1,
                scaleY: 1
            });
            canvas.add(polygonPath);
            canvas.setActiveObject(polygonPath);
            canvas.renderAll();
            hideCanvasContextMenu();
            saveState();
        });

        document.getElementById('addStarMenu').addEventListener('click', () => {
            const starPath = new fabric.Path('M 50 0 L 61 35 L 98 35 L 68 57 L 79 91 L 50 70 L 21 91 L 32 57 L 2 35 L 39 35 Z', {
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                fill: '#3b82f6',
                stroke: '#1e40af',
                strokeWidth: 2,
                scaleX: 1,
                scaleY: 1
            });
            canvas.add(starPath);
            canvas.setActiveObject(starPath);
            canvas.renderAll();
            hideCanvasContextMenu();
            saveState();
        });

        document.getElementById('addHeartMenu').addEventListener('click', () => {
            const heartPath = new fabric.Path('M 50 85 C 20 60, -5 30, 15 15 C 30 0, 45 5, 50 25 C 55 5, 70 0, 85 15 C 105 30, 80 60, 50 85 Z', {
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                fill: '#e11d48',
                stroke: '#be123c',
                strokeWidth: 2,
                scaleX: 1,
                scaleY: 1
            });
            canvas.add(heartPath);
            canvas.setActiveObject(heartPath);
            canvas.renderAll();
            hideCanvasContextMenu();
            saveState();
        });

        document.getElementById('addImageMenu').addEventListener('click', () => {
            lastCursorPosition.x = contextMenuPosition.x;
            lastCursorPosition.y = contextMenuPosition.y;
            imageUpload.click();
            hideCanvasContextMenu();
        });

        document.getElementById('freeDrawMenu').addEventListener('click', () => {
            setActiveTool('draw');
            hideCanvasContextMenu();
        });

        document.getElementById('clearCanvasMenu').addEventListener('click', () => {
            const clearCanvasModal = document.getElementById('clearCanvasModal');
            if (clearCanvasModal) {
                clearCanvasModal.style.display = 'flex';
            }
            hideCanvasContextMenu();
        });

        document.querySelectorAll('.emoji-item').forEach(item => {
            item.addEventListener('click', () => {
                const emoji = item.dataset.emoji;
                const text = new fabric.IText(emoji, {
                    left: contextMenuPosition.x,
                    top: contextMenuPosition.y,
                    fontSize: 40,
                    fontFamily: 'Arial'
                });
                canvas.add(text);
                canvas.setActiveObject(text);
                canvas.renderAll();
                hideCanvasContextMenu();
            });
        });
    }

    function showCanvasContextMenu(e) {
        const rect = canvas.getElement().getBoundingClientRect();
        contextMenuPosition.x = e.clientX - rect.left;
        contextMenuPosition.y = e.clientY - rect.top;
        
        canvasContextMenu.style.display = 'block';
        canvasContextMenu.style.left = e.pageX + 'px';
        canvasContextMenu.style.top = e.pageY + 'px';
    }

    function hideCanvasContextMenu() {
        canvasContextMenu.style.display = 'none';
    }

    function setupToolbarEvents() {
        selectBtn.addEventListener('click', () => {
            setActiveTool('select');
        });

        panBtn.addEventListener('click', () => {
            setActiveTool('pan');
        });

        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);

        deleteBtn.addEventListener('click', () => {
            const activeObjects = canvas.getActiveObjects();
            if (activeObjects.length > 0) {
                activeObjects.forEach(obj => canvas.remove(obj));
                canvas.discardActiveObject();
                canvas.renderAll();
            }
        });

        zoomInBtn.addEventListener('click', () => {
            zoomCanvas(1.1);
        });

        zoomOutBtn.addEventListener('click', () => {
            zoomCanvas(0.9);
        });

        resetZoomBtn.addEventListener('click', () => {
            resetZoom();
        });

        fullscreenBtn.addEventListener('click', () => {
            toggleFullscreen();
        });

        saveCanvasBtn.addEventListener('click', async () => {
            if (currentCanvasId) {
                try {
                    const canvasData = await getCanvasById(currentCanvasId);
                    if (canvasData) {
                        const originalHTML = saveCanvasBtn.innerHTML;
                        saveCanvasBtn.disabled = true;
                        saveCanvasBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        
                        await saveCanvas(canvasData.name, canvasData.description);
                        
                        saveCanvasBtn.disabled = false;
                        saveCanvasBtn.innerHTML = originalHTML;
                    }
                } catch (error) {
                    console.error('Save error:', error);
                    showNotification('Failed to save canvas', 'error');
                    saveCanvasBtn.disabled = false;
                    saveCanvasBtn.innerHTML = '<i class="fas fa-save"></i>';
                }
            } else {
                if (saveCanvasModal) {
                    saveCanvasModal.classList.add('active');
                }
            }
        });

        newCanvasBtn.addEventListener('click', () => {
            const newCanvasModal = document.getElementById('newCanvasModal');
            if (newCanvasModal) {
                newCanvasModal.style.display = 'flex';
            }
        });

        trashBtn.addEventListener('click', () => {
            showTrashModal();
        });

        canvasGalleryBtn.addEventListener('click', () => {
            showCanvasGallery();
        });

        imageUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try { 
                    showLoading();
                    const imageUrl = await uploadImageToCloudinary(file);
                    
                    fabric.Image.fromURL(imageUrl, (img) => {
                        img.set({
                            left: lastCursorPosition.x,
                            top: lastCursorPosition.y,
                            scaleX: 0.5,
                            scaleY: 0.5
                        });
                        canvas.add(img);
                        canvas.setActiveObject(img);
                        canvas.renderAll();
                        hideLoading();
                        saveState();
                    }, {
                        crossOrigin: 'anonymous'
                    });
                } catch (error) {
                    console.error('Error uploading image:', error);
                    showNotification('Error uploading image', 'error');
                    hideLoading();
                }
            }
        });
    }

    function setupTextToolbar() {
        const fontFamilySelect = document.getElementById('fontFamilySelect');
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        const boldBtn = document.getElementById('boldBtn');
        const italicBtn = document.getElementById('italicBtn');
        const underlineBtn = document.getElementById('underlineBtn');
        const strikethroughBtn = document.getElementById('strikethroughBtn');
        const textColorPicker = document.getElementById('textColorPicker');
        const textBackgroundPicker = document.getElementById('textBackgroundPicker');

        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', (e) => {
                if (activeTextObject) {
                    activeTextObject.set('fontFamily', e.target.value);
                    canvas.renderAll();
                    saveState();
                }
            });
        }

        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                if (activeTextObject) {
                    activeTextObject.set('fontSize', parseInt(e.target.value));
                    canvas.renderAll();
                    saveState();
                }
            });
        }

        if (boldBtn) {
            boldBtn.addEventListener('click', () => {
                if (activeTextObject) {
                    const isBold = activeTextObject.fontWeight === 'bold';
                    activeTextObject.set('fontWeight', isBold ? 'normal' : 'bold');
                    canvas.renderAll();
                    updateTextToolbarState();
                    saveState();
                }
            });
        }

        if (italicBtn) {
            italicBtn.addEventListener('click', () => {
                if (activeTextObject) {
                    const isItalic = activeTextObject.fontStyle === 'italic';
                    activeTextObject.set('fontStyle', isItalic ? 'normal' : 'italic');
                    canvas.renderAll();
                    updateTextToolbarState();
                    saveState();
                }
            });
        }

        if (underlineBtn) {
            underlineBtn.addEventListener('click', () => {
                if (activeTextObject) {
                    const isUnderline = activeTextObject.underline;
                    activeTextObject.set('underline', !isUnderline);
                    canvas.renderAll();
                    updateTextToolbarState();
                    saveState();
                }
            });
        }

        if (strikethroughBtn) {
            strikethroughBtn.addEventListener('click', () => {
                if (activeTextObject) {
                    const isStrikethrough = activeTextObject.linethrough;
                    activeTextObject.set('linethrough', !isStrikethrough);
                    canvas.renderAll();
                    updateTextToolbarState();
                    saveState();
                }
            });
        }

        if (textColorPicker) {
            textColorPicker.addEventListener('change', (e) => {
                if (activeTextObject) {
                    activeTextObject.set('fill', e.target.value);
                    canvas.renderAll();
                    saveState();
                }
            });
            textColorPicker.addEventListener('input', (e) => {
                if (activeTextObject) {
                    activeTextObject.set('fill', e.target.value);
                    canvas.renderAll();
                }
            });
        }

        if (textBackgroundPicker) {
            textBackgroundPicker.addEventListener('change', (e) => {
                if (activeTextObject) {
                    activeTextObject.set('backgroundColor', e.target.value);
                    canvas.renderAll();
                    saveState();
                }
            });
            textBackgroundPicker.addEventListener('input', (e) => {
                if (activeTextObject) {
                    activeTextObject.set('backgroundColor', e.target.value);
                    canvas.renderAll();
                }
            });
        }
    }

    function setupShapeToolbar() {
        const shapeColorDisplay = document.querySelector('#shapeColorPicker').parentElement.querySelector('.color-display');
        const strokeColorDisplay = document.querySelector('#strokeColorPicker').parentElement.querySelector('.color-display');

        if (shapeColorPicker) {
            const updateShapeColorDisplay = () => {
                if (shapeColorDisplay) {
                    shapeColorDisplay.style.backgroundColor = shapeColorPicker.value;
                }
            };
            updateShapeColorDisplay();

            shapeColorPicker.addEventListener('change', (e) => {
                updateShapeColorDisplay();
                if (activeShapeObject) {
                    activeShapeObject.set('fill', e.target.value);
                    canvas.renderAll();
                    saveState();
                } else if (canvas.isDrawingMode) {
                    canvas.freeDrawingBrush.color = e.target.value;
                }
            });
            shapeColorPicker.addEventListener('input', (e) => {
                updateShapeColorDisplay();
                if (activeShapeObject) {
                    activeShapeObject.set('fill', e.target.value);
                    canvas.renderAll();
                } else if (canvas.isDrawingMode) {
                    canvas.freeDrawingBrush.color = e.target.value;
                }
            });
        }

        if (strokeColorPicker) {
            const updateStrokeColorDisplay = () => {
                if (strokeColorDisplay) {
                    strokeColorDisplay.style.backgroundColor = strokeColorPicker.value;
                }
            };
            updateStrokeColorDisplay();

            strokeColorPicker.addEventListener('change', (e) => {
                updateStrokeColorDisplay();
                if (activeShapeObject) {
                    activeShapeObject.set('stroke', e.target.value);
                    canvas.renderAll();
                    saveState();
                }
            });
            strokeColorPicker.addEventListener('input', (e) => {
                updateStrokeColorDisplay();
                if (activeShapeObject) {
                    activeShapeObject.set('stroke', e.target.value);
                    canvas.renderAll();
                }
            });
        }

        if (strokeWidthSlider) {
            strokeWidthSlider.addEventListener('input', (e) => {
                const width = parseInt(e.target.value);
                strokeWidthValue.textContent = width + 'px';
                if (activeShapeObject) {
                    activeShapeObject.set('strokeWidth', width);
                    canvas.renderAll();
                } else if (canvas.isDrawingMode) {
                    canvas.freeDrawingBrush.width = width;
                }
            });
            strokeWidthSlider.addEventListener('change', (e) => {
                if (activeShapeObject) {
                    saveState();
                }
            });
        }
    }

    function applyTextType(type) {
        if (!activeTextObject) return;

        switch (type) {
            case 'text':
                activeTextObject.set({
                    fontSize: 20,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    textDecoration: '',
                    fontFamily: 'Arial'
                });
                break;
            case 'heading1':
                activeTextObject.set({
                    fontSize: 48,
                    fontWeight: 'bold',
                    fontFamily: 'Arial'
                });
                break;
            case 'heading2':
                activeTextObject.set({
                    fontSize: 36,
                    fontWeight: 'bold',
                    fontFamily: 'Arial'
                });
                break;
            case 'heading3':
                activeTextObject.set({
                    fontSize: 28,
                    fontWeight: 'bold',
                    fontFamily: 'Arial'
                });
                break;
            case 'code':
                activeTextObject.set({
                    fontFamily: 'Courier New',
                    backgroundColor: '#1e1e1e',
                    fill: '#d4d4d4',
                    fontSize: 16,
                    padding: 8
                });
                if (!activeTextObject.text.includes('function') && !activeTextObject.text.includes('const') && !activeTextObject.text.includes('//')) {
                    activeTextObject.set('text', 'function example() {\n    return "Hello World";\n}');
                }
                applySyntaxHighlighting(activeTextObject);
                break;
            case 'quote':
                activeTextObject.set({
                    fontStyle: 'italic',
                    fontSize: 24,
                    fill: '#666666'
                });
                break;
            case 'callout':
                activeTextObject.set({
                    backgroundColor: '#fff3cd',
                    fill: '#856404',
                    fontSize: 18
                });
                break;
            case 'bulletlist':
                activeTextObject.set('text', '• ' + activeTextObject.text.replace(/^• /, ''));
                setTimeout(() => {
                    setupListProtection(activeTextObject, 'bullet');
                }, 100);
                break;
            case 'numberlist':
                activeTextObject.set('text', '1. ' + activeTextObject.text.replace(/^\d+\. /, ''));
                setTimeout(() => {
                    setupListProtection(activeTextObject, 'number');
                }, 100);
                break;
            case 'todolist':
                const todoText = activeTextObject.text.replace(/^[☐☑] /, '');
                activeTextObject.set({
                    text: '☐ ' + todoText,
                    fill: '#374151',
                    selectable: true,
                    editable: true
                });
                setTimeout(() => {
                    setupTodoInteraction(activeTextObject);
                }, 100);
                break;
            case 'togglelist':
                activeTextObject.set('text', '▶ ' + activeTextObject.text.replace(/^[▶▼] /, ''));
                break;
            case 'toggleheading1':
                activeTextObject.set({
                    text: '▶ ' + activeTextObject.text.replace(/^[▶▼] /, ''),
                    fontSize: 48,
                    fontWeight: 'bold'
                });
                break;
            case 'toggleheading2':
                activeTextObject.set({
                    text: '▶ ' + activeTextObject.text.replace(/^[▶▼] /, ''),
                    fontSize: 36,
                    fontWeight: 'bold'
                });
                break;
            case 'toggleheading3':
                activeTextObject.set({
                    text: '▶ ' + activeTextObject.text.replace(/^[▶▼] /, ''),
                    fontSize: 28,
                    fontWeight: 'bold'
                });
                break;
            case 'equation':
                activeTextObject.set({
                    fontFamily: 'Times New Roman',
                    fontSize: 24,
                    backgroundColor: '#f8f9fa'
                });
                break;
        }

        canvas.renderAll();
        updateTextToolbarState();
    }

    function detectTextType(textObj) {
        const text = textObj.text || '';
        const fontSize = textObj.fontSize || 20;
        const fontWeight = textObj.fontWeight || 'normal';
        const fontFamily = textObj.fontFamily || 'Arial';
        const backgroundColor = textObj.backgroundColor;
        const fill = textObj.fill;

        if (text.startsWith('• ')) return 'bulletlist';
        if (text.match(/^\d+\. /)) return 'numberlist';
        if (text.startsWith('☐ ') || text.startsWith('☑ ')) return 'todolist';
        if (text.startsWith('▶ ') || text.startsWith('▼ ')) {
            if (fontSize >= 40) return 'toggleheading1';
            if (fontSize >= 30) return 'toggleheading2';
            if (fontSize >= 25) return 'toggleheading3';
            return 'togglelist';
        }
        
        if (fontFamily === 'Courier New' && (backgroundColor === '#1e1e1e' || backgroundColor === '#2d3748' || backgroundColor === '#f5f5f5')) return 'code';
        if (backgroundColor === '#fff3cd') return 'callout';
        if (fontFamily === 'Times New Roman' && backgroundColor === '#f8f9fa') return 'equation';
        if (textObj.fontStyle === 'italic' && fontSize >= 22) return 'quote';
        
        if (fontWeight === 'bold') {
            if (fontSize >= 40) return 'heading1';
            if (fontSize >= 30) return 'heading2';
            if (fontSize >= 25) return 'heading3';
        }
        
        return 'text';
    }

    function getTextTypeInfo(type) {
        const typeMap = {
            'text': { label: 'Text', icon: 'fas fa-font', fontSize: 20, fontWeight: 'normal' },
            'heading1': { label: 'Heading 1', icon: 'fas fa-heading', fontSize: 48, fontWeight: 'bold' },
            'heading2': { label: 'Heading 2', icon: 'fas fa-heading', fontSize: 36, fontWeight: 'bold' },
            'heading3': { label: 'Heading 3', icon: 'fas fa-heading', fontSize: 28, fontWeight: 'bold' },
            'bulletlist': { label: 'Bulleted list', icon: 'fas fa-list-ul', fontSize: 20, fontWeight: 'normal' },
            'numberlist': { label: 'Numbered list', icon: 'fas fa-list-ol', fontSize: 20, fontWeight: 'normal' },
            'todolist': { label: 'To-do list', icon: 'fas fa-check-square', fontSize: 20, fontWeight: 'normal' },
            'togglelist': { label: 'Toggle list', icon: 'fas fa-caret-right', fontSize: 20, fontWeight: 'normal' },
            'code': { label: 'Code', icon: 'fas fa-code', fontSize: 16, fontWeight: 'normal' },
            'quote': { label: 'Quote', icon: 'fas fa-quote-left', fontSize: 24, fontWeight: 'normal' },
            'callout': { label: 'Callout', icon: 'fas fa-exclamation-circle', fontSize: 18, fontWeight: 'normal' },
            'equation': { label: 'Block equation', icon: 'fas fa-square-root-alt', fontSize: 24, fontWeight: 'normal' }
        };
        return typeMap[type] || typeMap['text'];
    }

    function setupTodoInteraction(textObj) {
        if (!textObj || !textObj.text) return;
        
        textObj.off('mousedown');
        textObj.off('mousedblclick');
        textObj.off('changed');
        textObj.off('editing:entered');
        textObj.off('editing:exited');
        textObj.off('mouseup');
        
        textObj.on('mouseup', function(e) {
            const pointer = canvas.getPointer(e.e);
            const objectBounds = textObj.getBoundingRect();
            const relativeX = pointer.x - objectBounds.left;
            const fontSize = textObj.fontSize || 20;
            const checkboxWidth = fontSize * 1.2;
            
            if (relativeX >= 0 && relativeX <= checkboxWidth) {
                const currentText = textObj.text;
                if (currentText.startsWith('☐')) {
                    textObj.set({
                        text: currentText.replace('☐', '☑'),
                        fill: '#10b981'
                    });
                } else if (currentText.startsWith('☑')) {
                    textObj.set({
                        text: currentText.replace('☑', '☐'),
                        fill: '#374151'
                    });
                }
                canvas.renderAll();
                saveState();
                
                e.e.preventDefault();
                e.e.stopPropagation();
                return false;
            }
        });
        
        textObj.on('mousedown', function(e) {
            const pointer = canvas.getPointer(e.e);
            const objectBounds = textObj.getBoundingRect();
            const relativeX = pointer.x - objectBounds.left;
            const fontSize = textObj.fontSize || 20;
            const checkboxWidth = fontSize * 1.2;
            
            if (relativeX >= 0 && relativeX <= checkboxWidth) {
                const currentText = textObj.text;
                if (currentText.startsWith('☐')) {
                    textObj.set({
                        text: currentText.replace('☐', '☑'),
                        fill: '#10b981'
                    });
                } else if (currentText.startsWith('☑')) {
                    textObj.set({
                        text: currentText.replace('☑', '☐'),
                        fill: '#374151'
                    });
                }
                canvas.renderAll();
                saveState();
                
                e.e.preventDefault();
                e.e.stopPropagation();
                return false;
            }
        });
        
        textObj.on('mousedblclick', function(e) {
            const pointer = canvas.getPointer(e.e);
            const objectBounds = textObj.getBoundingRect();
            const relativeX = pointer.x - objectBounds.left;
            const fontSize = textObj.fontSize || 20;
            const checkboxWidth = fontSize * 1.2;
            
            if (relativeX > checkboxWidth) {
                textObj.enterEditing();
                textObj.selectionStart = textObj.text.length;
                textObj.selectionEnd = textObj.text.length;
            }
        });
        
        textObj.on('editing:entered', function() {
            textObj.selectionStart = textObj.text.length;
            textObj.selectionEnd = textObj.text.length;
        });
        
        textObj.on('changed', function() {
            const currentText = textObj.text;
            if (!currentText.startsWith('☐') && !currentText.startsWith('☑')) {
                const cleanText = currentText.replace(/^[☐☑]\s*/, '');
                textObj.set('text', '☐ ' + cleanText);
                textObj.selectionStart = textObj.text.length;
                textObj.selectionEnd = textObj.text.length;
                canvas.renderAll();
            } else if (currentText.length < 2 || !currentText.charAt(1).match(/\s/)) {
                const symbol = currentText.charAt(0);
                const cleanText = currentText.substring(1).replace(/^\s*/, '');
                textObj.set('text', symbol + ' ' + cleanText);
                textObj.selectionStart = textObj.text.length;
                textObj.selectionEnd = textObj.text.length;
                canvas.renderAll();
            }
        });
        
        textObj.on('editing:exited', function() {
            const currentText = textObj.text;
            if (!currentText.startsWith('☐') && !currentText.startsWith('☑')) {
                textObj.set('text', '☐ ' + currentText.replace(/^[☐☑]\s*/, ''));
                canvas.renderAll();
            }
        });
        
        textObj.set({
            selectable: true,
            editable: true,
            fill: textObj.text.startsWith('☑') ? '#10b981' : '#374151'
        });
    }

    function setupListProtection(textObj, listType) {
        if (!textObj) return;
        
        textObj.off('changed');
        textObj.off('editing:entered');
        textObj.off('editing:exited');
        
        textObj.on('editing:entered', function() {
            const text = textObj.text;
            let protectedLength = 0;
            
            if (listType === 'bullet' && text.startsWith('• ')) {
                protectedLength = 2;
            } else if (listType === 'number' && text.match(/^\d+\. /)) {
                const match = text.match(/^(\d+\. )/);
                protectedLength = match ? match[1].length : 0;
            }
            
            if (protectedLength > 0) {
                textObj.selectionStart = Math.max(protectedLength, textObj.selectionStart);
                textObj.selectionEnd = Math.max(protectedLength, textObj.selectionEnd);
            }
        });
        
        textObj.on('changed', function() {
            const currentText = textObj.text;
            
            if (listType === 'bullet') {
                if (!currentText.startsWith('• ')) {
                    const cleanText = currentText.replace(/^[•]\s*/, '');
                    textObj.set('text', '• ' + cleanText);
                    textObj.selectionStart = textObj.text.length;
                    textObj.selectionEnd = textObj.text.length;
                    canvas.renderAll();
                } else if (currentText.length < 2 || !currentText.charAt(1).match(/\s/)) {
                    const cleanText = currentText.substring(1).replace(/^\s*/, '');
                    textObj.set('text', '• ' + cleanText);
                    textObj.selectionStart = textObj.text.length;
                    textObj.selectionEnd = textObj.text.length;
                    canvas.renderAll();
                }
            } else if (listType === 'number') {
                if (!currentText.match(/^\d+\. /)) {
                    const cleanText = currentText.replace(/^\d*\.?\s*/, '');
                    textObj.set('text', '1. ' + cleanText);
                    textObj.selectionStart = textObj.text.length;
                    textObj.selectionEnd = textObj.text.length;
                    canvas.renderAll();
                } else {
                    const match = currentText.match(/^(\d+)(\.\s*)(.*)/);
                    if (match && (!match[2] || match[2] !== '. ')) {
                        textObj.set('text', match[1] + '. ' + (match[3] || ''));
                        textObj.selectionStart = textObj.text.length;
                        textObj.selectionEnd = textObj.text.length;
                        canvas.renderAll();
                    }
                }
            }
        });
        
        textObj.on('editing:exited', function() {
            const currentText = textObj.text;
            
            if (listType === 'bullet' && !currentText.startsWith('• ')) {
                textObj.set('text', '• ' + currentText.replace(/^[•]\s*/, ''));
                canvas.renderAll();
            } else if (listType === 'number' && !currentText.match(/^\d+\. /)) {
                textObj.set('text', '1. ' + currentText.replace(/^\d*\.?\s*/, ''));
                canvas.renderAll();
            }
        });
        
        textObj.set({
            selectable: true,
            editable: true
        });
    }

    function setupPlaceholderHandling(textObj) {
        if (!textObj || !textObj.isPlaceholder) return;

        textObj.on('editing:entered', function() {
            if (textObj.isPlaceholder) {
                textObj.selectAll();
            }
        });

        textObj.on('text:changed', function() {
            if (textObj.isPlaceholder) {
                const textType = textObj.textType;
                let prefix = '';
                
                if (textType === 'todolist') {
                    prefix = '☐ ';
                } else if (textType === 'bulletlist') {
                    prefix = '• ';
                } else if (textType === 'numberlist') {
                    prefix = '1. ';
                } else if (textType === 'togglelist') {
                    prefix = '▶ ';
                } else if (textType === 'quote') {
                    prefix = '" ';
                } else if (textType === 'callout') {
                    prefix = '💡 ';
                }
                
                const currentText = textObj.text;
                const newChar = currentText.charAt(currentText.length - 1);
                
                if (prefix) {
                    textObj.set('text', prefix + newChar);
                    textObj.selectionStart = textObj.text.length;
                    textObj.selectionEnd = textObj.text.length;
                } else {
                    textObj.set('text', newChar);
                }
                
                textObj.isPlaceholder = false;
                canvas.renderAll();
            }
        });
    }

    function createCodeBlock(text = 'function example() {\n    return "Hello World";\n}') {
        const codeObj = new fabric.IText(text, {
            fontFamily: 'Courier New',
            backgroundColor: '#1e1e1e',
            fill: '#d4d4d4',
            fontSize: 16,
            padding: 12,
            borderRadius: 8,
            textBackgroundColor: '#1e1e1e',
            selectionBackgroundColor: '#4a5568'
        });
        
        return codeObj;
    }

    function applySyntaxHighlighting(textObj) {
        if (!textObj || textObj.fontFamily !== 'Courier New') return;
        
        const code = textObj.text;
        const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'extends', 'implements', 'interface', 'type', 'enum', 'namespace', 'module', 'declare', 'public', 'private', 'protected', 'readonly', 'static'];
        const operators = ['=', '+', '-', '*', '/', '%', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', ';'];
        const strings = ['"', "'", '`'];
        
        textObj.set({
            fill: '#d4d4d4',
            backgroundColor: '#1e1e1e'
        });
        
        canvas.renderAll();
    }

    function setupModals() {
        if (saveCanvasForm) {
            saveCanvasForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (currentCanvasId) {
                    return;
                }
                
                const nameInput = document.getElementById('canvasName');
                const descInput = document.getElementById('canvasDescription');
                const submitBtn = saveCanvasForm.querySelector('button[type="submit"]');
                
                const name = nameInput.value.trim();
                const description = descInput.value.trim();
                
                if (!name) {
                    showNotification('Please enter a canvas name', 'error');
                    return;
                }
                
                const originalText = submitBtn.textContent;
                
                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Saving...';
                    
                    await saveCanvas(name, description);
                    
                    saveCanvasModal.classList.remove('active');
                    nameInput.value = '';
                    descInput.value = '';
                    
                } catch (error) {
                    console.error('Save error:', error);
                    showNotification('Failed to save canvas', 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }

        if (closeSaveModal) {
            closeSaveModal.addEventListener('click', () => {
                if (saveCanvasModal) {
                    saveCanvasModal.classList.remove('active');
                }
            });
        }

        if (cancelSaveBtn) {
            cancelSaveBtn.addEventListener('click', () => {
                if (saveCanvasModal) {
                    saveCanvasModal.classList.remove('active');
                }
            });
        }

        if (closeTrashModal) {
            closeTrashModal.addEventListener('click', () => {
                hideTrashModal();
            });
        }

        if (emptyTrashBtn) {
            emptyTrashBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to permanently delete all items in trash?')) {
                    await emptyTrash();
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target === saveCanvasModal) {
                saveCanvasModal.classList.remove('active');
            }
            if (e.target === trashModal) {
                trashModal.classList.remove('active');
            }
            if (e.target === canvasGalleryModal) {
                canvasGalleryModal.classList.remove('active');
            }
        });

        if (closeGalleryModal) {
            closeGalleryModal.addEventListener('click', () => {
                canvasGalleryModal.classList.remove('active');
            });
        }

        if (newCanvasFromGallery) {
            newCanvasFromGallery.addEventListener('click', () => {
                const newCanvasModal = document.getElementById('newCanvasModal');
                if (newCanvasModal) {
                    newCanvasModal.style.display = 'flex';
                    canvasGalleryModal.classList.remove('active');
                }
            });
        }

        if (gallerySearch) {
            gallerySearch.addEventListener('input', (e) => {
                filterCanvasGallery(e.target.value);
            });
        }

        const clearCanvasModal = document.getElementById('clearCanvasModal');
        const closeClearModal = document.getElementById('closeClearModal');
        const cancelClearBtn = document.getElementById('cancelClearBtn');
        const confirmClearBtn = document.getElementById('confirmClearBtn');

        if (closeClearModal) {
            closeClearModal.addEventListener('click', () => {
                clearCanvasModal.style.display = 'none';
            });
        }

        if (cancelClearBtn) {
            cancelClearBtn.addEventListener('click', () => {
                clearCanvasModal.style.display = 'none';
            });
        }

        if (confirmClearBtn) {
            confirmClearBtn.addEventListener('click', () => {
                canvas.clear();
                saveState();
                clearCanvasModal.style.display = 'none';
            });
        }

        const newCanvasModal = document.getElementById('newCanvasModal');
        const closeNewModal = document.getElementById('closeNewModal');
        const cancelNewBtn = document.getElementById('cancelNewBtn');
        const confirmNewBtn = document.getElementById('confirmNewBtn');

        if (closeNewModal) {
            closeNewModal.addEventListener('click', () => {
                newCanvasModal.style.display = 'none';
            });
        }

        if (cancelNewBtn) {
            cancelNewBtn.addEventListener('click', () => {
                newCanvasModal.style.display = 'none';
            });
        }

        if (confirmNewBtn) {
            confirmNewBtn.addEventListener('click', () => {
                canvas.clear();
                currentCanvasId = null;
                updatePageTitle('Untitled Canvas');
                saveState();
                newCanvasModal.style.display = 'none';
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target === clearCanvasModal) {
                clearCanvasModal.style.display = 'none';
            }
            if (e.target === newCanvasModal) {
                newCanvasModal.style.display = 'none';
            }
        });
    }

    function updatePageTitle(canvasName) {
        if (canvasPageTitle) {
            canvasPageTitle.textContent = canvasName || 'Untitled Canvas';
        }
    }

    function constrainObjectToBounds(obj) {
        if (!obj || !canvas) return;

        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        const objBounds = obj.getBoundingRect();

        let left = obj.left;
        let top = obj.top;

        if (objBounds.left < 0) {
            left = obj.left - objBounds.left;
        }
        if (objBounds.top < 0) {
            top = obj.top - objBounds.top;
        }
        if (objBounds.left + objBounds.width > canvasWidth) {
            left = obj.left - (objBounds.left + objBounds.width - canvasWidth);
        }
        if (objBounds.top + objBounds.height > canvasHeight) {
            top = obj.top - (objBounds.top + objBounds.height - canvasHeight);
        }

        obj.set({
            left: left,
            top: top
        });

        obj.setCoords();
        canvas.renderAll();
    }

    function showTextToolbar(textObj) {
        if (!textToolbar || !textObj) return;

        const canvasElement = canvas.getElement();
        const canvasRect = canvasElement.getBoundingClientRect();
        const objCoords = textObj.getBoundingRect();
        
        const toolbarWidth = 300;
        const toolbarHeight = 50;
        const extraSpace = 80;
        
        let left = canvasRect.left + objCoords.left + (objCoords.width / 2) - (toolbarWidth / 2);
        let top = canvasRect.top + objCoords.top - toolbarHeight - extraSpace;
        
        if (left < 10) left = 10;
        if (left + toolbarWidth > window.innerWidth - 10) {
            left = window.innerWidth - toolbarWidth - 10;
        }
        if (top < 10) {
            top = canvasRect.top + objCoords.top + objCoords.height + extraSpace;
        }
        
        textToolbar.style.left = left + 'px';
        textToolbar.style.top = top + 'px';
        textToolbar.style.display = 'flex';
        
        updateTextToolbarState();
    }

    function hideTextToolbar() {
        if (textToolbar) {
            textToolbar.style.display = 'none';
        }
    }

    function showShapeToolbar(shapeObj) {
        if (!shapeToolbar || !shapeObj) return;

        const canvasElement = canvas.getElement();
        const canvasRect = canvasElement.getBoundingClientRect();
        const objCoords = shapeObj.getBoundingRect();
        
        const toolbarWidth = 400;
        const toolbarHeight = 50;
        const extraSpace = 80;
        
        let left = canvasRect.left + objCoords.left + (objCoords.width / 2) - (toolbarWidth / 2);
        let top = canvasRect.top + objCoords.top - toolbarHeight - extraSpace;
        
        if (left < 10) left = 10;
        if (left + toolbarWidth > window.innerWidth - 10) {
            left = window.innerWidth - toolbarWidth - 10;
        }
        if (top < 10) {
            top = canvasRect.top + objCoords.top + objCoords.height + extraSpace;
        }
        
        shapeToolbar.style.left = left + 'px';
        shapeToolbar.style.top = top + 'px';
        shapeToolbar.style.display = 'flex';
        
        updateShapeToolbarState();
    }

    function hideShapeToolbar() {
        if (shapeToolbar) {
            shapeToolbar.style.display = 'none';
        }
    }

    function showRotationIndicator(obj) {
        if (!obj) return;

        let rotationIndicator = document.getElementById('rotationIndicator');
        
        if (!rotationIndicator) {
            rotationIndicator = document.createElement('div');
            rotationIndicator.id = 'rotationIndicator';
            rotationIndicator.className = 'rotation-indicator';
            document.body.appendChild(rotationIndicator);
        }

        const canvasElement = canvas.getElement();
        const canvasRect = canvasElement.getBoundingClientRect();
        const objCoords = obj.getBoundingRect();
        
        const angle = Math.round(obj.angle || 0);
        const normalizedAngle = ((angle % 360) + 360) % 360;
        
        rotationIndicator.textContent = `${normalizedAngle}°`;
        
        const left = canvasRect.left + objCoords.left + (objCoords.width / 2) - 25;
        const top = canvasRect.top + objCoords.top - 40;
        
        rotationIndicator.style.left = left + 'px';
        rotationIndicator.style.top = top + 'px';
        rotationIndicator.style.display = 'block';
    }

    function hideRotationIndicator() {
        const rotationIndicator = document.getElementById('rotationIndicator');
        if (rotationIndicator) {
            rotationIndicator.style.display = 'none';
        }
    }

    function updateShapeToolbarState() {
        if (!activeShapeObject) return;

        const shapeColorDisplay = document.querySelector('#shapeColorPicker').parentElement.querySelector('.color-display');
        const strokeColorDisplay = document.querySelector('#strokeColorPicker').parentElement.querySelector('.color-display');

        if (shapeColorPicker) {
            const fillColor = activeShapeObject.fill || '#3b82f6';
            shapeColorPicker.value = fillColor;
            if (shapeColorDisplay) {
                shapeColorDisplay.style.backgroundColor = fillColor;
            }
        }
        if (strokeColorPicker) {
            const strokeColor = activeShapeObject.stroke || '#1e40af';
            strokeColorPicker.value = strokeColor;
            if (strokeColorDisplay) {
                strokeColorDisplay.style.backgroundColor = strokeColor;
            }
        }
        if (strokeWidthSlider) {
            const width = activeShapeObject.strokeWidth || 2;
            strokeWidthSlider.value = width;
            strokeWidthValue.textContent = width + 'px';
        }
    }

    function updateTextToolbarState() {
        if (!activeTextObject) return;

        const fontFamilySelect = document.getElementById('fontFamilySelect');
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        const boldBtn = document.getElementById('boldBtn');
        const italicBtn = document.getElementById('italicBtn');
        const underlineBtn = document.getElementById('underlineBtn');
        const strikethroughBtn = document.getElementById('strikethroughBtn');
        const textColorPicker = document.getElementById('textColorPicker');
        const textBackgroundPicker = document.getElementById('textBackgroundPicker');

        if (fontFamilySelect) {
            fontFamilySelect.value = activeTextObject.fontFamily || 'Arial';
        }
        if (fontSizeSelect) {
            fontSizeSelect.value = activeTextObject.fontSize || 20;
        }
        if (boldBtn) {
            boldBtn.classList.toggle('active', activeTextObject.fontWeight === 'bold');
        }
        if (italicBtn) {
            italicBtn.classList.toggle('active', activeTextObject.fontStyle === 'italic');
        }
        if (underlineBtn) {
            underlineBtn.classList.toggle('active', activeTextObject.underline);
        }
        if (strikethroughBtn) {
            strikethroughBtn.classList.toggle('active', activeTextObject.linethrough);
        }
        if (textColorPicker) {
            textColorPicker.value = activeTextObject.fill || '#000000';
        }
        if (textBackgroundPicker) {
            textBackgroundPicker.value = activeTextObject.backgroundColor || '#ffffff';
        }
    }

    function isEmoji(text) {
        if (!text) return false;
        const emojiRegex = /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u;
        return emojiRegex.test(text.trim());
    }

    function handleSelection(e) {
        const selectedObject = e.selected[0];
        if (selectedObject && selectedObject.type === 'i-text') {
            activeTextObject = selectedObject;
            activeShapeObject = null;
            hideShapeToolbar();
            if (selectedObject.text && (selectedObject.text.startsWith('☐') || selectedObject.text.startsWith('☑'))) {
                setupTodoInteraction(selectedObject);
                showTextToolbar(selectedObject);
            } else if (!isEmoji(selectedObject.text)) {
                showTextToolbar(selectedObject);
            }
        } else if (selectedObject && (selectedObject.type === 'rect' || selectedObject.type === 'circle' || 
                   selectedObject.type === 'triangle' || selectedObject.type === 'line' || 
                   selectedObject.type === 'group' || selectedObject.type === 'path')) {
            activeShapeObject = selectedObject;
            activeTextObject = null;
            hideTextToolbar();
            showShapeToolbar(selectedObject);
        } else {
            hideTextToolbar();
            hideShapeToolbar();
            activeTextObject = null;
            activeShapeObject = null;
        }
    }

    function clearSelection() {
        hideTextToolbar();
        hideShapeToolbar();
        hideRotationIndicator();
        activeTextObject = null;
        activeShapeObject = null;
    }

    function setActiveTool(tool) {
        document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
        
        if (tool === 'select') {
            selectBtn.classList.add('active');
            canvas.isDrawingMode = false;
            canvas.selection = true;
            canvas.defaultCursor = 'default';
            canvas.hoverCursor = 'move';
            canvas.off('mouse:down');
            canvas.off('mouse:move');
            canvas.off('mouse:up');
        } else if (tool === 'pan') {
            panBtn.classList.add('active');
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.defaultCursor = 'grab';
            canvas.hoverCursor = 'grab';
            
            let isDragging = false;
            let lastPosX = 0;
            let lastPosY = 0;
            
            canvas.on('mouse:down', function(opt) {
                const evt = opt.e;
                isDragging = true;
                canvas.defaultCursor = 'grabbing';
                lastPosX = evt.clientX;
                lastPosY = evt.clientY;
            });
            
            canvas.on('mouse:move', function(opt) {
                if (isDragging) {
                    const evt = opt.e;
                    const vpt = canvas.viewportTransform;
                    vpt[4] += evt.clientX - lastPosX;
                    vpt[5] += evt.clientY - lastPosY;
                    canvas.requestRenderAll();
                    lastPosX = evt.clientX;
                    lastPosY = evt.clientY;
                }
            });
            
            canvas.on('mouse:up', function() {
                isDragging = false;
                canvas.defaultCursor = 'grab';
            });
            
        } else if (tool === 'draw') {
            canvas.isDrawingMode = true;
            canvas.selection = true;
            canvas.freeDrawingBrush.width = parseInt(document.getElementById('strokeWidthSlider').value) || 5;
            canvas.freeDrawingBrush.color = document.getElementById('shapeColorPicker').value || '#000000';
            canvas.defaultCursor = 'crosshair';
            canvas.off('mouse:down');
            canvas.off('mouse:move');
            canvas.off('mouse:up');
            showShapeToolbar();
        } else {
            canvas.isDrawingMode = false;
            canvas.selection = true;
            canvas.defaultCursor = 'default';
            canvas.off('mouse:down');
            canvas.off('mouse:move');
            canvas.off('mouse:up');
            hideShapeToolbar();
        }
    }

    function updateZoomIndicator() {
        const zoomIndicator = document.getElementById('zoomIndicator');
        if (zoomIndicator) {
            const zoomPercentage = Math.round(canvas.getZoom() * 100);
            zoomIndicator.querySelector('span').textContent = `${zoomPercentage}%`;
        }
    }

    function zoomCanvas(factor) {
        const zoom = canvas.getZoom();
        const newZoom = zoom * factor;
        const maxZoom = 3;
        const minZoom = 0.1;
        
        if (newZoom > maxZoom || newZoom < minZoom) return;
        
        const center = new fabric.Point(canvas.width / 2, canvas.height / 2);
        canvas.zoomToPoint(center, newZoom);
        canvas.renderAll();
        updateZoomIndicator();
    }

    function resetZoom() {
        canvas.setZoom(1);
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.renderAll();
        updateZoomIndicator();
    }

    function toggleFullscreen() {
        const canvasContainer = document.querySelector('.canvas-container');
        const fullscreenIcon = fullscreenBtn.querySelector('i');
        
        if (!document.fullscreenElement) {
            canvasContainer.requestFullscreen().then(() => {
                fullscreenIcon.className = 'fas fa-compress';
                fullscreenBtn.title = 'Exit Fullscreen';
                setTimeout(() => {
                    resizeCanvas();
                }, 100);
            }).catch(() => {
            });
        } else {
            document.exitFullscreen().then(() => {
                fullscreenIcon.className = 'fas fa-expand';
                fullscreenBtn.title = 'Toggle Fullscreen';
                setTimeout(() => {
                    resizeCanvas();
                }, 100);
            });
        }
    }

    function resizeCanvas() {
        const containerWidth = canvasWrapper.clientWidth;
        const containerHeight = canvasWrapper.clientHeight;
        canvas.setDimensions({
            width: containerWidth,
            height: containerHeight
        });
        canvas.renderAll();
    }

    function saveState() {
        const state = JSON.stringify(canvas.toJSON());
        history = history.slice(0, historyIndex + 1);
        history.push(state);
        historyIndex++;
        
        if (history.length > 50) {
            history.shift();
            historyIndex--;
        }
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            isUndoRedoAction = true;
            canvas.loadFromJSON(history[historyIndex], () => {
                canvas.renderAll();
                canvas.getObjects().forEach(obj => {
                    constrainObjectToBounds(obj);
                });
                isUndoRedoAction = false;
            });
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            isUndoRedoAction = true;
            canvas.loadFromJSON(history[historyIndex], () => {
                canvas.renderAll();
                canvas.getObjects().forEach(obj => {
                    constrainObjectToBounds(obj);
                });
                isUndoRedoAction = false;
            });
        }
    }

    async function uploadImageToCloudinary(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'ml_default');
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${window.cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to upload image to Cloudinary');
            }
            
            const result = await response.json();
            return result.secure_url;
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw error;
        }
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async function loadSavedCanvases() {
        try {
            savedCanvases = await getAllSavedCanvases();
        } catch (error) {
            console.error('Error loading canvases:', error);
        }
    }

    async function saveCanvas(name, description = '', canvasJsonData = null) {
        try {
            const canvasData = canvasJsonData || canvas.toJSON();
            const objectCount = canvas.getObjects().length;
            
            if (objectCount === 0) {
                showNotification('Canvas is empty. Add some content before saving.', 'error');
                return;
            }
            
            const thumbnail = await generateThumbnail();
            
            const canvasRecord = {
                id: currentCanvasId || generateId(),
                name: name,
                description: description,
                data: JSON.stringify(canvasData),
                thumbnail: thumbnail || null,
                objectCount: objectCount,
                isTrash: false,
                created_at: currentCanvasId ? null : firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!currentCanvasId) {
                currentCanvasId = canvasRecord.id;
            }

            await saveCanvasToFirestore(canvasRecord);
            
            updatePageTitle(name);
            showNotification('Canvas saved successfully!', 'success');

        } catch (error) {
            console.error('Error saving canvas:', error);
            showNotification('Error saving canvas', 'error');
            throw error;
        }
    }

    function generateThumbnail() {
        try {
            const currentZoom = canvas.getZoom();
            const currentVpt = canvas.viewportTransform.slice();
            
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            canvas.setZoom(1);
            
            const canvasElement = canvas.getElement();
            const originalWidth = canvasElement.width;
            const originalHeight = canvasElement.height;
            
            const thumbnailCanvas = document.createElement('canvas');
            const thumbnailCtx = thumbnailCanvas.getContext('2d');
            
            const maxSize = 400;
            const scale = Math.min(maxSize / originalWidth, maxSize / originalHeight);
            
            thumbnailCanvas.width = originalWidth * scale;
            thumbnailCanvas.height = originalHeight * scale;
            
            thumbnailCtx.fillStyle = '#ffffff';
            thumbnailCtx.fillRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
            
            thumbnailCtx.drawImage(canvasElement, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
            
            canvas.setZoom(currentZoom);
            canvas.setViewportTransform(currentVpt);
            
            return thumbnailCanvas.toDataURL('image/png', 0.8);
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            return createFallbackThumbnail();
        }
    }

    function createFallbackThumbnail() {
        const fallbackCanvas = document.createElement('canvas');
        const ctx = fallbackCanvas.getContext('2d');
        
        fallbackCanvas.width = 400;
        fallbackCanvas.height = 300;
        
        const gradient = ctx.createLinearGradient(0, 0, 400, 300);
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 300);
        
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Canvas Preview', 200, 150);
        
        return fallbackCanvas.toDataURL('image/png', 0.8);
    }

    async function saveCanvasToFirestore(canvasRecord) {
        try {
            const userId = auth.currentUser?.uid || 'guest';
            if (canvasRecord.created_at === null) {
                const existingDoc = await db.collection('users').doc(userId).collection('canvases').doc(canvasRecord.id).get();
                if (existingDoc.exists) {
                    canvasRecord.created_at = existingDoc.data().created_at;
                } else {
                    canvasRecord.created_at = firebase.firestore.FieldValue.serverTimestamp();
                }
            }
            
            await db.collection('users').doc(userId).collection('canvases').doc(canvasRecord.id).set(canvasRecord, { merge: true });
        } catch (error) {
            console.error('Error saving to Firestore:', error);
            throw error;
        }
    }

    async function loadCanvas(id) {
        try {
            showLoading();
            
            const canvasData = await getCanvasById(id);
            if (canvasData && canvasData.data) {
                const parsedData = typeof canvasData.data === 'string' ? JSON.parse(canvasData.data) : canvasData.data;
                isUndoRedoAction = true;
                canvas.loadFromJSON(parsedData, () => {
                    canvas.renderAll();
                    currentCanvasId = id;
                    updatePageTitle(canvasData.name);
                    isUndoRedoAction = false;
                    saveState();
                });
            }
        } catch (error) {
            console.error('Error loading canvas:', error);
            showNotification('Error loading canvas', 'error');
        } finally {
            hideLoading();
        }
    }

    function showContextMenu(e, canvasId) {
        contextMenuTarget = canvasId;
        if (contextMenu) {
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
        }
    }

    function hideContextMenu() {
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
        contextMenuTarget = null;
    }

    async function moveToTrash(canvasId) {
        try {
            const userId = auth.currentUser?.uid || 'guest';
            await db.collection('users').doc(userId).collection('canvases').doc(canvasId).update({
                isTrash: true,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            if (currentCanvasId === canvasId) {
                canvas.clear();
                currentCanvasId = null;
                updatePageTitle('Untitled Canvas');
                saveState();
            }
            
            await loadSavedCanvases();
            
            if (trashModal && trashModal.classList.contains('active')) {
                await loadTrashedCanvases();
            }
            
        } catch (error) {
            console.error('Error moving to trash:', error);
            throw error;
        }
    }

    function showTrashModal() {
        if (trashModal) {
            trashModal.classList.add('active');
            loadTrashedCanvases();
        }
    }

    function hideTrashModal() {
        if (trashModal) {
            trashModal.classList.remove('active');
        }
    }

    async function loadTrashedCanvases() {
        try {
            trashedCanvases = await getTrashedCanvases();
            renderTrashList();
        } catch (error) {
            console.error('Error loading trash from Firestore:', error);
            trashedCanvases = [];
            renderTrashList();
        }
    }

    function renderTrashList() {
        const trashList = document.getElementById('trashList');
        if (!trashList) return;

        if (trashedCanvases.length === 0) {
            trashList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trash fa-3x"></i>
                    <p>Trash is empty</p>
                </div>
            `;
            return;
        }

        trashList.innerHTML = trashedCanvases.map(item => `
            <div class="trash-item" data-id="${item.id}">
                <div class="trash-item-info">
                    <div class="trash-item-name">${item.name}</div>
                    <div class="trash-item-meta">
                        <span class="trash-item-date">Modified ${formatDate(item.updated_at)}</span>
                        <span class="trash-item-objects">${item.objectCount || 0} objects</span>
                    </div>
                    ${item.description ? `<div class="trash-item-description">${item.description}</div>` : ''}
                </div>
                <div class="trash-item-actions">
                    <button class="btn btn-sm btn-secondary restore-btn" data-id="${item.id}">
                        <i class="fas fa-undo"></i> Restore
                    </button>
                    <button class="btn btn-sm btn-danger delete-permanently-btn" data-id="${item.id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                restoreCanvas(btn.dataset.id);
            });
        });

        document.querySelectorAll('.delete-permanently-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to permanently delete this canvas?')) {
                    deletePermanently(btn.dataset.id);
                }
            });
        });
    }

    async function restoreCanvas(canvasId) {
        try {
            await restoreFromTrash(canvasId);
            await loadSavedCanvases();
            await loadTrashedCanvases();
            showNotification('Canvas restored successfully', 'success');
        } catch (error) {
            console.error('Error restoring canvas:', error);
            showNotification('Error restoring canvas', 'error');
        }
    }

    async function deletePermanently(canvasId) {
        try {
            await permanentlyDeleteCanvas(canvasId);
            await loadTrashedCanvases();
            showNotification('Canvas permanently deleted', 'success');
        } catch (error) {
            console.error('Error deleting permanently:', error);
            showNotification('Error deleting canvas', 'error');
        }
    }

    async function emptyTrash() {
        try {
            const userId = auth.currentUser?.uid || 'guest';
            const snapshot = await db.collection('users').doc(userId).collection('canvases')
                .where('isTrash', '==', true)
                .get();
            
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            await loadTrashedCanvases();
            showNotification('Trash emptied successfully', 'success');
        } catch (error) {
            console.error('Error emptying trash:', error);
            showNotification('Error emptying trash', 'error');
        }
    }

    function showLoading() {
        const modal = document.createElement('div');
        modal.id = 'loadingModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content loading">
                <div class="spinner"></div>
                <p>Please wait...</p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function hideLoading() {
        const modal = document.getElementById('loadingModal');
        if (modal) {
            modal.remove();
        }
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    function formatDate(date) {
        if (!date) return 'Unknown';
        return date.toLocaleDateString();
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
    });

    function resizeCanvas() {
        if (canvas && canvasWrapper) {
            const containerWidth = canvasWrapper.clientWidth;
            const containerHeight = canvasWrapper.clientHeight;
            
            canvas.setDimensions({
                width: containerWidth,
                height: containerHeight
            });
            
            canvas.getObjects().forEach(obj => {
                constrainObjectToBounds(obj);
            });
            
            canvas.renderAll();
        }
    }

    const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
    });
    
    if (canvasWrapper) {
        resizeObserver.observe(canvasWrapper);
    }

    async function showCanvasGallery() {
        if (!canvasGalleryModal) return;
        
        canvasGalleryModal.classList.add('active');
        await loadCanvasGallery();
    }

    async function loadCanvasGallery() {
        if (!canvasGalleryGrid || !galleryEmpty) return;
        
        canvasGalleryGrid.innerHTML = '<div class="gallery-loading"><div class="loading-spinner"></div><span>Loading canvases...</span></div>';
        galleryEmpty.style.display = 'none';
        
        try {
            const savedCanvases = await getAllSavedCanvases();
            
            if (savedCanvases.length === 0) {
                canvasGalleryGrid.innerHTML = '';
                galleryEmpty.style.display = 'flex';
                return;
            }
            
            galleryEmpty.style.display = 'none';
            renderCanvasGallery(savedCanvases);
        } catch (error) {
            console.error('Error loading canvas gallery:', error);
            canvasGalleryGrid.innerHTML = '<div class="gallery-error">Error loading canvases</div>';
        }
    }

    function renderCanvasGallery(canvases) {
        if (!canvasGalleryGrid) return;
        
        canvasGalleryGrid.innerHTML = '';
        
        canvases.forEach(canvasData => {
            const canvasCard = createCanvasCard(canvasData);
            canvasGalleryGrid.appendChild(canvasCard);
        });
    }

    function createCanvasCard(canvasData) {
        const card = document.createElement('div');
        card.className = 'canvas-card';
        card.dataset.canvasId = canvasData.id;
        
        const preview = document.createElement('div');
        preview.className = 'canvas-preview';
        
        if (canvasData.thumbnail) {
            const loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'canvas-preview-loading';
            loadingSpinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            preview.appendChild(loadingSpinner);
            
            const img = document.createElement('img');
            img.style.display = 'none';
            img.alt = canvasData.name;
            
            img.onload = () => {
                loadingSpinner.remove();
                img.style.display = 'block';
            };
            
            img.onerror = () => {
                loadingSpinner.remove();
                const placeholder = document.createElement('div');
                placeholder.className = 'canvas-preview-placeholder';
                placeholder.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Preview not available</span>';
                preview.appendChild(placeholder);
            };
            
            preview.appendChild(img);
            img.src = canvasData.thumbnail;
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'canvas-preview-placeholder';
            placeholder.innerHTML = '<i class="fas fa-paint-brush"></i><span>No preview</span>';
            preview.appendChild(placeholder);
        }
        
        const cardContent = document.createElement('div');
        cardContent.className = 'canvas-card-content';
        
        const cardHeader = document.createElement('div');
        cardHeader.className = 'canvas-card-header';
        
        const title = document.createElement('h3');
        title.className = 'canvas-title';
        title.textContent = canvasData.name || 'Untitled Canvas';
        title.title = canvasData.name || 'Untitled Canvas';
        
        const menu = document.createElement('div');
        menu.className = 'canvas-menu';
        menu.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            showCanvasCardMenu(e, canvasData.id, canvasData.name, canvasData.description);
        });
        
        cardHeader.appendChild(title);
        cardHeader.appendChild(menu);
        
        if (canvasData.description && canvasData.description.trim()) {
            const description = document.createElement('p');
            description.className = 'canvas-description';
            description.textContent = canvasData.description;
            description.title = canvasData.description;
            cardContent.appendChild(description);
        }
        
        const cardMeta = document.createElement('div');
        cardMeta.className = 'canvas-card-meta';
        
        const createdDate = document.createElement('div');
        createdDate.className = 'canvas-meta-item';
        createdDate.innerHTML = `
            <i class="fas fa-calendar-plus"></i>
            <span>Created ${formatDate(canvasData.created_at)}</span>
        `;
        
        const updatedDate = document.createElement('div');
        updatedDate.className = 'canvas-meta-item';
        updatedDate.innerHTML = `
            <i class="fas fa-clock"></i>
            <span>Modified ${formatDate(canvasData.updated_at)}</span>
        `;
        
        const objectCount = document.createElement('div');
        objectCount.className = 'canvas-meta-item';
        objectCount.innerHTML = `
            <i class="fas fa-layer-group"></i>
            <span>${canvasData.objectCount || 0} objects</span>
        `;
        
        cardMeta.appendChild(createdDate);
        cardMeta.appendChild(updatedDate);
        cardMeta.appendChild(objectCount);
        
        const actions = document.createElement('div');
        actions.className = 'canvas-actions';
        
        const openBtn = document.createElement('button');
        openBtn.className = 'canvas-action-btn primary';
        openBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> Open';
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            loadCanvasFromGallery(canvasData.id);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'canvas-action-btn danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete Canvas';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeleteConfirmModal(canvasData.id, canvasData.name);
        });
        
        actions.appendChild(openBtn);
        actions.appendChild(deleteBtn);
        
        cardContent.appendChild(cardHeader);
        cardContent.appendChild(cardMeta);
        cardContent.appendChild(actions);
        
        card.appendChild(preview);
        card.appendChild(cardContent);
        
        card.addEventListener('click', () => {
            loadCanvasFromGallery(canvasData.id);
        });
        
        return card;
    }

    async function loadCanvasFromGallery(canvasId) {
        try {
            const canvasData = await getCanvasById(canvasId);
            if (canvasData && canvasData.data) {
                const parsedData = typeof canvasData.data === 'string' ? JSON.parse(canvasData.data) : canvasData.data;
                isUndoRedoAction = true;
                canvas.loadFromJSON(parsedData, () => {
                    canvas.renderAll();
                    currentCanvasId = canvasId;
                    updatePageTitle(canvasData.name);
                    isUndoRedoAction = false;
                    saveState();
                    canvasGalleryModal.classList.remove('active');
                });
            }
        } catch (error) {
            console.error('Error loading canvas:', error);
            alert('Error loading canvas');
        }
    }

    async function duplicateCanvasFromGallery(canvasData) {
        try {
            const newName = `${canvasData.name} (Copy)`;
            const newCanvas = {
                ...canvasData,
                name: newName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            await saveCanvas(newName, canvasData.description || '', 
                typeof canvasData.data === 'string' ? JSON.parse(canvasData.data) : canvasData.data);
            await loadCanvasGallery(); 
        } catch (error) {
            console.error('Error duplicating canvas:', error);
            alert('Error duplicating canvas');
        }
    }

    async function deleteCanvasFromGallery(canvasId, canvasName) {
        if (confirm(`Are you sure you want to move "${canvasName}" to trash?`)) {
            try {
                await moveToTrash(canvasId);
                await loadCanvasGallery();
                showNotification('Canvas moved to trash', 'success');
            } catch (error) {
                console.error('Error moving canvas to trash:', error);
                showNotification('Error moving canvas to trash', 'error');
            }
        }
    }

    let canvasToDelete = { id: null, name: null };

    function showDeleteConfirmModal(canvasId, canvasName) {
        canvasToDelete = { id: canvasId, name: canvasName };
        deleteConfirmModal.querySelector('p').textContent = `Are you sure you want to move "${canvasName}" to trash? This action can be undone from the trash.`;
        deleteConfirmModal.style.display = 'flex';
    }

    function hideDeleteConfirmModal() {
        deleteConfirmModal.style.display = 'none';
        canvasToDelete = { id: null, name: null };
    }

    let canvasMenuTarget = { id: null, name: null, description: null };

    function showCanvasCardMenu(e, canvasId, canvasName, canvasDescription) {
        canvasMenuTarget = { id: canvasId, name: canvasName, description: canvasDescription };
        
        let canvasCardMenu = document.getElementById('canvasCardMenu');
        if (!canvasCardMenu) {
            canvasCardMenu = document.createElement('div');
            canvasCardMenu.id = 'canvasCardMenu';
            canvasCardMenu.className = 'canvas-card-menu';
            canvasCardMenu.innerHTML = `
                <div class="canvas-card-menu-item" id="editCanvasBtn">
                    <i class="fas fa-edit"></i>
                    <span>Edit Details</span>
                </div>
                <div class="canvas-card-menu-divider"></div>
                <div class="canvas-card-menu-item danger" id="deleteCanvasMenuBtn">
                    <i class="fas fa-trash"></i>
                    <span>Move to Trash</span>
                </div>
            `;
            document.body.appendChild(canvasCardMenu);
            
            document.getElementById('editCanvasBtn').addEventListener('click', () => {
                hideCanvasCardMenu();
                showEditCanvasModal(canvasMenuTarget.id, canvasMenuTarget.name, canvasMenuTarget.description);
            });
            
            document.getElementById('deleteCanvasMenuBtn').addEventListener('click', () => {
                hideCanvasCardMenu();
                showDeleteConfirmModal(canvasMenuTarget.id, canvasMenuTarget.name);
            });
            
            document.addEventListener('click', (event) => {
                if (!canvasCardMenu.contains(event.target)) {
                    hideCanvasCardMenu();
                }
            });
        }
        
        canvasCardMenu.style.display = 'block';
        canvasCardMenu.style.left = e.pageX + 'px';
        canvasCardMenu.style.top = e.pageY + 'px';
    }

    function hideCanvasCardMenu() {
        const canvasCardMenu = document.getElementById('canvasCardMenu');
        if (canvasCardMenu) {
            canvasCardMenu.style.display = 'none';
        }
    }

    let canvasToEdit = { id: null, name: null, description: null };

    function showEditCanvasModal(canvasId, canvasName, canvasDescription) {
        canvasToEdit = { id: canvasId, name: canvasName, description: canvasDescription };
        
        let editCanvasModal = document.getElementById('editCanvasModal');
        if (!editCanvasModal) {
            editCanvasModal = document.createElement('div');
            editCanvasModal.id = 'editCanvasModal';
            editCanvasModal.className = 'modal';
            editCanvasModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Edit Canvas Details</h2>
                        <button class="close-btn" id="closeEditModal">&times;</button>
                    </div>
                    <form id="editCanvasForm">
                        <div class="form-group">
                            <label for="editCanvasName">Canvas Name</label>
                            <input type="text" id="editCanvasName" name="name" class="form-control" required placeholder="Enter canvas name...">
                        </div>
                        <div class="form-group">
                            <label for="editCanvasDescription">Description (optional)</label>
                            <textarea id="editCanvasDescription" name="description" class="form-control" rows="3" placeholder="Brief description of this canvas..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelEditBtn">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(editCanvasModal);
            
            document.getElementById('closeEditModal').addEventListener('click', hideEditCanvasModal);
            document.getElementById('cancelEditBtn').addEventListener('click', hideEditCanvasModal);
            
            document.getElementById('editCanvasForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await updateCanvasDetails();
            });
            
            editCanvasModal.addEventListener('click', (e) => {
                if (e.target === editCanvasModal) {
                    hideEditCanvasModal();
                }
            });
        }
        
        document.getElementById('editCanvasName').value = canvasName || '';
        document.getElementById('editCanvasDescription').value = canvasDescription || '';
        editCanvasModal.classList.add('active');
    }

    function hideEditCanvasModal() {
        const editCanvasModal = document.getElementById('editCanvasModal');
        if (editCanvasModal) {
            editCanvasModal.classList.remove('active');
        }
    }

    async function updateCanvasDetails() {
        const nameInput = document.getElementById('editCanvasName');
        const descInput = document.getElementById('editCanvasDescription');
        const submitBtn = document.querySelector('#editCanvasForm button[type="submit"]');
        
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        
        if (!name) {
            showNotification('Please enter a canvas name', 'error');
            return;
        }
        
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
            
            const userId = auth.currentUser?.uid || 'guest';
            await db.collection('users').doc(userId).collection('canvases').doc(canvasToEdit.id).update({
                name: name,
                description: description,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            if (currentCanvasId === canvasToEdit.id) {
                updatePageTitle(name);
            }
            
            await loadCanvasGallery();
            hideEditCanvasModal();
            showNotification('Canvas details updated successfully!', 'success');
            
        } catch (error) {
            console.error('Error updating canvas details:', error);
            showNotification('Error updating canvas details', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async function deleteCanvasFromGallery() {
        const deleteBtn = confirmDeleteBtn;
        const originalText = deleteBtn.innerHTML;
        
        try {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            
            await moveToTrash(canvasToDelete.id);
            await loadCanvasGallery();
            showNotification('Canvas moved to trash', 'success');
            hideDeleteConfirmModal();
        } catch (error) {
            console.error('Error moving canvas to trash:', error);
            showNotification('Error moving canvas to trash', 'error');
        } finally {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalText;
        }
    }

    closeDeleteModal.addEventListener('click', hideDeleteConfirmModal);
    cancelDeleteBtn.addEventListener('click', hideDeleteConfirmModal);
    confirmDeleteBtn.addEventListener('click', deleteCanvasFromGallery);

    deleteConfirmModal.addEventListener('click', (e) => {
        if (e.target === deleteConfirmModal) {
            hideDeleteConfirmModal();
        }
    });

    async function getTrashedCanvases() {
        try {
            const userId = auth.currentUser?.uid || 'guest';
            const snapshot = await db.collection('users').doc(userId).collection('canvases')
                .where('isTrash', '==', true)
                .get();
            
            const results = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    created_at: formatFirestoreDate(data.created_at),
                    updated_at: formatFirestoreDate(data.updated_at)
                };
            });
            
            return results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        } catch (error) {
            console.error('Error loading trash canvases from Firestore:', error);
            return [];
        }
    }

    async function restoreFromTrash(canvasId) {
        try {
            const userId = auth.currentUser?.uid || 'guest';
            await db.collection('users').doc(userId).collection('canvases').doc(canvasId).update({
                isTrash: false,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error restoring canvas from trash:', error);
            throw error;
        }
    }

    async function permanentlyDeleteCanvas(canvasId) {
        try {
            const userId = auth.currentUser?.uid || 'guest';
            await db.collection('users').doc(userId).collection('canvases').doc(canvasId).delete();
            return true;
        } catch (error) {
            console.error('Error permanently deleting canvas:', error);
            throw error;
        }
    }

    async function getAllSavedCanvases() {
        try {
            const userId = auth.currentUser?.uid || 'guest';
            const snapshot = await db.collection('users').doc(userId).collection('canvases')
                .where('isTrash', 'in', [false, null])
                .orderBy('updated_at', 'desc')
                .get();
            
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    created_at: formatFirestoreDate(data.created_at),
                    updated_at: formatFirestoreDate(data.updated_at)
                };
            });
        } catch (error) {
            console.error('Error loading canvases from Firestore:', error);
            try {
                const userId = auth.currentUser?.uid || 'guest';
                const snapshot = await db.collection('users').doc(userId).collection('canvases')
                    .orderBy('updated_at', 'desc')
                    .get();
                
                return snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        created_at: formatFirestoreDate(data.created_at),
                        updated_at: formatFirestoreDate(data.updated_at)
                    };
                }).filter(canvas => !canvas.isTrash);
            } catch (fallbackError) {
                console.error('Fallback query also failed:', fallbackError);
                return [];
            }
        }
    }

    function formatFirestoreDate(dateValue) {
        if (!dateValue) return null;
        
        if (typeof dateValue.toDate === 'function') {
            return dateValue.toDate().toISOString();
        }
        
        if (typeof dateValue === 'string') {
            return dateValue;
        }
        
        if (dateValue instanceof Date) {
            return dateValue.toISOString();
        }
        
        if (typeof dateValue === 'object' && dateValue.seconds) {
            return new Date(dateValue.seconds * 1000).toISOString();
        }
        
        return new Date().toISOString();
    }

    async function getCanvasById(canvasId) {
        try {
            const userId = auth.currentUser?.uid || 'guest';
            const doc = await db.collection('users').doc(userId).collection('canvases').doc(canvasId).get();
            if (doc.exists) {
                const data = doc.data();
                return {
                    ...data,
                    created_at: formatFirestoreDate(data.created_at),
                    updated_at: formatFirestoreDate(data.updated_at)
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting canvas from Firestore:', error);
            return null;
        }
    }

    async function deleteCanvas(canvasId) {
        try {
            const userId = auth.currentUser?.uid || 'guest';
            await db.collection('users').doc(userId).collection('canvases').doc(canvasId).delete();
        } catch (error) {
            console.error('Error deleting canvas from Firestore:', error);
            throw error;
        }
    }

    function filterCanvasGallery(searchTerm) {
        if (!canvasGalleryGrid) return;
        
        const cards = canvasGalleryGrid.querySelectorAll('.canvas-card');
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            cards.forEach(card => {
                card.style.display = 'block';
            });
            return;
        }
        
        cards.forEach(card => {
            const title = card.querySelector('.canvas-title');
            const description = card.querySelector('.canvas-description');
            
            const titleText = title ? title.textContent.toLowerCase() : '';
            const descText = description ? description.textContent.toLowerCase() : '';
            
            if (titleText.includes(term) || descText.includes(term)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    function formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        
        if (diffSeconds < 60) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
        } else if (diffMonths < 12) {
            return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
        } else {
            return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
        }
    }
});
