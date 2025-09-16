document.addEventListener('DOMContentLoaded', async function() {
    let currentUser = null;
    let userData = null;
    let universities = [];
    let tasks = [];
    let scores = [];
    let portfolioFiles = [];

    const addUniversityBtn = document.getElementById('addUniversityBtn');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const practiceBtn = document.getElementById('practiceBtn');

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');

    const aiChatFab = document.getElementById('aiChatFab');
    const aiChatModal = document.getElementById('aiChatModal');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const quickQuestions = document.querySelectorAll('.quick-btn');

    const quickAddFab = document.getElementById('quickAddFab');
    const quickAddMenu = document.getElementById('quickAddMenu');
    const quickAddItems = document.querySelectorAll('.quick-add-item');

    initializeEventListeners();
    await initializeApp();

    function initializeEventListeners() {
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

        if (addUniversityBtn) {
            addUniversityBtn.addEventListener('click', () => {
                window.location.href = 'universities.html';
            });
        }

        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => {
                window.location.href = 'tasks.html';
            });
        }

        if (practiceBtn) {
            practiceBtn.addEventListener('click', () => {
                window.location.href = 'sat-practice.html';
            });
        }

        if (aiChatFab) {
            aiChatFab.addEventListener('click', () => {
                aiChatModal.classList.toggle('active');
            });
        }

        if (chatCloseBtn) {
            chatCloseBtn.addEventListener('click', () => {
                aiChatModal.classList.remove('active');
            });
        }

        if (chatInput) {
            chatInput.addEventListener('input', () => {
                sendBtn.disabled = chatInput.value.trim() === '';
            });

            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !sendBtn.disabled) {
                    sendMessage();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }

        quickQuestions.forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.getAttribute('data-question');
                chatInput.value = question;
                sendMessage();
            });
        });

        quickAddItems.forEach(item => {
            item.addEventListener('click', () => {
                const action = item.getAttribute('data-action');
                handleQuickAdd(action);
            });
        });

        document.addEventListener('click', (e) => {
            if (!aiChatModal.contains(e.target) && !aiChatFab.contains(e.target)) {
                aiChatModal.classList.remove('active');
            }
        });

        updateCurrentDate();
        setInterval(updateCurrentDate, 60000);
    }

    async function initializeApp() {
        showInitialLoadingStates();
        currentUser = await initializeAuth();
        await loadUserData();
        updateUI();
        updateOverviewCards();
        loadPriorityActions();
        loadRecentActivity();
        loadApplicationStatus();
        loadCalendarWidget();
        loadProgressWidget();
        loadQuickStats();
    }

    function updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    function showInitialLoadingStates() {
        const loadingElements = [
            'totalApplications',
            'completedTasks', 
            'urgentTasks',
            'averageScore'
        ];

        loadingElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<div class="spinner"></div>';
            }
        });
    }

    async function loadUserData() {
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                userData = userDoc.data();
                
                const userName = userData.name || currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
                const firstName = userName.split(' ')[0];
                
                document.getElementById('userName').textContent = userName;
                document.getElementById('welcomeMessage').textContent = `Welcome back, ${firstName}!`;
                
                let avatarUrl = userData.avatarUrl || currentUser.photoURL;
                if (!avatarUrl) {
                    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`;
                }
                document.getElementById('userAvatar').src = avatarUrl;

                await loadUniversities();
                await loadTasks();
                await loadScores();
                await loadPortfolioFiles();
                updateStats();
                updateProgressBars();
                updateDeadlines();
                updateRecentUniversities();
                initializeChart();
            } else {
                const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
                const firstName = userName.split(' ')[0];
                
                document.getElementById('userName').textContent = userName;
                document.getElementById('welcomeMessage').textContent = `Welcome back, ${firstName}!`;
                
                let avatarUrl = currentUser.photoURL;
                if (!avatarUrl) {
                    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`;
                }
                document.getElementById('userAvatar').src = avatarUrl;

                await loadUniversities();
                await loadTasks();
                await loadScores();
                await loadPortfolioFiles();
                updateStats();
                updateProgressBars();
                updateDeadlines();
                updateRecentUniversities();
                initializeChart();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async function loadUniversities() {
        try {
            const snapshot = await db.collection('users').doc(currentUser.uid).collection('universities').get();
            universities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error loading universities:', error);
        }
    }

    async function loadTasks() {
        try {
            const snapshot = await db.collection('users').doc(currentUser.uid).collection('tasks').get();
            tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    async function loadScores() {
        try {
            const snapshot = await db.collection('users').doc(currentUser.uid).collection('scores').orderBy('testDate', 'desc').get();
            scores = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                testDate: doc.data().testDate?.toDate ? doc.data().testDate.toDate() : new Date(doc.data().testDate)
            }));
        } catch (error) {
            console.error('Error loading scores:', error);
        }
    }

    async function loadPortfolioFiles() {
        try {
            const snapshot = await db.collection('users').doc(currentUser.uid).collection('portfolio').get();
            portfolioFiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error loading portfolio files:', error);
        }
    }

    function updateStats() {
        const totalUniversities = universities.length;
        const portfolioItems = portfolioFiles.length;
        
        const today = new Date();
        const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const tasksDue = tasks.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
            return dueDate <= oneWeek && !task.completed;
        }).length;

        const completedTasks = tasks.filter(task => task.completed).length;
        const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

        document.getElementById('totalUniversities').textContent = totalUniversities;
        document.getElementById('tasksDue').textContent = tasksDue;
        document.getElementById('portfolioItems').textContent = portfolioItems;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
    }

    function updateProgressBars() {
        const progressCard = Array.from(document.querySelectorAll('.card')).find(card => {
            const title = card.querySelector('.card-title');
            return title && title.textContent.includes('Progress Overview');
        });
        
        if (!progressCard) return;
        
        const progressContainer = progressCard.querySelector('.card-body');
        if (!progressContainer) return;

        const testConfigs = {
            sat: { name: 'SAT', max: 1600, min: 400 },
            duolingo: { name: 'Duolingo', max: 160, min: 10 },
            toefl: { name: 'TOEFL iBT', max: 120, min: 0 },
            ielts: { name: 'IELTS', max: 9, min: 0 },
            gre: { name: 'GRE', max: 340, min: 260 },
            gmat: { name: 'GMAT', max: 800, min: 200 }
        };

        if (scores.length === 0) {
            progressContainer.innerHTML = `
                <div class="progress-item">
                    <div class="progress-label">
                        <span>No Test Scores</span>
                        <span>Not Set</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
            `;
            return;
        }

        const recentScores = scores.slice(0, 3);
        const progressItems = recentScores.map(score => {
            const config = testConfigs[score.testType];
            if (!config) return '';
            
            const percentage = Math.min((score.score / config.max) * 100, 100);
            
            return `
                <div class="progress-item">
                    <div class="progress-label">
                        <span>${config.name} Score</span>
                        <span>${score.score}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        progressContainer.innerHTML = progressItems;
    }

    function updateDeadlines() {
        const container = document.getElementById('upcomingDeadlines');
        const today = new Date();
        const oneMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const upcomingTasks = tasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
            return dueDate <= oneMonth;
        }).sort((a, b) => {
            const dateA = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
            const dateB = b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
            return dateA - dateB;
        }).slice(0, 3);

        if (upcomingTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>No upcoming deadlines</p>
                </div>
            `;
            return;
        }

        container.innerHTML = upcomingTasks.map(task => {
            const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let badgeClass = 'normal';
            if (daysUntil <= 3) badgeClass = 'urgent';
            else if (daysUntil <= 7) badgeClass = 'soon';
            
            return `
                <div class="deadline-item">
                    <div class="deadline-content">
                        <div class="deadline-title">${task.title}</div>
                        <div class="deadline-date">${formatDate(dueDate)}</div>
                    </div>
                    <div class="deadline-badge ${badgeClass}">
                        ${daysUntil} days
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateRecentUniversities() {
        const container = document.getElementById('recentUniversities');
        
        if (universities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-university"></i>
                    <p>No universities added yet</p>
                </div>
            `;
            return;
        }

        const recentUniversities = universities.slice(0, 3);
        
        container.innerHTML = recentUniversities.map(uni => `
            <div class="university-item">
                <div class="university-content">
                    <div class="university-name">${uni.name}</div>
                    <div class="university-info">
                        ${uni.applicationDeadline ? formatDate(new Date(uni.applicationDeadline)) : 'No deadline set'}
                    </div>
                </div>
                <span class="badge badge-${getStatusBadgeClass(uni.status)}">
                    ${uni.status || 'planning'}
                </span>
            </div>
        `).join('');
    }

    function initializeChart() {
        const ctx = document.getElementById('timelineChart');
        if (!ctx) return;
        
        const context = ctx.getContext('2d');
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const chartMonths = [];
        const applicationData = new Array(12).fill(0);
        
        for (let i = 0; i < 12; i++) {
            chartMonths.push(months[(currentMonth + i) % 12]);
        }

        universities.forEach(uni => {
            if (uni.applicationDeadline) {
                const deadline = new Date(uni.applicationDeadline);
                const monthIndex = deadline.getMonth();
                const chartIndex = (monthIndex - currentMonth + 12) % 12;
                if (chartIndex >= 0 && chartIndex < 12) {
                    applicationData[chartIndex]++;
                }
            }
        });

        new Chart(context, {
            type: 'line',
            data: {
                labels: chartMonths,
                datasets: [{
                    label: 'Application Deadlines',
                    data: applicationData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }

    function formatDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function getStatusBadgeClass(status) {
        const statusMap = {
            'planning': 'info',
            'applied': 'warning',
            'accepted': 'success',
            'rejected': 'danger',
            'waitlisted': 'warning'
        };
        return statusMap[status] || 'info';
    }

    addUniversityBtn.addEventListener('click', () => {
        window.location.href = 'universities.html';
    });

    addTaskBtn.addEventListener('click', () => {
        window.location.href = 'tasks.html';
    });

    if (viewAllDeadlinesBtn) {
        viewAllDeadlinesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'tasks.html';
        });
    }

    if (viewAllUniversitiesBtn) {
        viewAllUniversitiesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'universities.html';
        });
    }

    if (viewAllScoresBtn) {
        viewAllScoresBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'scores.html';
        });
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const icon = themeToggle.querySelector('i');
    icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

    function updateUI() {
        document.body.style.opacity = '1';
    }
});
