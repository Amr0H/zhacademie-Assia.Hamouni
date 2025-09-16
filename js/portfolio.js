document.addEventListener('DOMContentLoaded', async function() {
    await initializeAuth();

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

    let files = [];
    let folders = [];
    let pendingFiles = [];
    let currentView = 'grid';
    let editingFileId = null;
    let currentFolderId = '';
    let draggedFileId = null;
    let draggedFolderId = null;
    let dragGhost = null;
    let isDragging = false;
    let dragType = null;

    const addFileBtn = document.getElementById('addFileBtn');
    const addOptionsBtn = document.getElementById('addOptionsBtn');
    const addOptionsMenu = document.getElementById('addOptionsMenu');
    const uploadFilesOption = document.getElementById('uploadFilesOption');
    const createDocumentOption = document.getElementById('createDocumentOption');
    const createFolderBtn = document.getElementById('createFolderBtn');
    const uploadArea = document.getElementById('uploadArea');
    const browseFilesBtn = document.getElementById('browseFilesBtn');
    const fileInput = document.getElementById('fileInput');
    const portfolioGrid = document.getElementById('portfolioGrid');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    const breadcrumb = document.getElementById('breadcrumb');
    
    const addFileModal = document.getElementById('addFileModal');
    const closeAddFileModal = document.getElementById('closeAddFileModal');
    const filesToUpload = document.getElementById('filesToUpload');
    const uploadFilesList = document.getElementById('uploadFilesList');
    const clearFilesBtn = document.getElementById('clearFilesBtn');
    const uploadFilesBtn = document.getElementById('uploadFilesBtn');
    
    const fileDetailsModal = document.getElementById('fileDetailsModal');
    const fileDetailsForm = document.getElementById('fileDetailsForm');
    const closeFileDetailsModal = document.getElementById('closeFileDetailsModal');
    const cancelFileDetails = document.getElementById('cancelFileDetails');
    
    const previewModal = document.getElementById('previewModal');
    const closePreviewModal = document.getElementById('closePreviewModal');
    const previewContent = document.getElementById('previewContent');
    const downloadFromPreview = document.getElementById('downloadFromPreview');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomLevel = document.getElementById('zoomLevel');
    const prevFileBtn = document.getElementById('prevFileBtn');
    const nextFileBtn = document.getElementById('nextFileBtn');
    const fileCounter = document.getElementById('fileCounter');

    const confirmModal = document.getElementById('confirmModal');
    const closeConfirmModal = document.getElementById('closeConfirmModal');
    const cancelConfirm = document.getElementById('cancelConfirm');
    const confirmAction = document.getElementById('confirmAction');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');

    const createFolderModal = document.getElementById('createFolderModal');
    const createFolderForm = document.getElementById('createFolderForm');
    const closeCreateFolderModal = document.getElementById('closeCreateFolderModal');
    const cancelCreateFolder = document.getElementById('cancelCreateFolder');

    const documentEditorModal = document.getElementById('documentEditorModal');
    const closeDocumentEditorModal = document.getElementById('closeDocumentEditorModal');
    const saveDocumentBtn = document.getElementById('saveDocumentBtn');
    const documentEditor = document.getElementById('documentEditor');
    const documentTitle = document.getElementById('documentTitle');
    const documentCategory = document.getElementById('documentCategory');

    const exportPortfolioBtn = document.getElementById('exportPortfolioBtn');
    
    let editingFolderId = null;
    let currentZoom = 100;
    let currentPreviewFileIndex = 0;
    let previewableFiles = [];

    const totalFiles = document.getElementById('totalFiles');
    const totalFolders = document.getElementById('totalFolders');
    const totalSize = document.getElementById('totalSize');

    let pendingConfirmAction = null;
    let isInitialLoading = true;

    showInitialLoading();
    await loadFiles();
    await loadFolders();
    isInitialLoading = false;
    updateStats();
    renderPortfolio();
    setupEventListeners();

    function setupEventListeners() {
        addFileBtn.addEventListener('click', () => addFileModal.classList.add('active'));
        addOptionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addOptionsMenu.classList.toggle('active');
        });
        
        uploadFilesOption.addEventListener('click', () => {
            addOptionsMenu.classList.remove('active');
            addFileModal.classList.add('active');
        });
        
        createDocumentOption.addEventListener('click', () => {
            addOptionsMenu.classList.remove('active');
            openDocumentEditor();
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-group')) {
                addOptionsMenu.classList.remove('active');
            }
        });
        
        createFolderBtn.addEventListener('click', () => createFolderModal.classList.add('active'));
        exportPortfolioBtn.addEventListener('click', exportPortfolio);
        browseFilesBtn.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('click', (e) => {
            if (e.target === uploadArea || e.target.closest('.upload-content')) {
                fileInput.click();
            }
        });
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        
        fileInput.addEventListener('change', handleFileSelect);
        
        categoryFilter.addEventListener('change', () => renderPortfolio());
        searchInput.addEventListener('input', debounce(() => renderPortfolio(), 300));
        sortSelect.addEventListener('change', () => renderPortfolio());
        
        gridView.addEventListener('click', () => setView('grid'));
        listView.addEventListener('click', () => setView('list'));
        
        clearFilesBtn.addEventListener('click', clearPendingFiles);
        uploadFilesBtn.addEventListener('click', uploadPendingFiles);
        
        [closeAddFileModal].forEach(btn => {
            btn.addEventListener('click', () => {
                addFileModal.classList.remove('active');
                clearPendingFiles();
            });
        });
        
        [closeFileDetailsModal, cancelFileDetails].forEach(btn => {
            btn.addEventListener('click', () => fileDetailsModal.classList.remove('active'));
        });
        
        closePreviewModal.addEventListener('click', () => previewModal.classList.remove('active'));
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        zoomInBtn.addEventListener('click', () => adjustZoom(25));
        zoomOutBtn.addEventListener('click', () => adjustZoom(-25));
        prevFileBtn.addEventListener('click', showPreviousFile);
        nextFileBtn.addEventListener('click', showNextFile);
        
        setupModalResize();
        setupDocumentEditor();
        
        [closeCreateFolderModal, cancelCreateFolder].forEach(btn => {
            btn.addEventListener('click', () => {
                createFolderModal.classList.remove('active');
                createFolderForm.reset();
                editingFolderId = null;
                document.getElementById('createFolderModal').querySelector('.modal-title').textContent = 'Create New Folder';
            });
        });
        
        createFolderForm.addEventListener('submit', handleFolderSave);
        
        [closeConfirmModal, cancelConfirm].forEach(btn => {
            btn.addEventListener('click', () => {
                confirmModal.classList.remove('active');
                pendingConfirmAction = null;
            });
        });
        
        confirmAction.addEventListener('click', () => {
            if (pendingConfirmAction) {
                pendingConfirmAction();
                confirmModal.classList.remove('active');
                pendingConfirmAction = null;
            }
        });
        
        fileDetailsForm.addEventListener('submit', handleFileSave);
        
        [closeDocumentEditorModal].forEach(btn => {
            btn.addEventListener('click', () => {
                documentEditorModal.classList.remove('active');
                clearDocumentEditor();
            });
        });
        
        saveDocumentBtn.addEventListener('click', saveDocument);
        
        document.addEventListener('click', (e) => {
            if (e.target === addFileModal) {
                addFileModal.classList.remove('active');
                clearPendingFiles();
            }
            if (e.target === fileDetailsModal) fileDetailsModal.classList.remove('active');
            if (e.target === previewModal) previewModal.classList.remove('active');
            if (e.target === confirmModal) {
                confirmModal.classList.remove('active');
                pendingConfirmAction = null;
            }
            if (e.target === createFolderModal) {
                createFolderModal.classList.remove('active');
                createFolderForm.reset();
                editingFolderId = null;
                document.getElementById('createFolderModal').querySelector('.modal-title').textContent = 'Create New Folder';
            }
            if (e.target === documentEditorModal) {
                documentEditorModal.classList.remove('active');
                clearDocumentEditor();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (previewModal.classList.contains('active')) {
                if (e.key === 'ArrowLeft') showPreviousFile();
                if (e.key === 'ArrowRight') showNextFile();
                if (e.key === 'Escape') previewModal.classList.remove('active');
            }
        });
    }

    function handleDragOver(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        addFilesToPending(files);
    }

    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        addFilesToPending(files);
        e.target.value = '';
    }

    const allowedFileTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png'
    ];

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];

    function isFileTypeAllowed(file) {
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        const mimeType = file.type.toLowerCase();
        
        return allowedFileTypes.includes(mimeType) || allowedExtensions.includes(fileExtension);
    }

    function addFilesToPending(files) {
        const validFiles = [];
        const invalidFiles = [];
        
        files.forEach(file => {
            if (!isFileTypeAllowed(file)) {
                invalidFiles.push(file.name);
                return;
            }
            
            if (!pendingFiles.find(f => f.name === file.name && f.size === file.size)) {
                validFiles.push(file);
                pendingFiles.push(file);
            }
        });
        
        if (invalidFiles.length > 0) {
            showNotification(`Invalid file types: ${invalidFiles.join(', ')}. Only PDF, JPG, PNG files are allowed.`, 'error');
        }
        
        if (validFiles.length > 0) {
            renderPendingFiles();
            filesToUpload.style.display = 'block';
        }
    }

    function renderPendingFiles() {
        uploadFilesList.innerHTML = pendingFiles.map((file, index) => {
            const fileIcon = getFileIcon(file.type);
            const fileSize = formatFileSize(file.size);
            
            return `
                <div class="upload-file-item" data-index="${index}">
                    <div class="upload-file-icon">
                        <i class="${fileIcon}"></i>
                    </div>
                    <div class="upload-file-info">
                        <div class="upload-file-name">${file.name.replace(/\.[^/.]+$/, '')}</div>
                        <div class="upload-file-size">${fileSize}</div>
                        <div class="upload-progress-bar" style="display: none;">
                            <div class="upload-progress-fill"></div>
                            <div class="upload-progress-text">0%</div>
                        </div>
                    </div>
                    <button type="button" class="upload-file-remove" onclick="removePendingFile(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    window.removePendingFile = function(index) {
        pendingFiles.splice(index, 1);
        renderPendingFiles();
        
        if (pendingFiles.length === 0) {
            filesToUpload.style.display = 'none';
        }
    };

    function clearPendingFiles() {
        pendingFiles = [];
        filesToUpload.style.display = 'none';
        uploadFilesList.innerHTML = '';
    }

    async function uploadPendingFiles() {
        if (pendingFiles.length === 0) return;

        const user = currentUser || auth.currentUser;
        if (!user) {
            showNotification('Please log in to upload files', 'error');
            return;
        }

        if (!window.navigator.onLine) {
            showNotification('No internet connection. Please check your connection and try again.', 'error');
            return;
        }

        uploadFilesBtn.disabled = true;
        uploadFilesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        const uploadPromises = pendingFiles.map((file, index) => uploadFileWithProgress(file, index));

        try {
            const results = await Promise.allSettled(uploadPromises);
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failCount = results.filter(r => r.status === 'rejected').length;

            if (successCount > 0) {
                showNotification(`${successCount} file(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}`, successCount > failCount ? 'success' : 'warning');
                addFileModal.classList.remove('active');
                clearPendingFiles();
                await loadFiles();
                updateStats();
                renderPortfolio();
            } else if (failCount > 0) {
                showNotification(`All ${failCount} files failed to upload. Please try again.`, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showNotification('Upload failed. Please try again.', 'error');
        }

        uploadFilesBtn.disabled = false;
        uploadFilesBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Files';
    }

    function updateFileProgress(fileIndex, progress, status = '') {
        const fileItem = document.querySelector(`[data-index="${fileIndex}"]`);
        if (!fileItem) return;

        const progressBar = fileItem.querySelector('.upload-progress-bar');
        const progressFill = fileItem.querySelector('.upload-progress-fill');
        const progressText = fileItem.querySelector('.upload-progress-text');
        const fileSize = fileItem.querySelector('.upload-file-size');

        if (progress === 0 && status === 'Starting...') {
            progressBar.style.display = 'block';
            fileSize.style.display = 'none';
        }

        const clampedProgress = Math.min(Math.max(progress, 0), 100);
        progressFill.style.width = `${clampedProgress}%`;
        progressText.textContent = status || `${Math.round(clampedProgress)}%`;

        if (progress >= 100) {
            progressText.textContent = 'Complete';
            progressFill.style.backgroundColor = '#28a745';
        } else if (progress > 0) {
            progressText.textContent = `${Math.round(clampedProgress)}%`;
        }
    }

    async function uploadFileWithProgress(file, index) {
        const name = document.getElementById('fileName').value.trim();
        const notes = document.getElementById('fileNotes').value.trim();
        const category = document.getElementById('fileCategory').value;
        const tags = document.getElementById('fileTags').value.trim();

        updateFileProgress(index, 0, 'Starting...');

        try {
            let downloadURL;
            let fileRef;

            if (!currentUser) {
                throw new Error('User not authenticated. Please log in again.');
            }

            const user = currentUser || auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated. Please log in again.');
            }

            updateFileProgress(index, 10, 'Uploading file...');
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'portfolio_uploads');
                formData.append('folder', `users/${user.uid}/portfolio`);
                formData.append('resource_type', 'image');
                
                if (file.type.startsWith('image/')) {
                    formData.append('quality', 'auto:good');
                }

                const xhr = new XMLHttpRequest();
                
                const uploadPromise = new Promise((resolve, reject) => {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const percentComplete = (e.loaded / e.total) * 60;
                            updateFileProgress(index, 10 + percentComplete, `${Math.round(10 + percentComplete)}%`);
                        }
                    });

                    xhr.addEventListener('load', () => {
                        if (xhr.status === 200) {
                            updateFileProgress(index, 75, 'Processing...');
                            resolve(JSON.parse(xhr.responseText));
                        } else {
                            reject(new Error(`Upload failed: ${xhr.status}`));
                        }
                    });

                    xhr.addEventListener('error', () => {
                        reject(new Error('Network error during upload'));
                    });

                    xhr.open('POST', `https://api.cloudinary.com/v1_1/${window.cloudinaryConfig.cloudName}/image/upload`);
                    xhr.send(formData);
                });

                const data = await uploadPromise;
                downloadURL = data.secure_url.replace(/\.(pdf|txt|doc|docx|ppt|pptx|xls|xlsx)$/, '.jpg');
                fileRef = { fullPath: `cloudinary/${data.public_id}` };
                updateFileProgress(index, 80, 'File processed...');
                
                console.log('Cloudinary upload success:', {
                    originalName: file.name,
                    size: file.size,
                    type: file.type,
                    downloadURL: downloadURL,
                    publicId: data.public_id
                });
            } catch (cloudinaryError) {
                console.warn('Cloudinary failed, using Firebase Storage:', cloudinaryError);
                updateFileProgress(index, 20, 'Trying alternative upload...');
                
                const fileName = `${Date.now()}_${file.name}`;
                const storageRef = storage.ref(`users/${user.uid}/portfolio/${fileName}`);
                
                const uploadTask = storageRef.put(file);
                
                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', 
                        (snapshot) => {
                            const progress = 20 + (snapshot.bytesTransferred / snapshot.totalBytes) * 55;
                            updateFileProgress(index, progress, `${Math.round(progress)}%`);
                        },
                        reject,
                        resolve
                    );
                });

                downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                fileRef = uploadTask.snapshot.ref;
                updateFileProgress(index, 80, 'Upload complete...');
            }

            updateFileProgress(index, 90, 'Saving...');

            const fileData = {
                name: file.name.replace(/\.[^/.]+$/, ''),
                originalName: file.name,
                downloadURL,
                mimeType: file.type || 'application/octet-stream',
                size: file.size,
                category: 'other',
                notes: '',
                tags: '',
                folderId: currentFolderId,
                storageRef: fileRef.fullPath,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(user.uid).collection('portfolio').add(fileData);
            updateFileProgress(index, 100, 'Complete');

            return fileData;
        } catch (error) {
            console.error('Upload error for file:', file.name, error);
            
            let errorMessage = 'Upload failed';
            if (error.message.includes('not authenticated')) {
                errorMessage = 'Please log in';
            } else if (error.message.includes('permission')) {
                errorMessage = 'Permission denied';
            } else if (error.message.includes('quota')) {
                errorMessage = 'Storage full';
            } else if (error.message.includes('network')) {
                errorMessage = 'Network error';
            } else if (error.message.includes('Cloudinary')) {
                errorMessage = 'Upload service error';
            }
            
            updateFileProgress(index, 0, errorMessage);
            const fileItem = document.querySelector(`[data-index="${index}"]`);
            if (fileItem) {
                const progressFill = fileItem.querySelector('.upload-progress-fill');
                const progressText = fileItem.querySelector('.upload-progress-text');
                progressFill.style.backgroundColor = '#dc3545';
                progressText.style.color = '#dc3545';
            }
            throw error;
        }
    }

    async function loadFiles() {
        try {
            const user = currentUser || auth.currentUser;
            if (!user) return;
            
            const snapshot = await db.collection('users').doc(user.uid).collection('portfolio').orderBy('createdAt', 'desc').get();
            files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }

    async function loadFolders() {
        try {
            const user = currentUser || auth.currentUser;
            if (!user) {
                return;
            }
            
            const snapshot = await db.collection('users').doc(user.uid).collection('folders').orderBy('createdAt', 'desc').get();
            folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error loading folders:', error);
            showNotification('Error loading folders. Please refresh the page.', 'error');
        }
    }

    async function handleFolderSave(e) {
        e.preventDefault();
        
        const name = document.getElementById('folderName').value.trim();
        const description = document.getElementById('folderDescription').value.trim();
        
        if (!name) {
            showNotification('Please enter a folder name', 'error');
            return;
        }
        
        if (folders.some(folder => 
            folder.name.toLowerCase() === name.toLowerCase() && 
            folder.parentId === currentFolderId &&
            folder.id !== editingFolderId
        )) {
            showNotification('A folder with this name already exists', 'error');
            return;
        }
        
        try {
            const user = currentUser || auth.currentUser;
            if (!user) {
                showNotification('Please log in to save folders', 'error');
                return;
            }

            if (!db) {
                showNotification('Database not initialized. Please refresh the page.', 'error');
                return;
            }
            
            if (editingFolderId) {
                const updateData = {
                    name,
                    description,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('users').doc(user.uid).collection('folders').doc(editingFolderId).update(updateData);
                
                const folderIndex = folders.findIndex(f => f.id === editingFolderId);
                if (folderIndex !== -1) {
                    folders[folderIndex] = { ...folders[folderIndex], name, description };
                }
                
                showNotification('Folder updated successfully', 'success');
            } else {
                const now = new Date();
                const folderData = {
                    name,
                    description,
                    parentId: currentFolderId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const docRef = await db.collection('users').doc(user.uid).collection('folders').add(folderData);
                
                const newFolder = { 
                    id: docRef.id, 
                    name,
                    description,
                    parentId: currentFolderId,
                    createdAt: { toDate: () => now },
                    updatedAt: { toDate: () => now }
                };
                
                folders.push(newFolder);
                
                showNotification('Folder created successfully', 'success');
            }
            
            createFolderModal.classList.remove('active');
            createFolderForm.reset();
            editingFolderId = null;
            document.getElementById('createFolderModal').querySelector('.modal-title').textContent = 'Create New Folder';
            updateStats();
            renderPortfolio();
        } catch (error) {
            console.error('Error saving folder:', error);
            showNotification(`Error saving folder: ${error.message}`, 'error');
        }
    }

    function updateStats() {
        const currentFiles = files.filter(f => f.folderId === currentFolderId);
        const currentFolders = folders.filter(f => f.parentId === currentFolderId);
        const totalSizeBytes = currentFiles.reduce((sum, f) => sum + (f.size || 0), 0);
        const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(1);
        
        totalFiles.textContent = currentFiles.length;
        totalFolders.textContent = currentFolders.length;
        totalSize.textContent = totalSizeMB + ' MB';
    }

    function showInitialLoading() {
        isInitialLoading = true;
        
        
    }

    function renderPortfolio() {
        if (isInitialLoading) {
            return;
        }
        
        const currentFiles = files.filter(f => f.folderId === currentFolderId);
        const currentFolders = folders.filter(f => f.parentId === currentFolderId);
        const filteredFiles = filterAndSortFiles(currentFiles);
        
        updateBreadcrumb();
        
        if (filteredFiles.length === 0 && currentFolders.length === 0) {
            portfolioGrid.innerHTML = `
                <div class="empty-state" onclick="document.getElementById('addFileBtn').click()" style="cursor: pointer;">
                    <div class="empty-icon">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <h3 class="empty-title">${currentFolderId ? 'Folder is Empty' : 'No Files Yet'}</h3>
                    <p class="empty-description">${currentFolderId ? 'This folder contains no files or subfolders' : 'Start building your portfolio by uploading your first document'}</p>
                </div>
            `;
            return;
        }

        portfolioGrid.className = `portfolio-grid ${currentView === 'list' ? 'list-view' : ''}`;

        const foldersHtml = currentFolders.map(folder => {
            const folderFiles = files.filter(f => f.folderId === folder.id);
            
            return `
                <div class="file-card folder-card ${currentView === 'list' ? 'list-view' : ''}" data-folder-id="${folder.id}">
                    <div class="folder-preview">
                        <i class="folder-icon fas fa-folder"></i>
                        <div class="folder-stats">${folderFiles.length} files</div>
                    </div>
                    <div class="file-content">
                        <h3 class="file-name">${folder.name}</h3>
                        ${folder.description ? `<p class="file-notes">${folder.description}</p>` : ''}
                        <div class="file-meta">
                            <span class="file-date">${formatDate(folder.createdAt?.toDate())}</span>
                            <span class="file-size">${folderFiles.length} items</span>
                        </div>
                        <div class="file-actions" onclick="event.stopPropagation();">
                            <div class="action-group">
                                <button class="action-btn edit" onclick="event.stopPropagation(); editFolder('${folder.id}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="event.stopPropagation(); deleteFolder('${folder.id}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const filesHtml = filteredFiles.map(file => {
            const fileIcon = getFileIcon(file.mimeType);
            const fileSize = formatFileSize(file.size);
            const isImage = true;
            
            let displayURL = file.downloadURL;
            if (!file.mimeType?.startsWith('image/')) {
                displayURL = file.downloadURL.replace(/\.(pdf|txt|doc|docx|ppt|pptx|xls|xlsx)$/, '.jpg');
            }
            
            return `
                <div class="file-card ${file.starred ? 'starred' : ''} ${currentView === 'list' ? 'list-view' : ''}" data-id="${file.id}">
                    <div class="file-preview ${isImage ? 'loading' : ''}">
                        ${isImage ? `
                            <div class="loading-spinner"></div>
                            <img src="${displayURL}" alt="${file.name}" class="loading" onload="handleImageLoad(this)" onerror="handleImageError(this)">
                        ` : `<i class="file-icon ${fileIcon}"></i>`}
                        <div class="file-category-badge">${getCategoryLabel(file.category)}</div>
                    </div>
                    <div class="file-content">
                        <h3 class="file-name">${file.name}</h3>
                        ${file.notes ? `<p class="file-notes">${file.notes}</p>` : ''}
                        <div class="file-meta">
                            <span class="file-date">${formatDate(file.createdAt?.toDate())}</span>
                            <span class="file-size">${fileSize}</span>
                        </div>
                        ${file.tags ? `
                            <div class="file-tags">
                                ${file.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div class="file-actions">
                            <div class="action-group">
                                <button class="action-btn star ${file.starred ? 'starred' : ''}" onclick="toggleStar('${file.id}')" title="${file.starred ? 'Remove from favorites' : 'Add to favorites'}">
                                    <i class="fas fa-star"></i>
                                </button>
                                <button class="action-btn preview" onclick="previewFile('${file.id}')" title="Preview">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn download" onclick="downloadFile('${file.id}')" title="Download">
                                    <i class="fas fa-download"></i>
                                </button>
                                <button class="action-btn edit" onclick="editFile('${file.id}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="deleteFile('${file.id}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        portfolioGrid.innerHTML = foldersHtml + filesHtml;
        setupDragAndDrop();
    }

    function updateBreadcrumb() {
        const breadcrumbItems = [];
        let currentPath = currentFolderId;
        
        while (currentPath) {
            const folder = folders.find(f => f.id === currentPath);
            if (folder) {
                breadcrumbItems.unshift({
                    id: folder.id,
                    name: folder.name
                });
                currentPath = folder.parentId;
            } else {
                break;
            }
        }
        
        breadcrumbItems.unshift({
            id: '',
            name: 'Portfolio',
            icon: 'fas fa-home'
        });
        
        breadcrumb.innerHTML = breadcrumbItems.map((item, index) => {
            const isActive = index === breadcrumbItems.length - 1;
            return `
                <span class="breadcrumb-item ${isActive ? 'active' : ''}" data-folder="${item.id}" onclick="navigateToFolder('${item.id}')">
                    ${item.icon ? `<i class="${item.icon}"></i>` : ''}
                    ${item.name}
                </span>
            `;
        }).join('');
    }

    function getFileIcon(mimeType) {
        if (!mimeType) return 'fas fa-file';
        
        if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
        if (mimeType.includes('text')) return 'fas fa-file-alt';
        if (mimeType.includes('image')) return 'fas fa-file-image';
        if (mimeType.includes('video')) return 'fas fa-file-video';
        if (mimeType.includes('audio')) return 'fas fa-file-audio';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'fas fa-file-excel';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'fas fa-file-powerpoint';
        
        return 'fas fa-file';
    }

    function getCategoryLabel(category) {
        const labels = {
            'academic': 'Academic',
            'personal': 'Personal',
            'transcripts': 'Transcript',
            'recommendations': 'Letter',
            'certificates': 'Certificate',
            'projects': 'Project',
            'other': 'Other'
        };
        return labels[category] || 'Other';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function setView(view) {
        currentView = view;
        
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        if (view === 'grid') {
            gridView.classList.add('active');
        } else {
            listView.classList.add('active');
        }
        
        renderPortfolio();
    }

    function filterAndSortFiles(fileList = files) {
        let filteredFiles = [...fileList];
        
        const categoryValue = categoryFilter.value;
        const searchValue = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;

        if (categoryValue) {
            filteredFiles = filteredFiles.filter(file => file.category === categoryValue);
        }

        if (searchValue) {
            filteredFiles = filteredFiles.filter(file =>
                file.name.toLowerCase().includes(searchValue) ||
                (file.notes && file.notes.toLowerCase().includes(searchValue)) ||
                (file.tags && file.tags.toLowerCase().includes(searchValue)) ||
                (file.originalName && file.originalName.toLowerCase().includes(searchValue))
            );
        }

        filteredFiles.sort((a, b) => {
            switch (sortValue) {
                case 'date-asc':
                    return new Date(a.createdAt?.toDate() || 0) - new Date(b.createdAt?.toDate() || 0);
                case 'date-desc':
                    return new Date(b.createdAt?.toDate() || 0) - new Date(a.createdAt?.toDate() || 0);
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'category':
                    return (a.category || 'other').localeCompare(b.category || 'other');
                default:
                    return new Date(b.createdAt?.toDate() || 0) - new Date(a.createdAt?.toDate() || 0);
            }
        });

        return filteredFiles;
    }

    function setupDragAndDrop() {
        const fileCards = document.querySelectorAll('.file-card:not(.folder-card)');
        const folderCards = document.querySelectorAll('.folder-card');
        const portfolioGrid = document.getElementById('portfolioGrid');

        fileCards.forEach(card => {
            card.addEventListener('mousedown', (e) => handleMouseDown(e, 'file'));
            card.addEventListener('dragstart', (e) => e.preventDefault());
        });

        folderCards.forEach(card => {
            card.addEventListener('mousedown', (e) => handleMouseDown(e, 'folder'));
            card.addEventListener('dragstart', (e) => e.preventDefault());
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('dragleave', handleDragLeave);
            card.addEventListener('drop', handleDrop);
        });

        portfolioGrid.addEventListener('dragover', handleGridDragOver);
        portfolioGrid.addEventListener('drop', handleGridDrop);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    function createDragGhost(element) {
        const rect = element.getBoundingClientRect();
        const ghost = element.cloneNode(true);
        
        ghost.style.position = 'fixed';
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.left = rect.left + 'px';
        ghost.style.top = rect.top + 'px';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '10000';
        ghost.style.opacity = '0.8';
        ghost.style.transition = 'none';
        ghost.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
        
        ghost.classList.add('drag-ghost');
        
        document.body.appendChild(ghost);
        return ghost;
    }

    function handleMouseDown(e, type) {
        if (e.button !== 0) return;
        if (e.target.closest('.file-actions')) return;
        
        e.preventDefault();
        
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        dragType = type;
        let startX = e.clientX;
        let startY = e.clientY;
        let offsetX = e.clientX - rect.left;
        let offsetY = e.clientY - rect.top;
        let hasMoved = false;
        
        const startDrag = () => {
            if (!isDragging) {
                isDragging = true;
                
                if (type === 'file') {
                    draggedFileId = card.dataset.id;
                } else {
                    draggedFolderId = card.dataset.folderId;
                }
                
                dragGhost = createDragGhost(card);
                dragGhost.style.left = (startX - offsetX) + 'px';
                dragGhost.style.top = (startY - offsetY) + 'px';
                
                card.style.opacity = '0.4';
                card.classList.add('dragging');
                
                if (type === 'file') {
                    document.querySelectorAll('.folder-card').forEach(folder => {
                        folder.classList.add('drop-zone-active');
                    });
                } else {
                    document.querySelectorAll('.folder-card').forEach(folder => {
                        if (folder.dataset.folderId !== draggedFolderId) {
                            folder.classList.add('drop-zone-active');
                        }
                    });
                }
                
                document.body.classList.add('dragging-active');
            }
        };

        const mouseMoveHandler = (moveEvent) => {
            const deltaX = Math.abs(moveEvent.clientX - startX);
            const deltaY = Math.abs(moveEvent.clientY - startY);
            
            if (!hasMoved && (deltaX > 3 || deltaY > 3)) {
                hasMoved = true;
                startDrag();
            }
            
            if (isDragging && dragGhost) {
                dragGhost.style.left = (moveEvent.clientX - offsetX) + 'px';
                dragGhost.style.top = (moveEvent.clientY - offsetY) + 'px';
            }
        };

        const mouseUpHandler = (upEvent) => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            
            if (!hasMoved && type === 'folder') {
                const folderId = card.dataset.folderId;
                if (folderId) {
                    navigateToFolder(folderId);
                }
            }
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    function handleMouseMove(e) {
        
    }

    function handleMouseUp(e) {
        if (!isDragging) return;

        if (dragGhost) {
            dragGhost.style.display = 'none';
        }
        
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        const folderCard = elementBelow?.closest('.folder-card');
        const portfolioGrid = elementBelow?.closest('#portfolioGrid');
        
        if (folderCard && (draggedFileId || draggedFolderId)) {
            const targetFolderId = folderCard.dataset.folderId;
            
            if (draggedFileId && targetFolderId) {
                moveFileToFolder(draggedFileId, targetFolderId);
            } else if (draggedFolderId && targetFolderId && draggedFolderId !== targetFolderId) {
                moveFolderToFolder(draggedFolderId, targetFolderId);
            }
        } else if (portfolioGrid && !folderCard) {
            if (draggedFileId && currentFolderId !== '') {
                moveFileToFolder(draggedFileId, '');
            } else if (draggedFolderId && currentFolderId !== '') {
                moveFolderToFolder(draggedFolderId, '');
            }
        }

        cleanupDrag();
    }

    function cleanupDrag() {
        if (dragGhost) {
            dragGhost.remove();
            dragGhost = null;
        }

        const draggingCard = document.querySelector('.file-card.dragging');
        if (draggingCard) {
            draggingCard.style.opacity = '';
            draggingCard.classList.remove('dragging');
        }

        document.querySelectorAll('.folder-card').forEach(folder => {
            folder.classList.remove('drop-zone-active', 'drop-target');
        });

        document.body.classList.remove('dragging-active');

        isDragging = false;
        draggedFileId = null;
        draggedFolderId = null;
        dragType = null;
    }

    function handleDragOver(e) {
        if (!draggedFileId && !draggedFolderId) return;
        
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        
        const folderCard = e.currentTarget.closest('.folder-card');
        if (folderCard) {
            const targetFolderId = folderCard.dataset.folderId;
            if (draggedFolderId && draggedFolderId === targetFolderId) return;
            folderCard.classList.add('drop-target');
        }
    }

    function handleDragLeave(e) {
        if (!draggedFileId && !draggedFolderId) return;
        
        const folderCard = e.currentTarget.closest('.folder-card');
        if (folderCard && !folderCard.contains(e.relatedTarget)) {
            folderCard.classList.remove('drop-target');
        }
    }

    function handleGridDragOver(e) {
        if (!draggedFileId && !draggedFolderId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleGridDrop(e) {
        if (!draggedFileId && !draggedFolderId) return;
        e.preventDefault();
        
        if (!e.target.closest('.folder-card')) {
            if (draggedFileId && currentFolderId !== '') {
                moveFileToFolder(draggedFileId, '');
            } else if (draggedFolderId && currentFolderId !== '') {
                moveFolderToFolder(draggedFolderId, '');
            }
        }
    }

    async function handleDrop(e) {
        if (!draggedFileId && !draggedFolderId) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const folderCard = e.currentTarget.closest('.folder-card');
        if (!folderCard) return;
        
        const targetFolderId = folderCard.dataset.folderId;
        
        if (draggedFileId && targetFolderId) {
            await moveFileToFolder(draggedFileId, targetFolderId);
        } else if (draggedFolderId && targetFolderId && draggedFolderId !== targetFolderId) {
            await moveFolderToFolder(draggedFolderId, targetFolderId);
        }
    }

    async function moveFileToFolder(fileId, folderId) {
        try {
            const user = currentUser || auth.currentUser;
            await db.collection('users').doc(user.uid).collection('portfolio').doc(fileId).update({
                folderId: folderId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const fileIndex = files.findIndex(f => f.id === fileId);
            if (fileIndex !== -1) {
                files[fileIndex].folderId = folderId;
            }
            
            updateStats();
            renderPortfolio();
            
            const folderName = folderId ? folders.find(f => f.id === folderId)?.name || 'folder' : 'root';
            showNotification(`File moved to ${folderName} successfully`, 'success');
        } catch (error) {
            console.error('Error moving file:', error);
            showNotification('Error moving file', 'error');
        }
    }

    async function moveFolderToFolder(folderId, targetFolderId) {
        try {
            const user = currentUser || auth.currentUser;
            await db.collection('users').doc(user.uid).collection('folders').doc(folderId).update({
                parentId: targetFolderId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const folderIndex = folders.findIndex(f => f.id === folderId);
            if (folderIndex !== -1) {
                folders[folderIndex].parentId = targetFolderId;
            }
            
            updateStats();
            renderPortfolio();
            
            const targetName = targetFolderId ? folders.find(f => f.id === targetFolderId)?.name || 'folder' : 'root';
            const sourceName = folders.find(f => f.id === folderId)?.name || 'folder';
            showNotification(`Folder "${sourceName}" moved to ${targetName} successfully`, 'success');
        } catch (error) {
            console.error('Error moving folder:', error);
            showNotification('Error moving folder', 'error');
        }
    }

    window.openFolder = function(folderId) {
        currentFolderId = folderId;
        updateStats();
        renderPortfolio();
    };

    window.navigateToFolder = function(folderId) {
        currentFolderId = folderId;
        updateStats();
        renderPortfolio();
    };

    window.editFolder = function(id) {
        const folder = folders.find(f => f.id === id);
        if (!folder) return;

        editingFolderId = id;
        document.getElementById('createFolderModal').querySelector('.modal-title').textContent = 'Edit Folder';
        document.getElementById('folderName').value = folder.name;
        document.getElementById('folderDescription').value = folder.description || '';

        createFolderModal.classList.add('active');
    };

    window.deleteFolder = async function(id) {
        const folder = folders.find(f => f.id === id);
        if (!folder) return;

        const folderFiles = files.filter(f => f.folderId === id);
        const subFolders = folders.filter(f => f.parentId === id);
        
        let message = `Are you sure you want to delete "${folder.name}"?`;
        if (folderFiles.length > 0 || subFolders.length > 0) {
            message += ` This will also delete ${folderFiles.length} files and ${subFolders.length} subfolders.`;
        }

        showConfirmModal(
            'Delete Folder',
            message,
            'Delete',
            'fas fa-trash',
            async () => {
                try {
                    const user = currentUser || auth.currentUser;
                    await db.collection('users').doc(user.uid).collection('folders').doc(id).delete();
                    
                    folders = folders.filter(f => f.id !== id);
                    updateStats();
                    renderPortfolio();
                    showNotification('Folder deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting folder:', error);
                    showNotification('Error deleting folder', 'error');
                }
            }
        );
    };

    window.previewFile = function(id) {
        const file = files.find(f => f.id === id);
        if (!file) return;

        const currentFiles = files.filter(f => f.folderId === currentFolderId);
        previewableFiles = currentFiles;
        currentPreviewFileIndex = currentFiles.findIndex(f => f.id === id);
        
        showFilePreview(file);
        updatePreviewNavigation();
        previewModal.classList.add('active');
    };

    function showFilePreview(file) {
        document.getElementById('previewTitle').textContent = file.name;
        document.getElementById('previewFileSize').textContent = formatFileSize(file.size);
        document.getElementById('previewFileType').textContent = file.mimeType?.split('/')[1]?.toUpperCase() || 'FILE';
        downloadFromPreview.onclick = () => downloadFile(file.id);
        
        currentZoom = 100;
        updateZoomLevel();
        
        if (file.isDocument && file.content) {
            const htmlContent = `
                <div style="font-family: Georgia, serif; line-height: 1.6; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 800px; margin: 0 auto;">
                    <h1 style="color: #2c3e50; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; margin-bottom: 20px;">${file.name}</h1>
                    ${file.content}
                </div>
            `;
            
            previewContent.innerHTML = `
                <div class="document-preview">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; max-width: 100%; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.6; text-align: left; box-sizing: border-box;">
                        ${htmlContent}
                    </div>
                </div>
            `;
        } else {
            let previewURL = file.downloadURL;
            if (!file.mimeType?.startsWith('image/')) {
                previewURL = file.downloadURL.replace(/\.(pdf|txt|doc|docx|ppt|pptx|xls|xlsx)$/, '.jpg');
            }
            
            previewContent.innerHTML = `
                <div class="preview-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading preview...</p>
                </div>
                <img src="${previewURL}" alt="${file.name}" style="opacity: 0; transform: scale(${currentZoom / 100});" onload="handlePreviewImageLoad(this)" onerror="handlePreviewImageError(this)">
            `;
        }
    }

    function updatePreviewNavigation() {
        prevFileBtn.disabled = currentPreviewFileIndex <= 0;
        nextFileBtn.disabled = currentPreviewFileIndex >= previewableFiles.length - 1;
        fileCounter.textContent = `${currentPreviewFileIndex + 1} of ${previewableFiles.length}`;
    }

    function showPreviousFile() {
        if (currentPreviewFileIndex > 0) {
            currentPreviewFileIndex--;
            const file = previewableFiles[currentPreviewFileIndex];
            showFilePreview(file);
            updatePreviewNavigation();
        }
    }

    function showNextFile() {
        if (currentPreviewFileIndex < previewableFiles.length - 1) {
            currentPreviewFileIndex++;
            const file = previewableFiles[currentPreviewFileIndex];
            showFilePreview(file);
            updatePreviewNavigation();
        }
    }

    function adjustZoom(delta) {
        currentZoom = Math.max(25, Math.min(400, currentZoom + delta));
        updateZoomLevel();
        
        const img = previewContent.querySelector('img');
        if (img) {
            img.style.transform = `scale(${currentZoom / 100})`;
        }
    }

    function updateZoomLevel() {
        zoomLevel.textContent = `${currentZoom}%`;
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            previewModal.requestFullscreen();
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Fullscreen';
        } else {
            document.exitFullscreen();
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
        }
    }

    function openDocumentEditor() {
        documentTitle.value = '';
        documentCategory.value = '';
        documentEditor.innerHTML = '<p>Start writing your document here...</p>';
        documentEditorModal.classList.add('active');
        documentTitle.focus();
    }

    function clearDocumentEditor() {
        documentTitle.value = '';
        documentCategory.value = '';
        documentEditor.innerHTML = '<p>Start writing your document here...</p>';
        editingFileId = null;
    }

    function setupDocumentEditor() {
        const toolbarBtns = document.querySelectorAll('.toolbar-btn[data-action]');
        const fontFamily = document.getElementById('fontFamily');
        const fontSize = document.getElementById('fontSize');
        const textColor = document.getElementById('textColor');
        const backgroundColor = document.getElementById('backgroundColor');

        toolbarBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const action = btn.dataset.action;
                
                const range = document.createRange();
                const selection = window.getSelection();
                
                if (selection.rangeCount > 0) {
                    range.setStart(selection.getRangeAt(0).startContainer, selection.getRangeAt(0).startOffset);
                    range.setEnd(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset);
                }
                
                document.execCommand(action, false, null);
                
                documentEditor.focus();
                
                if (range && !range.collapsed) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                
                updateToolbarState();
            });
        });

        fontFamily.addEventListener('change', () => {
            document.execCommand('fontName', false, fontFamily.value);
            documentEditor.focus();
        });

        fontSize.addEventListener('change', () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontSize = fontSize.value;
                try {
                    range.surroundContents(span);
                } catch (e) {
                    const contents = range.extractContents();
                    span.appendChild(contents);
                    range.insertNode(span);
                }
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                document.execCommand('fontSize', false, '7');
                const fontElements = documentEditor.querySelectorAll('font[size="7"]');
                fontElements.forEach(el => {
                    el.style.fontSize = fontSize.value;
                    el.removeAttribute('size');
                });
            }
            documentEditor.focus();
        });

        textColor.addEventListener('change', () => {
            document.execCommand('foreColor', false, textColor.value);
            documentEditor.focus();
        });

        backgroundColor.addEventListener('change', () => {
            document.execCommand('backColor', false, backgroundColor.value);
            documentEditor.focus();
        });

        documentEditor.addEventListener('mouseup', updateToolbarState);
        documentEditor.addEventListener('keyup', updateToolbarState);

        function updateToolbarState() {
            toolbarBtns.forEach(btn => {
                const action = btn.dataset.action;
                if (document.queryCommandState(action)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    async function saveDocument() {
        const title = documentTitle.value.trim();
        const category = documentCategory.value;
        const content = documentEditor.innerHTML;

        if (!title) {
            showNotification('Please enter a document title', 'error');
            return;
        }

        try {
            const user = currentUser || auth.currentUser;
            if (!user) {
                showNotification('Please log in to save documents', 'error');
                return;
            }

            saveDocumentBtn.disabled = true;
            saveDocumentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: Georgia, serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { color: #2c3e50; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${content}
</body>
</html>`;

            const blob = new Blob([htmlContent], { type: 'text/plain' });
            const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.txt`;
            
            const formData = new FormData();
            formData.append('file', blob, fileName);
            formData.append('upload_preset', 'portfolio_uploads');
            formData.append('folder', `users/${user.uid}/portfolio`);
            formData.append('resource_type', 'raw');

            const response = await fetch(`https://api.cloudinary.com/v1_1/${window.cloudinaryConfig.cloudName}/raw/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const data = await response.json();
            const downloadURL = data.secure_url;

            const fileData = {
                name: title,
                originalName: fileName,
                downloadURL,
                mimeType: 'text/html',
                size: blob.size,
                category: category || 'other',
                notes: 'Created with document editor',
                tags: 'document,created',
                folderId: currentFolderId,
                storageRef: `cloudinary/${data.public_id}`,
                content: content,
                isDocument: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (editingFileId) {
                await db.collection('users').doc(user.uid).collection('portfolio').doc(editingFileId).update({
                    name: title,
                    downloadURL,
                    category: category || 'other',
                    content: content,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                const fileIndex = files.findIndex(f => f.id === editingFileId);
                if (fileIndex !== -1) {
                    files[fileIndex] = { ...files[fileIndex], ...fileData };
                }
                
                showNotification('Document updated successfully', 'success');
                editingFileId = null;
            } else {
                await db.collection('users').doc(user.uid).collection('portfolio').add(fileData);
                showNotification('Document saved successfully', 'success');
            }
            
            documentEditorModal.classList.remove('active');
            clearDocumentEditor();
            
            await loadFiles();
            updateStats();
            renderPortfolio();

        } catch (error) {
            console.error('Error saving document:', error);
            showNotification('Error saving document: ' + error.message, 'error');
        } finally {
            saveDocumentBtn.disabled = false;
            saveDocumentBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        }
    }

    window.downloadFile = function(id) {
        const file = files.find(f => f.id === id);
        if (!file) return;

        console.log('Downloading file:', {
            id: id,
            name: file.name,
            originalName: file.originalName,
            size: file.size,
            downloadURL: file.downloadURL,
            mimeType: file.mimeType
        });

        try {
            let downloadURL = file.downloadURL;
            
            if (!file.mimeType?.startsWith('image/')) {
                downloadURL = file.downloadURL.replace(/\.(pdf|txt|doc|docx|ppt|pptx|xls|xlsx)$/, '.jpg');
            }
            
            fetch(downloadURL)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = file.originalName || file.name;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                })
                .catch(error => {
                    console.error('Download failed:', error);
                    showNotification('Download failed. Please try again.', 'error');
                });
        } catch (error) {
            console.error('Download error:', error);
            showNotification('Download failed. Please try again.', 'error');
        }
    };

    window.editFile = function(id) {
        const file = files.find(f => f.id === id);
        if (!file) return;

        if (file.mimeType === 'text/html' || file.isDocument) {
            editDocument(file);
        } else {
            editingFileId = id;
            document.getElementById('fileDetailsTitle').textContent = 'Edit File Details';
            document.getElementById('fileName').value = file.name;
            document.getElementById('fileCategory').value = file.category || 'other';
            document.getElementById('fileNotes').value = file.notes || '';
            document.getElementById('fileTags').value = file.tags || '';

            fileDetailsModal.classList.add('active');
        }
    };

    function editDocument(file) {
        documentTitle.value = file.name;
        documentCategory.value = file.category || '';
        
        if (file.content) {
            documentEditor.innerHTML = file.content;
        } else {
            documentEditor.innerHTML = '<p>Loading document content...</p>';
            fetch(file.downloadURL)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const bodyContent = doc.body.innerHTML;
                    const titleMatch = bodyContent.match(/<h1[^>]*>(.*?)<\/h1>/);
                    if (titleMatch) {
                        documentEditor.innerHTML = bodyContent.replace(/<h1[^>]*>.*?<\/h1>/, '');
                    } else {
                        documentEditor.innerHTML = bodyContent;
                    }
                })
                .catch(error => {
                    console.error('Error loading document:', error);
                    documentEditor.innerHTML = '<p>Error loading document content.</p>';
                });
        }
        
        editingFileId = file.id;
        documentEditorModal.classList.add('active');
        documentTitle.focus();
    }

    function showConfirmModal(title, message, actionText, actionIcon, onConfirm) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmAction.innerHTML = `<i class="${actionIcon}"></i> ${actionText}`;
        pendingConfirmAction = onConfirm;
        confirmModal.classList.add('active');
    }

    window.deleteFile = async function(id) {
        const file = files.find(f => f.id === id);
        if (!file) return;

        showConfirmModal(
            'Delete File',
            `Are you sure you want to delete "${file.name}"?`,
            'Delete',
            'fas fa-trash',
            async () => {
                try {
                    await db.collection('users').doc(currentUser.uid).collection('portfolio').doc(id).delete();
                    files = files.filter(f => f.id !== id);
                    updateStats();
                    renderPortfolio();
                    showNotification('File deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting file:', error);
                    showNotification('Error deleting file', 'error');
                }
            }
        );
    };

    async function handleFileSave(e) {
        e.preventDefault();

        const updateData = {
            name: document.getElementById('fileName').value.trim(),
            category: document.getElementById('fileCategory').value,
            notes: document.getElementById('fileNotes').value.trim(),
            tags: document.getElementById('fileTags').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!updateData.name) {
            showNotification('Please enter a file name', 'error');
            return;
        }

        if (!updateData.category) {
            showNotification('Please select a category', 'error');
            return;
        }

        try {
            await db.collection('users').doc(currentUser.uid).collection('portfolio').doc(editingFileId).update(updateData);
            
            const fileIndex = files.findIndex(f => f.id === editingFileId);
            if (fileIndex !== -1) {
                files[fileIndex] = { ...files[fileIndex], ...updateData };
            }
            
            updateStats();
            renderPortfolio();
            fileDetailsModal.classList.remove('active');
            fileDetailsForm.reset();
            editingFileId = null;
            showNotification('File updated successfully', 'success');
        } catch (error) {
            console.error('Error updating file:', error);
            showNotification('Error updating file', 'error');
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    window.handleImageLoad = function(img) {
        const preview = img.closest('.file-preview');
        const spinner = preview.querySelector('.loading-spinner');
        
        img.classList.remove('loading');
        img.classList.add('loaded');
        preview.classList.remove('loading');
        
        if (spinner) {
            spinner.remove();
        }
    };

    window.handleImageError = function(img) {
        const preview = img.closest('.file-preview');
        const spinner = preview.querySelector('.loading-spinner');
        const fileCard = img.closest('.file-card');
        const fileId = fileCard.dataset.id;
        const file = files.find(f => f.id === fileId);
        
        preview.classList.remove('loading');
        if (spinner) {
            spinner.remove();
        }
        
        const fileIcon = getFileIcon(file?.mimeType);
        preview.innerHTML = `
            <i class="file-icon ${fileIcon}"></i>
            <div class="file-category-badge">${getCategoryLabel(file?.category)}</div>
        `;
    };

    window.handlePreviewImageLoad = function(img) {
        const loading = img.parentElement.querySelector('.preview-loading');
        if (loading) {
            loading.remove();
        }
        img.style.opacity = '1';
        img.style.transition = 'opacity 0.3s ease-in-out';
    };

    window.handlePreviewImageError = function(img) {
        const previewContent = img.parentElement;
        previewContent.innerHTML = `
            <div class="preview-loading">
                <i class="fas fa-exclamation-triangle" style="font-size: 64px; margin-bottom: 16px; color: #dc3545;"></i>
                <p>Failed to load image</p>
                <button class="btn btn-primary" onclick="downloadFile('${img.closest('.modal').dataset.fileId}')">
                    <i class="fas fa-download"></i>
                    Download File
                </button>
            </div>
        `;
    };

    async function exportPortfolio() {
        try {
            const user = currentUser || auth.currentUser;
            if (!user) {
                showNotification('Please log in to export portfolio', 'error');
                return;
            }

            exportPortfolioBtn.disabled = true;
            exportPortfolioBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';

            const { default: JSZip } = await import('https://cdn.skypack.dev/jszip');
            const zip = new JSZip();

            const currentFiles = files.filter(f => f.folderId === currentFolderId);
            
            if (currentFiles.length === 0) {
                showNotification('No files to export in current folder', 'warning');
                return;
            }

            for (const file of currentFiles) {
                try {
                    const response = await fetch(file.downloadURL);
                    const blob = await response.blob();
                    const fileName = file.originalName || `${file.name}.${file.mimeType?.split('/')[1] || 'file'}`;
                    zip.file(fileName, blob);
                } catch (error) {
                    console.error(`Failed to download ${file.name}:`, error);
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `portfolio_${new Date().toISOString().split('T')[0]}.zip`;
            link.click();
            URL.revokeObjectURL(url);

            showNotification(`Portfolio exported successfully (${currentFiles.length} files)`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            showNotification('Export failed. Please try again.', 'error');
        } finally {
            exportPortfolioBtn.disabled = false;
            exportPortfolioBtn.innerHTML = '<i class="fas fa-file-archive"></i> Export ZIP';
        }
    }

    window.toggleStar = async function(id) {
        try {
            const file = files.find(f => f.id === id);
            if (!file) return;

            const user = currentUser || auth.currentUser;
            const newStarred = !file.starred;

            await db.collection('users').doc(user.uid).collection('portfolio').doc(id).update({
                starred: newStarred,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const fileIndex = files.findIndex(f => f.id === id);
            if (fileIndex !== -1) {
                files[fileIndex].starred = newStarred;
            }

            renderPortfolio();
            showNotification(newStarred ? 'Added to favorites' : 'Removed from favorites', 'success');
        } catch (error) {
            console.error('Error toggling star:', error);
            showNotification('Error updating favorite status', 'error');
        }
    };
    
    function setupModalResize() {
        const modal = document.querySelector('.preview-modal');
        const handles = modal.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            handle.addEventListener('mousedown', startResize);
        });
        
        function startResize(e) {
            e.preventDefault();
            const handle = e.target;
            const rect = modal.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = rect.width;
            const startHeight = rect.height;
            const startLeft = rect.left;
            const startTop = rect.top;
            
            function doResize(e) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;
                
                if (handle.classList.contains('resize-e') || handle.classList.contains('resize-ne') || handle.classList.contains('resize-se')) {
                    newWidth = Math.max(400, startWidth + deltaX);
                }
                if (handle.classList.contains('resize-w') || handle.classList.contains('resize-nw') || handle.classList.contains('resize-sw')) {
                    newWidth = Math.max(400, startWidth - deltaX);
                    newLeft = startLeft + (startWidth - newWidth);
                }
                if (handle.classList.contains('resize-s') || handle.classList.contains('resize-se') || handle.classList.contains('resize-sw')) {
                    newHeight = Math.max(300, startHeight + deltaY);
                }
                if (handle.classList.contains('resize-n') || handle.classList.contains('resize-ne') || handle.classList.contains('resize-nw')) {
                    newHeight = Math.max(300, startHeight - deltaY);
                    newTop = startTop + (startHeight - newHeight);
                }
                
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                newLeft = centerX - newWidth / 2;
                newTop = centerY - newHeight / 2;
                
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - newWidth));
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - newHeight));
                
                modal.style.width = newWidth + 'px';
                modal.style.height = newHeight + 'px';
                modal.style.left = newLeft + 'px';
                modal.style.top = newTop + 'px';
                modal.style.maxWidth = 'none';
                modal.style.maxHeight = 'none';
                modal.style.position = 'fixed';
                
                const previewContent = modal.querySelector('.preview-content');
                previewContent.style.maxHeight = (newHeight - 120) + 'px';
                previewContent.style.height = (newHeight - 120) + 'px';
                
                const img = previewContent.querySelector('img');
                if (img) {
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '100%';
                    img.style.width = 'auto';
                    img.style.height = 'auto';
                    img.style.objectFit = 'contain';
                }
                
                const iframe = previewContent.querySelector('iframe');
                if (iframe) {
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                }
            }
            
            function stopResize() {
                document.removeEventListener('mousemove', doResize);
                document.removeEventListener('mouseup', stopResize);
            }
            
            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopResize);
        }
    }
});
