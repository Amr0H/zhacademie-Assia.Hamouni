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

    let scores = [];
    let goals = {};
    let currentView = 'cards';
    let currentFilters = {
        testType: 'all',
        period: 'all',
        search: ''
    };
    let selectedScoreId = null;
    let scoreToDelete = null;
    let scoreChart = null;

    const elements = {
        scoresGrid: document.getElementById('scoresGrid'),
        scoresList: document.getElementById('scoresList'),
        scoresListBody: document.getElementById('scoresListBody'),
        scoreModal: document.getElementById('scoreModal'),
        scoreDetailModal: document.getElementById('scoreDetailModal'),
        goalModal: document.getElementById('goalModal'),
        deleteConfirmModal: document.getElementById('deleteConfirmModal'),
        scoreForm: document.getElementById('scoreForm'),
        goalForm: document.getElementById('goalForm'),
        chartCanvas: document.getElementById('scoreChart'),
        testTypeFilter: document.getElementById('testTypeFilter'),
        periodFilter: document.getElementById('periodFilter'),
        searchInput: document.getElementById('searchInput'),
        chartType: document.getElementById('chartType')
    };

    const testConfigs = {
        sat: { name: 'SAT', max: 1600, min: 400, icon: 'fas fa-graduation-cap' },
        duolingo: { name: 'Duolingo', max: 160, min: 10, icon: 'fas fa-globe' },
        toefl: { name: 'TOEFL iBT', max: 120, min: 0, icon: 'fas fa-book' },
        ielts: { name: 'IELTS', max: 9, min: 0, icon: 'fas fa-language' },
        gre: { name: 'GRE', max: 340, min: 260, icon: 'fas fa-brain' },
        gmat: { name: 'GMAT', max: 800, min: 200, icon: 'fas fa-calculator' }
    };

    function calculateScorePercentage(score, testType) {
        const config = testConfigs[testType];
        if (!config) {
            return 0;
        }
        
        const numericScore = Number(score);
        if (!numericScore || numericScore <= 0) {
            return 0;
        }
        
        const percentage = Math.round((numericScore / config.max) * 100);
        return Math.min(percentage, 100);
    }

    function calculateRangePercentage(score, testType) {
        const config = testConfigs[testType];
        if (!config) return 0;
        return Math.round(((score - config.min) / (config.max - config.min)) * 100);
    }

    await initializePage();

    async function initializePage() {
        try {
            showInitialLoading();
            await Promise.all([loadScores(), loadGoals()]);
            updateAllDisplays();
            initializeEventListeners();
            hideInitialLoading();
        } catch (error) {
            console.error('Error initializing page:', error);
            showError('Failed to load scores data');
            hideInitialLoading();
        }
    }

    function showInitialLoading() {
        elements.scoresGrid.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner-large"></div>
                <h3 class="loading-title">Loading your scores...</h3>
                <p class="loading-description">Please wait while we fetch your test results</p>
            </div>
        `;
    }

    function hideInitialLoading() {
        if (scores.length === 0) {
            showEmptyState();
        } else {
            renderScores();
        }
    }

    function showEmptyState() {
        elements.scoresGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <h3 class="empty-title">No Test Scores Yet</h3>
                <p class="empty-description">Start tracking your academic progress by adding your first test score</p>
                <button class="btn btn-primary" onclick="openAddScoreModal()" style="margin-top: 16px;">
                    <i class="fas fa-plus"></i>
                    Add Your First Score
                </button>
            </div>
        `;
    }

    async function loadScores() {
        try {
            const snapshot = await db.collection('users').doc(currentUser.uid)
                .collection('scores').orderBy('testDate', 'desc').get();
            scores = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                testDate: doc.data().testDate?.toDate ? doc.data().testDate.toDate() : new Date(doc.data().testDate)
            }));
        } catch (error) {
            console.error('Error loading scores:', error);
            showNotification('Error loading scores', 'error');
        }
    }

    async function loadGoals() {
        try {
            const doc = await db.collection('users').doc(currentUser.uid).collection('settings').doc('goals').get();
            if (doc.exists) {
                goals = doc.data() || {};
            }
        } catch (error) {
            console.error('Error loading goals:', error);
        }
    }

    function updateAllDisplays() {
        updateStats();
        updateInsights();
        if (currentView === 'cards') {
            renderScores();
        } else {
            renderScoresList();
        }
        renderChart();
    }

    function updateStats() {
        const filteredScores = getFilteredScores();
        
        document.getElementById('totalTests').textContent = filteredScores.length;
        
        if (filteredScores.length > 0) {
            const averagePercentage = filteredScores.reduce((sum, score) => {
                return sum + calculateScorePercentage(score.score, score.testType);
            }, 0) / filteredScores.length;
            
            document.getElementById('averageScore').textContent = `${Math.round(averagePercentage)}%`;
            
            const bestScore = filteredScores.reduce((best, score) => {
                const scorePercentage = calculateScorePercentage(score.score, score.testType);
                const bestPercentage = best ? calculateScorePercentage(best.score, best.testType) : 0;
                return scorePercentage > bestPercentage ? score : best;
            }, null);
            
            document.getElementById('bestScore').textContent = bestScore ? `${bestScore.score} (${testConfigs[bestScore.testType].name})` : '-';
            
            const mostRecent = filteredScores[0];
            document.getElementById('recentTest').textContent = mostRecent ? formatDate(mostRecent.testDate) : '-';
        } else {
            document.getElementById('averageScore').textContent = '0%';
            document.getElementById('bestScore').textContent = '-';
            document.getElementById('recentTest').textContent = '-';
        }
    }

    function updateInsights() {
        const filteredScores = getFilteredScores();
        
        if (filteredScores.length >= 2) {
            const recent = filteredScores[0];
            const previous = filteredScores[1];
            const recentConfig = testConfigs[recent.testType];
            const previousConfig = testConfigs[previous.testType];
            
            if (recent.testType === previous.testType) {
                const improvement = recent.score - previous.score;
                const improvementText = improvement > 0 
                    ? `+${improvement} points improvement` 
                    : improvement < 0 
                        ? `${improvement} points decrease` 
                        : 'No change from last test';
                document.getElementById('improvementText').textContent = improvementText;
            } else {
                document.getElementById('improvementText').textContent = 'Different test types - track individual progress';
            }
        } else {
            document.getElementById('improvementText').textContent = 'Add more scores to track improvement';
        }
        
        const testTypes = [...new Set(filteredScores.map(s => s.testType))];
        const goalProgress = testTypes.map(type => {
            const latestScore = filteredScores.find(s => s.testType === type);
            const targetScore = goals[type];
            if (latestScore && targetScore) {
                const progress = (latestScore.score / targetScore) * 100;
                return { type, progress: Math.min(progress, 100) };
            }
            return null;
        }).filter(Boolean);
        
        if (goalProgress.length > 0) {
            const avgProgress = goalProgress.reduce((sum, g) => sum + g.progress, 0) / goalProgress.length;
            document.getElementById('goalText').textContent = `${Math.round(avgProgress)}% of your goals achieved`;
        } else {
            document.getElementById('goalText').textContent = 'Set target scores to track progress';
        }
        
        if (filteredScores.length > 0) {
            const dates = filteredScores.map(s => s.testDate).sort((a, b) => a - b);
            if (dates.length >= 2) {
                const avgGap = dates.slice(1).reduce((sum, date, i) => {
                    return sum + (date - dates[i]);
                }, 0) / (dates.length - 1);
                const avgMonths = Math.round(avgGap / (1000 * 60 * 60 * 24 * 30));
                document.getElementById('frequencyText').textContent = `Average ${avgMonths} months between tests`;
            } else {
                document.getElementById('frequencyText').textContent = 'Take more tests to see frequency';
            }
        } else {
            document.getElementById('frequencyText').textContent = 'No test history available';
        }
    }

    function getFilteredScores() {
        return scores.filter(score => {
            const matchesType = currentFilters.testType === 'all' || score.testType === currentFilters.testType;
            const matchesPeriod = checkPeriodFilter(score.testDate);
            const matchesSearch = currentFilters.search === '' || 
                testConfigs[score.testType].name.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
                score.notes?.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
                score.score.toString().includes(currentFilters.search);
            
            return matchesType && matchesPeriod && matchesSearch;
        });
    }

    function checkPeriodFilter(date) {
        if (currentFilters.period === 'all') return true;
        
        const now = new Date();
        const months = {
            '6months': 6,
            '1year': 12,
            '2years': 24
        };
        
        const monthsAgo = new Date(now.getFullYear(), now.getMonth() - months[currentFilters.period], now.getDate());
        return date >= monthsAgo;
    }

    function renderScores() {
        const filteredScores = getFilteredScores();
        
        if (filteredScores.length === 0) {
            elements.scoresGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3 class="empty-title">No Scores Match Your Filters</h3>
                    <p class="empty-description">Try adjusting your filters or add a new test score</p>
                </div>
            `;
            return;
        }

        elements.scoresGrid.innerHTML = filteredScores.map(score => {
            const config = testConfigs[score.testType];
            let percentage = calculateScorePercentage(score.score, score.testType);
            
            if (percentage <= 0 && score.score > 0) {
                percentage = Math.max(1, Math.round((score.score / (config?.max || 100)) * 100));
            }
            
            const targetScore = goals[score.testType];
            const targetPercentage = targetScore ? (score.score / targetScore) * 100 : null;
            
            return `
                <div class="score-item" onclick="openScoreDetail('${score.id}')">
                    <div class="score-header">
                        <div class="test-info">
                            <div class="test-icon ${score.testType}">
                                <i class="${config.icon}"></i>
                            </div>
                            <div>
                                <div class="test-name">${config.name}</div>
                                <div class="test-date">${formatDate(score.testDate)}</div>
                            </div>
                        </div>
                        ${score.percentile ? `<div class="percentile-badge">${score.percentile}th percentile</div>` : ''}
                    </div>
                    
                    <div class="score-display">
                        <span class="score-value-large">${score.score}</span>
                        <span class="score-max">/ ${config.max}</span>
                    </div>
                    
                    <div class="score-progress">
                        <div class="progress-header">
                            <span class="progress-percentage">${Math.round(percentage)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.max(percentage, 0)}%; background: linear-gradient(90deg, #4A90E2 0%, #357abd 100%);"></div>
                        </div>
                        ${targetScore ? `<div class="progress-text"><span class="progress-target">Target: ${targetScore}</span></div>` : ''}
                    </div>
                    
                    <div class="score-actions">
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editScore('${score.id}')">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openScoreDetail('${score.id}')">
                            <i class="fas fa-eye"></i>
                            View
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderScoresList() {
        const filteredScores = getFilteredScores();
        
        elements.scoresListBody.innerHTML = filteredScores.map(score => {
            const config = testConfigs[score.testType];
            return `
                <div class="list-row" onclick="openScoreDetail('${score.id}')">
                    <div class="list-test">
                        <div class="list-test-icon ${score.testType}">
                            <i class="${config.icon}"></i>
                        </div>
                        <div class="list-test-name">${config.name}</div>
                    </div>
                    <div class="list-score">${score.score}/${config.max}</div>
                    <div class="list-date">${formatDate(score.testDate)}</div>
                    <div class="list-percentile">${score.percentile ? `${score.percentile}th` : '-'}</div>
                    <div class="list-actions">
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editScore('${score.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); showDeleteConfirmation('${score.id}')">>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderChart() {
        const ctx = elements.chartCanvas.getContext('2d');
        
        if (scoreChart) {
            scoreChart.destroy();
        }

        const filteredScores = getFilteredScores();
        const chartTypeValue = elements.chartType.value;
        
        if (filteredScores.length === 0) {
            ctx.clearRect(0, 0, elements.chartCanvas.width, elements.chartCanvas.height);
            ctx.fillStyle = '#9ca3af';
            ctx.font = '16px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No data to display', elements.chartCanvas.width / 2, elements.chartCanvas.height / 2);
            return;
        }

        const testTypes = [...new Set(filteredScores.map(s => s.testType))];
        const colors = {
            sat: '#6366f1',
            duolingo: '#10b981',
            toefl: '#f59e0b',
            ielts: '#ef4444',
            gre: '#8b5cf6',
            gmat: '#06b6d4'
        };

        if (chartTypeValue === 'line') {
            renderLineChart(ctx, filteredScores, testTypes, colors);
        } else if (chartTypeValue === 'bar') {
            renderBarChart(ctx, filteredScores, testTypes, colors);
        } else if (chartTypeValue === 'radar') {
            renderRadarChart(ctx, filteredScores, testTypes, colors);
        }
    }

    function renderLineChart(ctx, scores, testTypes, colors) {
        const datasets = testTypes.map(type => {
            const typeScores = scores.filter(s => s.testType === type).reverse();
            return {
                label: testConfigs[type].name,
                data: typeScores.map(s => ({
                    x: s.testDate,
                    y: s.score
                })),
                borderColor: colors[type],
                backgroundColor: colors[type] + '20',
                tension: 0.4,
                fill: false
            };
        });

        scoreChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'month' },
                        title: { display: true, text: 'Test Date' }
                    },
                    y: {
                        title: { display: true, text: 'Score' },
                        beginAtZero: false
                    }
                },
                plugins: {
                    legend: { display: testTypes.length > 1 },
                    tooltip: {
                        callbacks: {
                            title: (context) => formatDate(new Date(context[0].parsed.x)),
                            label: (context) => `${context.dataset.label}: ${context.parsed.y}`
                        }
                    }
                }
            }
        });
    }

    function renderBarChart(ctx, scores, testTypes, colors) {
        const latestScores = testTypes.map(type => {
            const latest = scores.find(s => s.testType === type);
            return latest ? latest.score : 0;
        });

        scoreChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: testTypes.map(type => testConfigs[type].name),
                datasets: [{
                    label: 'Latest Scores',
                    data: latestScores,
                    backgroundColor: testTypes.map(type => colors[type] + '80'),
                    borderColor: testTypes.map(type => colors[type]),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Score' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    function renderRadarChart(ctx, scores, testTypes, colors) {
        if (testTypes.length < 3) {
            ctx.clearRect(0, 0, elements.chartCanvas.width, elements.chartCanvas.height);
            ctx.fillStyle = '#9ca3af';
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('Radar chart requires at least 3 test types', elements.chartCanvas.width / 2, elements.chartCanvas.height / 2);
            return;
        }

        const percentages = testTypes.map(type => {
            const latest = scores.find(s => s.testType === type);
            if (!latest) return 0;
            return calculateScorePercentage(latest.score, latest.testType);
        });

        scoreChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: testTypes.map(type => testConfigs[type].name),
                datasets: [{
                    label: 'Performance %',
                    data: percentages,
                    backgroundColor: '#4A90E2' + '20',
                    borderColor: '#4A90E2',
                    borderWidth: 2,
                    pointBackgroundColor: '#4A90E2',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    function initializeEventListeners() {
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                toggleView();
            });
        });

        if (elements.testTypeFilter) {
            elements.testTypeFilter.addEventListener('change', (e) => {
                currentFilters.testType = e.target.value;
                updateAllDisplays();
            });
        }

        if (elements.periodFilter) {
            elements.periodFilter.addEventListener('change', (e) => {
                currentFilters.period = e.target.value;
                updateAllDisplays();
            });
        }

        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', (e) => {
                currentFilters.search = e.target.value;
                updateAllDisplays();
            });
        }

        if (elements.chartType) {
            elements.chartType.addEventListener('change', () => {
                renderChart();
            });
        }

        const addScoreBtn = document.getElementById('addScoreBtn');
        if (addScoreBtn) {
            addScoreBtn.addEventListener('click', openAddScoreModal);
        }

        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshData);
        }

        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => closeModalById('scoreModal'));
        }

        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closeModalById('scoreModal'));
        }

        const closeDetailModal = document.getElementById('closeDetailModal');
        if (closeDetailModal) {
            closeDetailModal.addEventListener('click', () => closeModalById('scoreDetailModal'));
        }

        const closeGoalModal = document.getElementById('closeGoalModal');
        if (closeGoalModal) {
            closeGoalModal.addEventListener('click', () => closeModalById('goalModal'));
        }

        const closeDeleteModal = document.getElementById('closeDeleteModal');
        if (closeDeleteModal) {
            closeDeleteModal.addEventListener('click', () => closeModalById('deleteConfirmModal'));
        }

        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => closeModalById('deleteConfirmModal'));
        }

        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', confirmDelete);
        }

        if (elements.scoreForm) {
            elements.scoreForm.addEventListener('submit', handleScoreSubmit);
        }

        if (elements.goalForm) {
            elements.goalForm.addEventListener('submit', handleGoalSubmit);
        }

        const testTypeSelect = document.getElementById('testType');
        if (testTypeSelect) {
            testTypeSelect.addEventListener('change', updateScoreInputLimits);
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                const modalId = e.target.id;
                closeModalById(modalId);
            }
        });
    }

    function closeModalById(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function toggleView() {
        if (currentView === 'cards') {
            elements.scoresGrid.classList.remove('hidden');
            elements.scoresList.classList.add('hidden');
            renderScores();
        } else {
            elements.scoresGrid.classList.add('hidden');
            elements.scoresList.classList.remove('hidden');
            renderScoresList();
        }
    }

    function openAddScoreModal() {
        selectedScoreId = null;
        document.getElementById('modalTitle').textContent = 'Add Test Score';
        if (elements.scoreForm) {
            elements.scoreForm.reset();
            const testTypeSelect = elements.scoreForm.querySelector('#testType');
            if (testTypeSelect) {
                testTypeSelect.value = '';
            }
        }
        updateScoreInputLimits();
        openModal('scoreModal');
    }

    function editScore(scoreId) {
        const score = scores.find(s => s.id === scoreId);
        if (!score) {
            showNotification('Score not found', 'error');
            return;
        }

        selectedScoreId = scoreId;
        document.getElementById('modalTitle').textContent = 'Edit Test Score';
        
        document.getElementById('testType').value = score.testType;
        document.getElementById('scoreValue').value = score.score;
        document.getElementById('testDate').value = formatDateForInput(score.testDate);
        document.getElementById('percentile').value = score.percentile || '';
        document.getElementById('targetScore').value = score.targetScore || '';
        
        if (score.retakeDate) {
            const retakeDate = score.retakeDate.toDate ? score.retakeDate.toDate() : new Date(score.retakeDate);
            document.getElementById('retakeDate').value = formatDateForInput(retakeDate);
        } else {
            document.getElementById('retakeDate').value = '';
        }
        
        document.getElementById('scoreNotes').value = score.notes || '';
        
        updateScoreInputLimits();
        openModal('scoreModal');
    }

    function openScoreDetail(scoreId) {
        const score = scores.find(s => s.id === scoreId);
        if (!score) return;

        const config = testConfigs[score.testType];
        const percentage = calculateScorePercentage(score.score, score.testType);
        
        document.getElementById('detailModalTitle').textContent = `${config.name} Score Details`;
        document.getElementById('detailContent').innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Test Type</span>
                <span class="detail-value">${config.name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Score</span>
                <span class="detail-value">${score.score} / ${config.max} (${Math.round(percentage)}%)</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Test Date</span>
                <span class="detail-value">${formatDate(score.testDate)}</span>
            </div>
            ${score.percentile ? `
            <div class="detail-item">
                <span class="detail-label">Percentile</span>
                <span class="detail-value">${score.percentile}th percentile</span>
            </div>` : ''}
            ${score.targetScore ? `
            <div class="detail-item">
                <span class="detail-label">Target Score</span>
                <span class="detail-value">${score.targetScore}</span>
            </div>` : ''}
            ${score.retakeDate ? `
            <div class="detail-item">
                <span class="detail-label">Planned Retake</span>
                <span class="detail-value">${formatDate(score.retakeDate.toDate ? score.retakeDate.toDate() : new Date(score.retakeDate))}</span>
            </div>` : ''}
            ${score.notes ? `
            <div class="detail-item">
                <span class="detail-label">Notes</span>
                <span class="detail-value">${score.notes}</span>
            </div>` : ''}
        `;

        document.getElementById('editScoreBtn').onclick = () => {
            closeModalById('scoreDetailModal');
            editScore(scoreId);
        };

        document.getElementById('deleteScoreBtn').onclick = () => {
            closeModalById('scoreDetailModal');
            showDeleteConfirmation(scoreId);
        };

        openModal('scoreDetailModal');
    }

    function showDeleteConfirmation(scoreId) {
        const score = scores.find(s => s.id === scoreId);
        if (!score) {
            showNotification('Score not found', 'error');
            return;
        }

        scoreToDelete = scoreId;
        const config = testConfigs[score.testType];
        const percentage = calculateScorePercentage(score.score, score.testType);

        document.getElementById('deleteSummary').innerHTML = `
            <h4>Score to be deleted:</h4>
            <div class="summary-item">
                <span class="summary-label">Test Type</span>
                <span class="summary-value">${config.name}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Score</span>
                <span class="summary-value">${score.score} / ${config.max} (${Math.round(percentage)}%)</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Test Date</span>
                <span class="summary-value">${formatDate(score.testDate)}</span>
            </div>
            ${score.percentile ? `
            <div class="summary-item">
                <span class="summary-label">Percentile</span>
                <span class="summary-value">${score.percentile}th percentile</span>
            </div>` : ''}
        `;

        openModal('deleteConfirmModal');
    }

    async function confirmDelete() {
        if (!scoreToDelete) return;

        try {
            showLoading();
            await db.collection('users').doc(currentUser.uid).collection('scores').doc(scoreToDelete).delete();
            await loadScores();
            updateAllDisplays();
            closeModalById('deleteConfirmModal');
            scoreToDelete = null;
            showNotification('Score deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting score:', error);
            showNotification('Error deleting score', 'error');
        } finally {
            hideLoading();
        }
    }

    function updateScoreInputLimits() {
        const testType = document.getElementById('testType').value;
        const scoreInput = document.getElementById('scoreValue');
        const helpText = document.getElementById('scoreHelp');
        
        if (testType && testConfigs[testType]) {
            const config = testConfigs[testType];
            scoreInput.min = config.min;
            scoreInput.max = config.max;
            scoreInput.setAttribute('step', '1');
            helpText.textContent = `Enter your ${config.name} score (${config.min}-${config.max})`;
        } else {
            scoreInput.removeAttribute('min');
            scoreInput.removeAttribute('max');
            scoreInput.setAttribute('step', '1');
            helpText.textContent = 'Select a test type first';
        }
    }

    async function handleScoreSubmit(e) {
        e.preventDefault();

        const testTypeValue = document.getElementById('testType').value;
        const scoreValue = document.getElementById('scoreValue').value;
        const testDateValue = document.getElementById('testDate').value;

        if (!testTypeValue || !scoreValue || !testDateValue) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        const scoreData = {
            testType: testTypeValue,
            score: parseInt(scoreValue),
            testDate: firebase.firestore.Timestamp.fromDate(new Date(testDateValue)),
            percentile: document.getElementById('percentile').value ? parseInt(document.getElementById('percentile').value) : null,
            targetScore: document.getElementById('targetScore').value ? parseInt(document.getElementById('targetScore').value) : null,
            retakeDate: document.getElementById('retakeDate').value ? firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('retakeDate').value)) : null,
            notes: document.getElementById('scoreNotes').value || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!selectedScoreId) {
            scoreData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        try {
            showLoading();

            if (selectedScoreId) {
                await db.collection('users').doc(currentUser.uid).collection('scores').doc(selectedScoreId).update(scoreData);
                showNotification('Score updated successfully', 'success');
            } else {
                await db.collection('users').doc(currentUser.uid).collection('scores').add(scoreData);
                showNotification('Score added successfully', 'success');
            }

            await loadScores();
            updateAllDisplays();
            closeModalById('scoreModal');
            if (elements.scoreForm) {
                elements.scoreForm.reset();
            }
            selectedScoreId = null;
        } catch (error) {
            console.error('Error saving score:', error);
            showNotification('Error saving score', 'error');
        } finally {
            hideLoading();
        }
    }

    async function handleGoalSubmit(e) {
        e.preventDefault();
        
        try {
            showLoading();
            await db.collection('users').doc(currentUser.uid).collection('settings').doc('goals').set(goals, { merge: true });
            showNotification('Goals saved successfully', 'success');
            closeModalById('goalModal');
            updateAllDisplays();
        } catch (error) {
            console.error('Error saving goals:', error);
            showNotification('Error saving goals', 'error');
        } finally {
            hideLoading();
        }
    }

    async function refreshData() {
        try {
            showLoading();
            await Promise.all([loadScores(), loadGoals()]);
            updateAllDisplays();
            showNotification('Data refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            showNotification('Error refreshing data', 'error');
        } finally {
            hideLoading();
        }
    }

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalId) {
        closeModalById(modalId);
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    function formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    function showError(message) {
        elements.scoresGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="empty-title">Error Loading Scores</h3>
                <p class="empty-description">${message}</p>
                <button class="btn btn-primary" onclick="refreshData()" style="margin-top: 16px;">
                    <i class="fas fa-sync-alt"></i>
                    Try Again
                </button>
            </div>
        `;
    }

    window.openAddScoreModal = openAddScoreModal;
    window.editScore = editScore;
    window.showDeleteConfirmation = showDeleteConfirmation;
    window.openScoreDetail = openScoreDetail;
    window.refreshData = refreshData;
});
