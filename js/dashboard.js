document.addEventListener('DOMContentLoaded', async function() {
    let currentUser = null;
    let userData = null;
    let universities = [];
    let tasks = [];
    let scores = [];
    let portfolioFiles = [];
    let canvasFiles = [];

    const addUniversityBtn = document.getElementById('addUniversityBtn');
    const addTaskBtn = document.getElementById('addTaskBtn');

    const viewAllDeadlinesBtn = document.querySelector('[href="tasks.html"]');
    const viewAllUniversitiesBtn = document.querySelector('[href="universities.html"]');
    const viewAllScoresBtn = document.querySelector('.view-all-scores');

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

    updateDateTime();
    setInterval(updateDateTime, 1000);

    currentUser = await initializeAuth();
    showInitialLoadingStates();
    await loadUserData();
    updateUI();

    function updateDateTime() {
        const now = new Date();
        
        const dateOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        
        const currentDate = now.toLocaleDateString('en-US', dateOptions);
        const currentTime = now.toLocaleTimeString('en-US', timeOptions);
        
        document.getElementById('currentDate').textContent = currentDate;
        document.getElementById('currentTime').textContent = currentTime;
    }

    function showInitialLoadingStates() {
        const loadingSpinner = '<div class="stat-spinner"></div>';
        document.getElementById('totalUniversities').innerHTML = loadingSpinner;
        document.getElementById('tasksDue').innerHTML = loadingSpinner;
        document.getElementById('portfolioItems').innerHTML = loadingSpinner;
        document.getElementById('completionRate').innerHTML = loadingSpinner;
        document.getElementById('latestScore').innerHTML = loadingSpinner;
        document.getElementById('canvasItems').innerHTML = loadingSpinner;
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
                await loadCanvasFiles();
                updateStats();
                updateProgressBars();
                updateDeadlines();
                updateRecentUniversities();
                updateQuickInsights();
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
                await loadCanvasFiles();
                updateStats();
                updateProgressBars();
                updateDeadlines();
                updateRecentUniversities();
                updateQuickInsights();
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

    async function loadCanvasFiles() {
        try {
            const snapshot = await db.collection('users').doc(currentUser.uid).collection('canvases').get();
            canvasFiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('Canvas files loaded:', canvasFiles.length);
        } catch (error) {
            console.error('Error loading canvas files:', error);
            canvasFiles = [];
        }
    }

    function updateStats() {
        const totalUniversities = universities.length;
        const portfolioItems = portfolioFiles.length;
        const canvasItems = canvasFiles.length;
        
        const today = new Date();
        const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const tasksDue = tasks.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
            return dueDate <= oneWeek && !task.completed;
        }).length;

        const completedTasks = tasks.filter(task => task.completed).length;
        const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

        const latestScore = scores.length > 0 ? `${scores[0].score}` : '-';

        document.getElementById('totalUniversities').textContent = totalUniversities;
        document.getElementById('tasksDue').textContent = tasksDue;
        document.getElementById('portfolioItems').textContent = portfolioItems;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
        document.getElementById('latestScore').textContent = latestScore;
        document.getElementById('canvasItems').textContent = canvasItems;
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
        
        container.innerHTML = recentUniversities.map(uni => {
            let deadlineText = 'No deadline set';
            if (uni.applicationDeadline) {
                try {
                    let deadlineDate;
                    if (uni.applicationDeadline.toDate && typeof uni.applicationDeadline.toDate === 'function') {
                        deadlineDate = uni.applicationDeadline.toDate();
                    } else if (typeof uni.applicationDeadline === 'string') {
                        deadlineDate = new Date(uni.applicationDeadline);
                    } else if (uni.applicationDeadline instanceof Date) {
                        deadlineDate = uni.applicationDeadline;
                    } else {
                        deadlineDate = new Date(uni.applicationDeadline);
                    }
                    
                    if (!isNaN(deadlineDate.getTime())) {
                        deadlineText = formatDate(deadlineDate);
                    }
                } catch (error) {
                    console.log('Error formatting deadline for university:', uni.name, error);
                }
            }
            
            return `
                <div class="university-item">
                    <div class="university-content">
                        <div class="university-name">${uni.name}</div>
                        <div class="university-info">
                            ${deadlineText}
                        </div>
                    </div>
                    <span class="badge badge-${getStatusBadgeClass(uni.status)}">
                        ${uni.status || 'planning'}
                    </span>
                </div>
            `;
        }).join('');
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

    const refreshQuoteBtn = document.getElementById('refreshQuoteBtn');
    if (refreshQuoteBtn) {
        refreshQuoteBtn.addEventListener('click', loadMotivationalQuote);
    }

    loadMotivationalQuote();

    function updateUI() {
        document.body.style.opacity = '1';
    }

    function loadMotivationalQuote() {
        const quotes = [
            {
                text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
                author: "Winston Churchill"
            },
            {
                text: "The future belongs to those who believe in the beauty of their dreams.",
                author: "Eleanor Roosevelt"
            },
            {
                text: "It is during our darkest moments that we must focus to see the light.",
                author: "Aristotle"
            },
            {
                text: "Don't watch the clock; do what it does. Keep going.",
                author: "Sam Levenson"
            },
            {
                text: "The only impossible journey is the one you never begin.",
                author: "Tony Robbins"
            },
            {
                text: "In the middle of difficulty lies opportunity.",
                author: "Albert Einstein"
            },
            {
                text: "Success is not how high you have climbed, but how you make a positive difference to the world.",
                author: "Roy T. Bennett"
            },
            {
                text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.",
                author: "Ralph Waldo Emerson"
            },
            {
                text: "The way to get started is to quit talking and begin doing.",
                author: "Walt Disney"
            },
            {
                text: "Education is the most powerful weapon which you can use to change the world.",
                author: "Nelson Mandela"
            }
        ];

        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        document.querySelector('.quote-text').textContent = `"${randomQuote.text}"`;
        document.querySelector('.quote-author').textContent = randomQuote.author;
    }

    function updateQuickInsights() {
        updateNextDeadlineInsight();
        updateApplicationStatusInsight();
        updateProductivityInsight();
        updateRecommendationInsight();
    }

    function updateNextDeadlineInsight() {
        const nextDeadlineElement = document.getElementById('nextDeadlineInsight');
        const nextDeadlineContent = nextDeadlineElement.querySelector('.insight-content p');
        
        const today = new Date();
        const upcomingTasks = tasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
            return dueDate > today;
        }).sort((a, b) => {
            const dateA = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
            const dateB = b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
            return dateA - dateB;
        });

        if (upcomingTasks.length === 0) {
            nextDeadlineContent.textContent = "No upcoming deadlines!";
            nextDeadlineElement.querySelector('.insight-icon').style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else {
            const nextTask = upcomingTasks[0];
            const dueDate = nextTask.dueDate.toDate ? nextTask.dueDate.toDate() : new Date(nextTask.dueDate);
            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            nextDeadlineContent.textContent = `${nextTask.title} - ${daysUntil} days left`;
            
            if (daysUntil <= 3) {
                nextDeadlineElement.querySelector('.insight-icon').style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            } else if (daysUntil <= 7) {
                nextDeadlineElement.querySelector('.insight-icon').style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            } else {
                nextDeadlineElement.querySelector('.insight-icon').style.background = 'linear-gradient(135deg, #10b981, #059669)';
            }
        }
    }

    function updateApplicationStatusInsight() {
        const statusInsightElement = document.getElementById('applicationStatusInsight');
        const statusContent = statusInsightElement.querySelector('.insight-content p');
        
        if (universities.length === 0) {
            statusContent.textContent = "No universities added yet";
            return;
        }

        const statusCounts = {
            planning: 0,
            applied: 0,
            accepted: 0,
            rejected: 0
        };

        universities.forEach(uni => {
            const status = uni.status || 'planning';
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            }
        });

        const maxStatus = Object.keys(statusCounts).reduce((a, b) => statusCounts[a] > statusCounts[b] ? a : b);
        statusContent.textContent = `${statusCounts.applied} applied, ${statusCounts.accepted} accepted`;
    }

    function updateProductivityInsight() {
        const productivityElement = document.getElementById('productivityInsight');
        const productivityContent = productivityElement.querySelector('.insight-content p');
        
        const completedThisWeek = tasks.filter(task => {
            if (!task.completed || !task.completedDate) return false;
            const completedDate = task.completedDate.toDate ? task.completedDate.toDate() : new Date(task.completedDate);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return completedDate >= weekAgo;
        }).length;

        if (completedThisWeek === 0) {
            productivityContent.textContent = "No tasks completed this week";
            productivityElement.querySelector('.insight-icon').style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
        } else if (completedThisWeek >= 5) {
            productivityContent.textContent = `${completedThisWeek} tasks completed! Great week!`;
            productivityElement.querySelector('.insight-icon').style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else {
            productivityContent.textContent = `${completedThisWeek} tasks completed this week`;
            productivityElement.querySelector('.insight-icon').style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        }
    }

    function updateRecommendationInsight() {
        const recommendationElement = document.getElementById('recommendationInsight');
        const recommendationContent = recommendationElement.querySelector('.insight-content p');
        
        const recommendations = [];
        
        const overdueTasks = tasks.filter(task => {
            if (task.completed || !task.dueDate) return false;
            const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
            return dueDate < new Date();
        });

        if (overdueTasks.length > 0) {
            recommendations.push(`You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}!`);
        } else if (universities.length === 0) {
            recommendations.push("Start by adding your first university!");
        } else if (portfolioFiles.length < 3) {
            recommendations.push("Build your portfolio with more items");
        } else if (scores.length === 0) {
            recommendations.push("Add your test scores to track progress");
        } else {
            recommendations.push("Keep up the great work!");
        }

        recommendationContent.textContent = recommendations[0] || "Everything looks good!";
    }
});