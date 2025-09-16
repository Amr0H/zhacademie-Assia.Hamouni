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

    let tasks = [];
    let universities = [];
    let categories = ['application', 'documentation', 'research', 'test-prep', 'interview', 'deadline'];
    let calendar;
    let editingTaskId = null;
    let currentView = 'list';
    let filters = {
        search: '',
        status: 'all',
        priority: 'all',
        university: 'all',
        dueDate: 'all',
        category: 'all'
    };
    let sortBy = 'created';
    let sortOrder = 'desc';

    const elements = {
        taskModal: document.getElementById('taskModal'),
        categoryModal: document.getElementById('categoryModal'),
        taskDetailsModal: document.getElementById('taskDetailsModal'),
        deleteModal: document.getElementById('deleteModal'),
        taskForm: document.getElementById('taskForm'),
        categoryForm: document.getElementById('categoryForm'),
        taskList: document.getElementById('taskList'),
        searchInput: document.getElementById('searchTasks'),
        statusFilter: document.getElementById('statusFilter'),
        priorityFilter: document.getElementById('priorityFilter'),
        universityFilter: document.getElementById('universityFilter'),
        dueDateFilter: document.getElementById('dueDateFilter'),
        categoryList: document.getElementById('categoryList'),
        viewBtns: document.querySelectorAll('.view-btn'),
        sortSelect: document.getElementById('sortBy'),
        sortOrderBtn: document.getElementById('sortOrder')
    };

    await initializeData();
    setupEventListeners();
    renderInterface();
    
    setTimeout(() => {
        startTimerUpdates();
    }, 1000);

    let timerInterval;

    async function initializeData() {
        try {
            if (!currentUser) {
                console.error('No current user found');
                showNotification('Authentication required. Please refresh the page.', 'error');
                return;
            }
            
            await Promise.all([
                loadTasks(),
                loadUniversities(),
                loadCategories()
            ]);
            populateSelects();
            updateStats();
            renderTasks();
            initializeCalendar();
            
            setTimeout(() => {
                startTimerUpdates();
            }, 500);
        } catch (error) {
            console.error('Error initializing data:', error);
            showNotification('Error loading data. Please refresh the page.', 'error');
        }
    }

    async function loadTasks() {
        try {
            if (!currentUser || !currentUser.uid) {
                console.error('No authenticated user found');
                return;
            }
            
            const userUid = currentUser.uid.toString();
            
            const snapshot = await db.collection('users').doc(userUid)
                .collection('tasks').orderBy('createdAt', 'desc').get();
            tasks = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: (data.title || '').toString(),
                    description: (data.description || '').toString(),
                    category: (data.category || '').toString(),
                    priority: (data.priority || 'medium').toString(),
                    university: data.university || null,
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    estimatedTime: Number(data.estimatedTime) || 0,
                    progress: Number(data.progress) || 0,
                    status: (data.status || 'pending').toString(),
                    completed: Boolean(data.completed),
                    recurring: Boolean(data.recurring),
                    recurringInterval: data.recurringInterval ? data.recurringInterval.toString() : null,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    dueDate: data.dueDate?.toDate() || null,
                    startDate: data.startDate?.toDate() || null
                };
            });
            
            setTimeout(() => {
                updateAllTimers();
            }, 200);
        } catch (error) {
            console.error('Error loading tasks:', error);
            showNotification('Error loading tasks', 'error');
        }
    }

    async function loadUniversities() {
        try {
            if (!currentUser || !currentUser.uid) {
                console.error('No authenticated user found');
                return;
            }
            
            const userUid = currentUser.uid.toString();
            const snapshot = await db.collection('users').doc(userUid)
                .collection('universities').get();
            universities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error loading universities:', error);
        }
    }

    async function loadCategories() {
        try {
            if (!currentUser || !currentUser.uid) {
                console.error('No authenticated user found');
                return;
            }
            
            const userUid = currentUser.uid.toString();
            const snapshot = await db.collection('users').doc(userUid)
                .collection('categories').get();
            const userCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            categories = [...categories, ...userCategories.map(cat => cat.name)];
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    function populateSelects() {
        const universitySelects = [
            document.getElementById('taskUniversity'),
            elements.universityFilter
        ];
        
        universitySelects.forEach(select => {
            if (!select) return;
            const isFilter = select === elements.universityFilter;
            select.innerHTML = isFilter 
                ? '<option value="all">All Universities</option>'
                : '<option value="">Select University</option>';
            
            universities.forEach(uni => {
                const option = document.createElement('option');
                option.value = uni.id;
                option.textContent = uni.name;
                select.appendChild(option);
            });
        });

        const categorySelect = document.getElementById('taskCategory');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = typeof category === 'string' ? category : category.name;
                option.textContent = typeof category === 'string' 
                    ? category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')
                    : category.name;
                categorySelect.appendChild(option);
            });
        }

        renderCategoryList();
    }

    function renderCategoryList() {
        if (!elements.categoryList) return;
        
        const allTasks = `
            <div class="category-item" data-category="all">
                <span class="category-name">All Tasks</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="category-count">${tasks.length}</span>
                    <span class="category-checkmark"><i class="fas fa-check"></i></span>
                </div>
            </div>
        `;
        
        const categoryItems = categories.map(category => {
            const categoryName = typeof category === 'string' ? category : category.name;
            const count = tasks.filter(task => task.category === categoryName).length;
            return `
                <div class="category-item" data-category="${categoryName}">
                    <span class="category-name">${categoryName.charAt(0).toUpperCase() + categoryName.slice(1).replace('-', ' ')}</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="category-count">${count}</span>
                        <span class="category-checkmark"><i class="fas fa-check"></i></span>
                    </div>
                </div>
            `;
        }).join('');
        
        elements.categoryList.innerHTML = allTasks + categoryItems;
        
        const activeCategory = filters.category || 'all';
        const activeElement = document.querySelector(`[data-category="${activeCategory}"]`);
        if (activeElement) {
            activeElement.classList.add('active');
        }
    }

    function setupEventListeners() {
        document.getElementById('addTaskBtn')?.addEventListener('click', () => openTaskModal());
        document.getElementById('addCategoryBtn')?.addEventListener('click', openCategoryModal);
        document.getElementById('clearFilters')?.addEventListener('click', clearFilters);

        [document.getElementById('closeModal'), document.getElementById('cancelBtn')]
            .forEach(btn => btn?.addEventListener('click', closeTaskModal));
        
        [document.getElementById('closeCategoryModal'), document.getElementById('cancelCategoryBtn')]
            .forEach(btn => btn?.addEventListener('click', closeCategoryModal));
        
        [document.getElementById('closeDeleteModal'), document.getElementById('cancelDeleteBtn')]
            .forEach(btn => btn?.addEventListener('click', closeDeleteModal));
        
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDeleteTask);
        document.getElementById('closeDetailsModal')?.addEventListener('click', closeDetailsModal);

        elements.taskForm?.addEventListener('submit', handleTaskSubmit);
        elements.categoryForm?.addEventListener('submit', handleCategorySubmit);

        elements.searchInput?.addEventListener('input', debounce(handleSearch, 300));
        elements.searchInput?.addEventListener('keydown', handleSearchKeydown);
        elements.statusFilter?.addEventListener('change', handleFilterChange);
        elements.priorityFilter?.addEventListener('change', handleFilterChange);
        elements.universityFilter?.addEventListener('change', handleFilterChange);
        elements.dueDateFilter?.addEventListener('change', handleFilterChange);

        elements.viewBtns?.forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });

        elements.sortSelect?.addEventListener('change', handleSortChange);
        elements.sortOrderBtn?.addEventListener('click', toggleSortOrder);

        elements.categoryList?.addEventListener('click', handleCategorySelect);
        elements.categoryList?.addEventListener('contextmenu', handleCategoryRightClick);

        document.getElementById('taskRecurring')?.addEventListener('change', function() {
            const options = document.getElementById('recurringOptions');
            if (options) {
                options.style.display = this.checked ? 'block' : 'none';
            }
        });

        document.addEventListener('click', handleModalClose);
        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('categoryContextMenu');
            if (contextMenu && !contextMenu.contains(e.target) && !e.target.closest('.category-item')) {
                contextMenu.style.display = 'none';
            }
        });
        
        window.addEventListener('beforeunload', () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        });
    }

    function openTaskModal(taskId = null) {
        if (taskId && typeof taskId === 'object' && taskId.target) {
            taskId = null;
        }
        editingTaskId = taskId;
        const task = taskId ? tasks.find(t => t.id === taskId) : null;
        
        const modal = document.getElementById('taskModal');
        
        if (!modal) {
            console.error('Modal element not found!');
            return;
        }
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = task ? 'Edit Task' : 'Create New Task';
        }
        
        if (task) {
            populateTaskForm(task);
        } else {
            const form = document.getElementById('taskForm');
            if (form) {
                form.reset();
                updateProgressPreview(0);
            }
        }
        
        setupProgressInput();
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function populateTaskForm(task) {
        document.getElementById('taskTitle').value = task.title || '';
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskCategory').value = task.category || '';
        document.getElementById('taskPriority').value = task.priority || 'medium';
        document.getElementById('taskUniversity').value = task.university || '';
        document.getElementById('taskTags').value = task.tags ? task.tags.join(', ') : '';
        document.getElementById('taskEstimatedTime').value = task.estimatedTime || '';
        document.getElementById('taskProgress').value = task.progress || 0;
        
        updateProgressPreview(task.progress || 0);
        
        if (task.startDate) {
            document.getElementById('taskStartDate').value = formatDateTimeLocal(task.startDate);
        }
        if (task.dueDate) {
            document.getElementById('taskDueDate').value = formatDateTimeLocal(task.dueDate);
        }
        
        const recurringCheckbox = document.getElementById('taskRecurring');
        if (recurringCheckbox) {
            recurringCheckbox.checked = task.recurring || false;
            document.getElementById('recurringOptions').style.display = 
                task.recurring ? 'block' : 'none';
            if (task.recurringInterval) {
                document.getElementById('recurringInterval').value = task.recurringInterval;
            }
        }
    }

    function closeTaskModal() {
        elements.taskModal.classList.remove('active');
        editingTaskId = null;
        elements.taskForm.reset();
        document.body.style.overflow = '';
    }

    function openCategoryModal() {
        elements.categoryModal.classList.add('active');
    }

    function closeCategoryModal() {
        elements.categoryModal.classList.remove('active');
        elements.categoryForm.reset();
    }

    function closeDetailsModal() {
        elements.taskDetailsModal.classList.remove('active');
    }

    let taskToDelete = null;

    window.openDeleteModal = function(taskId, taskTitle) {
        taskToDelete = taskId;
        document.getElementById('deleteTaskName').textContent = taskTitle;
        elements.deleteModal.classList.add('active');
    }

    function closeDeleteModal() {
        elements.deleteModal.classList.remove('active');
        taskToDelete = null;
    }

    async function confirmDeleteTask() {
        if (!taskToDelete) return;
        
        if (!currentUser || !currentUser.uid) {
            showNotification('Authentication required', 'error');
            return;
        }

        try {
            const userUid = currentUser.uid.toString();
            const taskId = taskToDelete.toString();
            
            await db.collection('users').doc(userUid)
                .collection('tasks').doc(taskId).delete();
            
            tasks = tasks.filter(t => t.id !== taskToDelete);
            
            try {
                await refreshInterface();
            } catch (refreshError) {
                console.warn('Error during interface refresh:', refreshError);
                renderTasks();
            }
            
            showNotification('Task deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting task:', error);
            showNotification('Error deleting task', 'error');
        } finally {
            closeDeleteModal();
        }
    }

    async function handleTaskSubmit(e) {
        e.preventDefault();
        
        const titleEl = document.getElementById('taskTitle');
        const descriptionEl = document.getElementById('taskDescription');
        const categoryEl = document.getElementById('taskCategory');
        const priorityEl = document.getElementById('taskPriority');
        const universityEl = document.getElementById('taskUniversity');
        const tagsEl = document.getElementById('taskTags');
        const estimatedTimeEl = document.getElementById('taskEstimatedTime');
        const progressEl = document.getElementById('taskProgress');
        const startDateEl = document.getElementById('taskStartDate');
        const dueDateEl = document.getElementById('taskDueDate');
        const recurringEl = document.getElementById('taskRecurring');
        const recurringIntervalEl = document.getElementById('recurringInterval');
        
        if (!titleEl) {
            console.error('Title element not found');
            showNotification('Form error: Title field not found', 'error');
            return;
        }
        
        if (!titleEl.value || !titleEl.value.trim()) {
            console.error('Title is empty');
            showNotification('Task title is required', 'error');
            titleEl.focus();
            return;
        }
        
        const tags = tagsEl && tagsEl.value 
            ? tagsEl.value.toString().split(',').map(tag => tag.trim()).filter(tag => tag)
            : [];
            
        const taskData = {
            title: (titleEl.value || '').toString().trim(),
            description: descriptionEl ? (descriptionEl.value || '').toString().trim() : '',
            category: categoryEl ? (categoryEl.value || '').toString() : '',
            priority: priorityEl ? (priorityEl.value || '').toString() : 'medium',
            university: universityEl && universityEl.value ? universityEl.value.toString() : null,
            tags: tags,
            estimatedTime: estimatedTimeEl ? parseFloat(estimatedTimeEl.value) || 0 : 0,
            progress: progressEl ? Math.max(0, Math.min(100, parseInt(progressEl.value) || 0)) : 0,
            startDate: startDateEl && startDateEl.value 
                ? firebase.firestore.Timestamp.fromDate(new Date(startDateEl.value))
                : null,
            dueDate: dueDateEl && dueDateEl.value 
                ? firebase.firestore.Timestamp.fromDate(new Date(dueDateEl.value))
                : null,
            recurring: recurringEl ? Boolean(recurringEl.checked) : false,
            recurringInterval: recurringEl && recurringEl.checked && recurringIntervalEl 
                ? recurringIntervalEl.value.toString() : null,
            status: editingTaskId ? (tasks.find(t => t.id === editingTaskId)?.status || 'pending').toString() : 'pending',
            completed: editingTaskId ? Boolean(tasks.find(t => t.id === editingTaskId)?.completed) : false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!editingTaskId) {
            taskData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        if (editingTaskId && (typeof editingTaskId === 'object' || editingTaskId.toString().includes('object'))) {
            console.error('Invalid editingTaskId detected:', editingTaskId);
            editingTaskId = null;
        }

        try {
            if (!currentUser || !currentUser.uid) {
                throw new Error('User not authenticated');
            }
            
            const userUid = currentUser.uid.toString();

            if (editingTaskId) {
                await db.collection('users').doc(userUid)
                    .collection('tasks').doc(editingTaskId.toString()).update(taskData);
                
                const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
                if (taskIndex !== -1) {
                    tasks[taskIndex] = { 
                        ...tasks[taskIndex], 
                        ...taskData,
                        dueDate: taskData.dueDate?.toDate() || null,
                        startDate: taskData.startDate?.toDate() || null,
                        updatedAt: new Date()
                    };
                }
                
                showNotification('Task updated successfully', 'success');
            } else {
                const docRef = await db.collection('users').doc(userUid)
                    .collection('tasks').add(taskData);
                
                tasks.unshift({ 
                    id: docRef.id, 
                    ...taskData,
                    dueDate: taskData.dueDate?.toDate() || null,
                    startDate: taskData.startDate?.toDate() || null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                
                showNotification('Task created successfully', 'success');
            }

            await refreshInterface();
            closeTaskModal();
        } catch (error) {
            console.error('Error saving task:', error);
            let errorMessage = 'Error saving task';
            if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please check your authentication.';
            } else if (error.code === 'network-request-failed') {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            showNotification(errorMessage, 'error');
        }
    }

    async function handleCategorySubmit(e) {
        e.preventDefault();
        
        if (!currentUser || !currentUser.uid) {
            showNotification('Authentication required', 'error');
            return;
        }
        
        const categoryData = {
            name: document.getElementById('categoryName').value.toLowerCase().replace(/\s+/g, '-'),
            color: document.getElementById('categoryColor').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            const userUid = currentUser.uid.toString();
            await db.collection('users').doc(userUid)
                .collection('categories').add(categoryData);
            
            categories.push(categoryData.name);
            populateSelects();
            closeCategoryModal();
            showNotification('Category added successfully', 'success');
        } catch (error) {
            console.error('Error adding category:', error);
            showNotification('Error adding category', 'error');
        }
    }

    function handleSearch(e) {
        const searchValue = e.target.value || '';
        filters.search = searchValue.toString().toLowerCase().trim();
        renderTasks();
    }

    function handleSearchKeydown(e) {
        if (e.key === 'Escape') {
            e.target.value = '';
            filters.search = '';
            renderTasks();
        }
    }

    function handleFilterChange(e) {
        const filterType = e.target.id.replace('Filter', '').replace('status', 'status');
        filters[filterType] = e.target.value;
        renderTasks();
    }

    function handleSortChange(e) {
        sortBy = e.target.value;
        renderTasks();
    }

    function toggleSortOrder() {
        sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        elements.sortOrderBtn.innerHTML = sortOrder === 'desc' 
            ? '<i class="fas fa-sort-amount-down"></i>'
            : '<i class="fas fa-sort-amount-up"></i>';
        elements.sortOrderBtn.dataset.order = sortOrder;
        renderTasks();
    }

    function handleCategorySelect(e) {
        const categoryItem = e.target.closest('.category-item');
        if (!categoryItem) return;
        
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        
        categoryItem.classList.add('active');
        
        const selectedCategory = categoryItem.dataset.category;
        filters.category = selectedCategory;
        
        elements.searchInput.placeholder = selectedCategory === 'all' 
            ? 'Search all tasks...' 
            : `Search in ${selectedCategory.replace('-', ' ')}...`;
        
        updateCategoryHeader(selectedCategory);
        renderTasks();
    }

    function handleCategoryRightClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const categoryItem = e.target.closest('.category-item');
        if (!categoryItem || categoryItem.dataset.category === 'all') return;
        
        const contextMenu = document.getElementById('categoryContextMenu');
        if (!contextMenu) return;
        
        const categoryName = categoryItem.dataset.category;
        
        contextMenu.dataset.categoryName = categoryName;
        contextMenu.style.display = 'block';
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.style.zIndex = '9999';
        
        setTimeout(() => {
            const rect = contextMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                contextMenu.style.left = `${e.clientX - rect.width}px`;
            }
            if (rect.bottom > window.innerHeight) {
                contextMenu.style.top = `${e.clientY - rect.height}px`;
            }
        }, 0);
    }

    async function handleDeleteCategory() {
        const contextMenu = document.getElementById('categoryContextMenu');
        const categoryName = contextMenu?.dataset?.categoryName;
        
        if (!categoryName) {
            console.error('No category name found');
            contextMenu.style.display = 'none';
            return;
        }
        
        const defaultCategories = ['application', 'documentation', 'research', 'test-prep', 'interview', 'deadline'];
        if (defaultCategories.includes(categoryName)) {
            showNotification('Cannot delete default categories', 'error');
            contextMenu.style.display = 'none';
            return;
        }
        
        try {
            const userUid = currentUser.uid.toString();
            const snapshot = await db.collection('users').doc(userUid)
                .collection('categories')
                .where('name', '==', categoryName)
                .get();
            
            if (!snapshot.empty) {
                const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
                await Promise.all(deletePromises);
                console.log(`Deleted ${snapshot.docs.length} category documents from Firebase`);
            }
            
            categories = categories.filter(cat => {
                const name = typeof cat === 'string' ? cat : cat.name;
                return name !== categoryName;
            });
            
            const tasksToUpdate = tasks.filter(task => task.category === categoryName);
            for (const task of tasksToUpdate) {
                task.category = '';
                if (task.id) {
                    await db.collection('users').doc(userUid).collection('tasks').doc(task.id).update({
                        category: ''
                    });
                }
            }
            
            if (filters.category === categoryName) {
                filters.category = 'all';
            }
            
            populateSelects();
            renderTasks();
            updateStats();
            
            showNotification(`Category "${categoryName}" deleted successfully`, 'success');
        } catch (error) {
            console.error('Error deleting category:', error);
            showNotification('Error deleting category', 'error');
        }
        
        contextMenu.style.display = 'none';
    }

    window.handleDeleteCategory = async () => await handleDeleteCategory();

    function updateCategoryHeader(selectedCategory) {
        const categoryHeader = document.querySelector('.sidebar-section h3');
        if (categoryHeader) {
            if (selectedCategory === 'all') {
                categoryHeader.textContent = 'Filters & Search';
                categoryHeader.style.color = '';
                categoryHeader.style.borderLeft = '';
                categoryHeader.style.paddingLeft = '';
            } else {
                const displayName = selectedCategory.replace('-', ' ').toUpperCase();
                categoryHeader.textContent = `Filtering: ${displayName}`;
                categoryHeader.style.color = 'var(--primary-color)';
                categoryHeader.style.borderLeft = '4px solid var(--primary-color)';
                categoryHeader.style.paddingLeft = '12px';
                categoryHeader.style.transition = 'all 0.3s ease';
            }
        }
    }

    function clearFilters() {
        filters = {
            search: '',
            status: 'all',
            priority: 'all',
            university: 'all',
            dueDate: 'all',
            category: 'all'
        };
        
        elements.searchInput.value = '';
        elements.statusFilter.value = 'all';
        elements.priorityFilter.value = 'all';
        elements.universityFilter.value = 'all';
        elements.dueDateFilter.value = 'all';
        elements.searchInput.placeholder = 'Search all tasks...';
        
        document.querySelectorAll('.category-item').forEach(item => 
            item.classList.remove('active'));
        const allTasksElement = document.querySelector('.category-item[data-category="all"]');
        if (allTasksElement) {
            allTasksElement.classList.add('active');
        }
        
        updateCategoryHeader('all');
        renderTasks();
    }

    function switchView(view) {
        currentView = view;
        
        elements.viewBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        document.querySelectorAll('.view-content').forEach(content => 
            content.classList.remove('active'));
        document.getElementById(`${view}View`).classList.add('active');
        
        if (view === 'calendar' && calendar) {
            setTimeout(() => calendar.render(), 100);
        }
        
        renderTasks();
        setTimeout(() => updateAllTimers(), 100);
    }

    function filterTasks() {
        const now = new Date();
        
        return tasks.filter(task => {
            if (filters.search) {
                const title = (task.title || '').toString().toLowerCase();
                const description = (task.description || '').toString().toLowerCase();
                const category = (task.category || '').toString().toLowerCase();
                const tags = task.tags ? task.tags.join(' ').toLowerCase() : '';
                const searchTerm = filters.search.toLowerCase();
                
                if (!title.includes(searchTerm) && 
                    !description.includes(searchTerm) && 
                    !category.includes(searchTerm) && 
                    !tags.includes(searchTerm)) {
                    return false;
                }
            }
            
            if (filters.status !== 'all') {
                switch (filters.status) {
                    case 'completed':
                        if (!task.completed) return false;
                        break;
                    case 'pending':
                        if (task.completed) return false;
                        break;
                    case 'overdue':
                        if (!task.dueDate || task.dueDate >= now || task.completed) return false;
                        break;
                }
            }
            
            if (filters.priority !== 'all' && task.priority !== filters.priority) {
                return false;
            }
            
            if (filters.university !== 'all' && task.university !== filters.university) {
                return false;
            }
            
            if (filters.category !== 'all' && task.category !== filters.category) {
                return false;
            }
            
            if (filters.dueDate !== 'all') {
                if (!task.dueDate) return false;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const endOfWeek = new Date(today);
                endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
                const nextWeek = new Date(endOfWeek);
                nextWeek.setDate(nextWeek.getDate() + 7);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                
                const taskDate = new Date(task.dueDate);
                taskDate.setHours(0, 0, 0, 0);
                
                switch (filters.dueDate) {
                    case 'today':
                        if (taskDate.getTime() !== today.getTime()) return false;
                        break;
                    case 'tomorrow':
                        if (taskDate.getTime() !== tomorrow.getTime()) return false;
                        break;
                    case 'this-week':
                        if (taskDate < today || taskDate > endOfWeek) return false;
                        break;
                    case 'next-week':
                        if (taskDate < endOfWeek || taskDate > nextWeek) return false;
                        break;
                    case 'this-month':
                        if (taskDate < today || taskDate > endOfMonth) return false;
                        break;
                }
            }
            
            return true;
        });
    }

    function sortTasks(tasks) {
        return tasks.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'due':
                    aValue = a.dueDate || new Date(0);
                    bValue = b.dueDate || new Date(0);
                    break;
                case 'priority':
                    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                    aValue = priorityOrder[a.priority] || 0;
                    bValue = priorityOrder[b.priority] || 0;
                    break;
                case 'status':
                    aValue = a.completed ? 1 : 0;
                    bValue = b.completed ? 1 : 0;
                    break;
                default:
                    aValue = a.createdAt;
                    bValue = b.createdAt;
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function renderTasks() {
        const filteredTasks = filterTasks();
        const sortedTasks = sortTasks(filteredTasks);
        
        switch (currentView) {
            case 'list':
                renderListView(sortedTasks);
                break;
            case 'board':
                renderBoardView(sortedTasks);
                break;
            case 'calendar':
                updateCalendarEvents();
                break;
        }
        
        updateStats();
        renderCategoryList();
        
        setTimeout(() => {
            updateAllTimers();
        }, 100);
    }

    function renderListView(tasks) {
        if (tasks.length === 0) {
            elements.taskList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No tasks found</h3>
                    <p>Try adjusting your filters or create a new task</p>
                </div>
            `;
            return;
        }

        elements.taskList.innerHTML = tasks.map(task => createTaskElement(task)).join('');
    }

    function renderBoardView(tasks) {
        const columns = {
            pending: document.getElementById('pendingColumn'),
            'in-progress': document.getElementById('inProgressColumn'),
            completed: document.getElementById('completedColumn')
        };
        
        Object.values(columns).forEach(column => {
            if (column) column.innerHTML = '';
        });
        
        tasks.forEach(task => {
            const status = task.completed ? 'completed' : 
                         task.status === 'in-progress' ? 'in-progress' : 'pending';
            const column = columns[status];
            if (column) {
                column.innerHTML += createKanbanCard(task);
            }
        });
        
        updateColumnCounts();
    }

    function createTaskElement(task) {
        if (!task || !task.id) return '';
        
        const isOverdue = task.dueDate && task.dueDate < new Date() && !task.completed;
        const priorityClass = (task.priority || 'medium').toString();
        const universityName = getUniversityName(task.university);
        const title = (task.title || '').toString();
        const description = (task.description || '').toString();
        const category = (task.category || '').toString();
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} ${task.priority === 'urgent' ? 'urgent' : ''}" 
                 data-id="${task.id}" onclick="openTaskDetails('${task.id}')">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                       onchange="event.stopPropagation(); toggleTask('${task.id}')" onclick="event.stopPropagation()">
                
                <div class="task-main">
                    <div class="task-header">
                        <h4 class="task-title">${title}</h4>
                    </div>
                    
                    ${description ? `<p class="task-description">${description}</p>` : ''}
                    
                    <div class="task-meta">
                        ${category ? `
                            <div class="task-meta-item">
                                <i class="fas fa-tag"></i>
                                <span>${category.replace(/-/g, ' ')}</span>
                            </div>
                        ` : ''}
                        
                        ${task.dueDate ? `
                            <div class="task-meta-item">
                                <i class="fas fa-clock"></i>
                                <span>Due: ${formatDateTime(task.dueDate)}</span>
                            </div>
                        ` : ''}
                        
                        ${universityName ? `
                            <div class="task-meta-item">
                                <i class="fas fa-university"></i>
                                <span>${universityName}</span>
                            </div>
                        ` : ''}
                        
                        ${task.estimatedTime ? `
                            <div class="task-meta-item">
                                <i class="fas fa-hourglass-half"></i>
                                <span>${task.estimatedTime}h</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${task.tags && task.tags.length > 0 ? `
                        <div class="task-tags">
                            ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="task-progress-section">
                        <div class="task-progress-label">
                            <span>Progress</span>
                            <span>${task.progress || 0}%</span>
                        </div>
                        <div class="task-progress-bar" onclick="event.stopPropagation(); editTaskProgress('${task.id}', event)" data-task-id="${task.id}">
                            <div class="task-progress-fill" style="width: ${task.progress || 0}%"></div>
                            <div class="progress-edit-tooltip">Click to edit progress</div>
                        </div>
                    </div>
                </div>
                
                <div class="task-right-section">
                    <div class="task-actions">
                        <span class="priority-badge ${priorityClass}">${priorityClass}</span>
                        <button class="action-btn edit" onclick="editTask('${task.id}', event)" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="event.stopPropagation(); openDeleteModal('${task.id}', '${title}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    
                    ${task.dueDate && !task.completed ? `
                        <div class="task-timer-section">
                            <div class="timer-label-text">Time Remaining:</div>
                            <div class="task-timer" data-task-id="${task.id}"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function createKanbanCard(task) {
        const isOverdue = task.dueDate && task.dueDate < new Date() && !task.completed;
        const universityName = getUniversityName(task.university);
        
        return `
            <div class="kanban-task ${isOverdue ? 'overdue' : ''}" data-id="${task.id}" 
                 onclick="openTaskDetails('${task.id}')">
                <div class="task-header">
                    <h4 class="task-title">${task.title}</h4>
                    <span class="priority-badge ${task.priority || 'medium'}">${task.priority || 'medium'}</span>
                </div>
                
                ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
                
                <div class="task-meta">
                    ${task.dueDate ? `
                        <div class="task-meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${formatDate(task.dueDate)}</span>
                        </div>
                    ` : ''}
                    
                    ${task.dueDate && !task.completed ? `
                        <div class="task-meta-item timer-container">
                            <i class="fas fa-stopwatch"></i>
                            <div class="task-timer" data-task-id="${task.id}"></div>
                        </div>
                    ` : ''}
                    
                    ${universityName ? `
                        <div class="task-meta-item">
                            <i class="fas fa-university"></i>
                            <span>${universityName}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${task.tags && task.tags.length > 0 ? `
                    <div class="task-tags">
                        ${task.tags.slice(0, 3).map(tag => `<span class="task-tag">${tag}</span>`).join('')}
                        ${task.tags.length > 3 ? `<span class="task-tag">+${task.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
                
                <div class="task-progress-section">
                    <div class="task-progress-label">
                        <span>Progress</span>
                        <span>${task.progress || 0}%</span>
                    </div>
                    <div class="task-progress-bar" onclick="event.stopPropagation(); editTaskProgress('${task.id}', event)" data-task-id="${task.id}">
                        <div class="task-progress-fill" style="width: ${task.progress || 0}%"></div>
                        <div class="progress-edit-tooltip">Click to edit progress</div>
                    </div>
                </div>
            </div>
        `;
    }

    function updateColumnCounts() {
        const pendingTasks = tasks.filter(t => !t.completed && t.status !== 'in-progress').length;
        const inProgressTasks = tasks.filter(t => !t.completed && t.status === 'in-progress').length;
        const completedTasks = tasks.filter(t => t.completed).length;
        
        document.getElementById('pendingCount').textContent = pendingTasks;
        document.getElementById('inProgressCount').textContent = inProgressTasks;
        document.getElementById('completedCount').textContent = completedTasks;
    }

    function updateStats() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.completed).length;
        const pendingTasks = tasks.filter(t => !t.completed).length;
        const overdueTasks = tasks.filter(t => 
            t.dueDate && t.dueDate < new Date() && !t.completed
        ).length;
        
        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('pendingTasks').textContent = pendingTasks;
        document.getElementById('overdueTasks').textContent = overdueTasks;
    }

    function initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;
        
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            events: [],
            eventClick: function(info) {
                openTaskDetails(info.event.id);
            },
            dateClick: function(info) {
                const taskDueDate = document.getElementById('taskDueDate');
                if (taskDueDate) {
                    taskDueDate.value = info.dateStr + 'T09:00';
                }
                openTaskModal();
            },
            height: 'auto'
        });
        
        calendar.render();
        updateCalendarEvents();
    }

    function updateCalendarEvents() {
        if (!calendar) return;
        
        const events = tasks.filter(task => task.dueDate).map(task => ({
            id: task.id,
            title: task.title,
            start: task.dueDate,
            color: getTaskColor(task),
            extendedProps: {
                description: task.description,
                priority: task.priority,
                completed: task.completed,
                university: task.university
            }
        }));
        
        calendar.removeAllEvents();
        calendar.addEventSource(events);
    }

    function getTaskColor(task) {
        if (task.completed) return '#10b981';
        if (task.priority === 'urgent') return '#ff6b35';
        if (task.priority === 'high') return '#ef4444';
        if (task.priority === 'medium') return '#f59e0b';
        return '#6366f1';
    }

    function getUniversityName(universityId) {
        if (!universityId) return '';
        const university = universities.find(u => u.id === universityId);
        return university ? university.name : 'Unknown University';
    }

    window.editTask = function(taskId, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        openTaskModal(taskId);
    };

    window.openTaskDetails = function(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        document.getElementById('detailsTitle').textContent = task.title;
        document.getElementById('editTaskBtn').onclick = () => {
            closeDetailsModal();
            openTaskModal(taskId);
        };
        
        const universityName = getUniversityName(task.university);
        
        document.getElementById('taskDetailsContent').innerHTML = `
            <div class="detail-section">
                <h4>Basic Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">
                            <span class="priority-badge ${task.completed ? 'success' : 'warning'}">
                                ${task.completed ? 'Completed' : 'Pending'}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Priority</span>
                        <span class="detail-value">
                            <span class="priority-badge ${task.priority || 'medium'}">
                                ${(task.priority || 'medium').toUpperCase()}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Category</span>
                        <span class="detail-value">${task.category ? task.category.replace('-', ' ').toUpperCase() : 'None'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">University</span>
                        <span class="detail-value">${universityName || 'None'}</span>
                    </div>
                </div>
            </div>
            
            ${task.description ? `
                <div class="detail-section">
                    <h4>Description</h4>
                    <p class="detail-value">${task.description}</p>
                </div>
            ` : ''}
            
            <div class="detail-section">
                <h4>Timeline</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Created</span>
                        <span class="detail-value">${formatDateTime(task.createdAt)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Updated</span>
                        <span class="detail-value">${formatDateTime(task.updatedAt)}</span>
                    </div>
                    ${task.startDate ? `
                        <div class="detail-item">
                            <span class="detail-label">Start Date</span>
                            <span class="detail-value">${formatDateTime(task.startDate)}</span>
                        </div>
                    ` : ''}
                    ${task.dueDate ? `
                        <div class="detail-item">
                            <span class="detail-label">Due Date</span>
                            <span class="detail-value">${formatDateTime(task.dueDate)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${task.tags && task.tags.length > 0 ? `
                <div class="detail-section">
                    <h4>Tags</h4>
                    <div class="task-tags">
                        ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${task.estimatedTime ? `
                <div class="detail-section">
                    <h4>Time Tracking</h4>
                    <div class="time-tracking">
                        <div class="time-item">
                            <div class="time-value">${task.estimatedTime}h</div>
                            <div class="time-label">Estimated</div>
                        </div>
                        <div class="time-item">
                            <div class="time-value">0h</div>
                            <div class="time-label">Actual</div>
                        </div>
                        <div class="time-item">
                            <div class="time-value">${task.estimatedTime}h</div>
                            <div class="time-label">Remaining</div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="progress-section">
                <div class="progress-header">
                    <h4>Progress</h4>
                    <span class="progress-percentage">${task.progress || 0}%</span>
                </div>
                <div class="progress-bar" onclick="editTaskProgress('${task.id}', event)" style="cursor: pointer; height: 20px;">
                    <div class="progress-fill" style="width: ${task.progress || 0}%"></div>
                    <div class="progress-edit-tooltip">Click to edit progress</div>
                </div>
            </div>
        `;
        
        elements.taskDetailsModal.classList.add('active');
    };

    window.toggleTask = async function(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        if (!currentUser || !currentUser.uid) {
            showNotification('Authentication required', 'error');
            return;
        }

        try {
            const userUid = currentUser.uid.toString();
            const taskId = id.toString();
            const newCompletedStatus = !task.completed;
            const newProgress = newCompletedStatus ? 100 : task.progress;
            
            await db.collection('users').doc(userUid)
                .collection('tasks').doc(taskId).update({
                completed: newCompletedStatus,
                progress: newProgress,
                status: newCompletedStatus ? 'completed' : 'pending',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            task.completed = newCompletedStatus;
            task.progress = newProgress;
            task.status = newCompletedStatus ? 'completed' : 'pending';
            task.updatedAt = new Date();
            
            await refreshInterface();
            showNotification(
                newCompletedStatus ? 'Task completed!' : 'Task marked as pending', 
                'success'
            );
        } catch (error) {
            console.error('Error updating task:', error);
            showNotification('Error updating task', 'error');
        }
    };

    function startTimerUpdates() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        updateAllTimers();
        
        timerInterval = setInterval(() => {
            updateAllTimers();
        }, 1000);
    }

    function updateAllTimers() {
        const timerElements = document.querySelectorAll('.task-timer');
        
        timerElements.forEach(element => {
            const taskId = element.dataset.taskId;
            const task = tasks.find(t => t.id === taskId);
            if (task && task.dueDate) {
                const timerData = calculateTimeRemaining(task.dueDate);
                element.innerHTML = formatTimer(timerData);
                element.className = `task-timer ${timerData.status}`;
            }
        });
    }

    function calculateTimeRemaining(dueDate) {
        const now = new Date();
        const due = new Date(dueDate);
        const diff = due.getTime() - now.getTime();
        
        if (diff <= 0) {
            return {
                months: 0,
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                status: 'overdue',
                isOverdue: true
            };
        }
        
        const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
        const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        let status = 'normal';
        if (diff < 24 * 60 * 60 * 1000) {
            status = 'critical';
        } else if (diff < 7 * 24 * 60 * 60 * 1000) {
            status = 'warning';
        }
        
        return {
            months,
            days,
            hours,
            minutes,
            seconds,
            status,
            isOverdue: false
        };
    }

    function formatTimer(timer) {
        if (timer.isOverdue) {
            return `
                <div class="timer-overdue">
                    <span class="overdue-text">OVERDUE</span>
                </div>
            `;
        }
        
        return `
            <div class="timer-unit">
                <span class="timer-value">${timer.months}</span>
                <span class="timer-label">Months</span>
            </div>
            <div class="timer-separator">:</div>
            <div class="timer-unit">
                <span class="timer-value">${timer.days}</span>
                <span class="timer-label">Days</span>
            </div>
            <div class="timer-separator">:</div>
            <div class="timer-unit">
                <span class="timer-value">${timer.minutes.toString().padStart(2, '0')}</span>
                <span class="timer-label">Minutes</span>
            </div>
            <div class="timer-separator">:</div>
            <div class="timer-unit">
                <span class="timer-value">${timer.seconds.toString().padStart(2, '0')}</span>
                <span class="timer-label">Seconds</span>
            </div>
        `;
    }

    async function refreshInterface() {
        renderTasks();
        updateStats();
        renderCategoryList();
        updateCalendarEvents();
        setTimeout(() => {
            startTimerUpdates();
        }, 200);
    }

    function renderInterface() {
        renderTasks();
        updateStats();
        renderCategoryList();
        updateCategoryHeader('all');
        
        setTimeout(() => {
            const allTasksElement = document.querySelector('.category-item[data-category="all"]');
            if (allTasksElement && !allTasksElement.classList.contains('active')) {
                allTasksElement.classList.add('active');
            }
            updateAllTimers();
        }, 100);
    }

    function handleModalClose(e) {
        if (e.target === elements.taskModal) {
            closeTaskModal();
        }
        if (e.target === elements.categoryModal) {
            closeCategoryModal();
        }
        if (e.target === elements.taskDetailsModal) {
            closeDetailsModal();
        }
        if (e.target === elements.deleteModal) {
            closeDeleteModal();
        }
    }

    function formatDateTime(date) {
        if (!date) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    function formatDate(date) {
        if (!date) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    function formatDateTimeLocal(date) {
        if (!date) return '';
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0, 16);
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

    function updateProgressPreview(progress) {
        const progressPreview = document.getElementById('progressPreview');
        const progressText = document.getElementById('progressText');
        
        if (progressPreview) {
            progressPreview.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${progress}%`;
        }
    }

    function setupProgressInput() {
        const progressInput = document.getElementById('taskProgress');
        if (progressInput) {
            progressInput.addEventListener('input', function() {
                const value = Math.max(0, Math.min(100, parseInt(this.value) || 0));
                this.value = value;
                updateProgressPreview(value);
            });
        }
    }

    async function editTaskProgress(taskId, event) {
        const rect = event.target.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = Math.round((clickX / rect.width) * 100);
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        
        try {
            if (!currentUser || !currentUser.uid) {
                throw new Error('User not authenticated');
            }
            
            await db.collection('users').doc(currentUser.uid)
                .collection('tasks').doc(taskId).update({
                    progress: clampedPercentage,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].progress = clampedPercentage;
            }
            
            renderTasks();
            
            if (elements.taskDetailsModal.classList.contains('active')) {
                const currentTask = tasks.find(t => t.id === taskId);
                if (currentTask) {
                    const progressPercentage = document.querySelector('.progress-percentage');
                    const progressFill = document.querySelector('.progress-section .progress-fill');
                    if (progressPercentage) progressPercentage.textContent = `${clampedPercentage}%`;
                    if (progressFill) progressFill.style.width = `${clampedPercentage}%`;
                }
            }
            
            showNotification(`Progress updated to ${clampedPercentage}%`, 'success');
            
        } catch (error) {
            console.error('Error updating task progress:', error);
            showNotification('Failed to update progress', 'error');
        }
    }

    window.editTaskProgress = editTaskProgress;

    setupProgressInput();
});
