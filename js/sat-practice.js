class SATTest {
    constructor() {
        this.questions = [];
        this.currentSection = 'RW';
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.markedQuestions = new Set();
        this.startTime = null;
        this.sectionStartTime = null;
        this.sectionTimes = {};
        this.timeRemaining = 0;
        this.timerInterval = null;
        this.currentScreen = 'welcome';
        this.testId = null;
        this.currentUser = null;
        
        this.initializeAuth();
        this.loadQuestions();
        this.initializeEventListeners();
        this.initializeCalculator();
        this.setupCommonUI();
    }

    async initializeAuth() {
        return new Promise((resolve) => {
            if (typeof auth !== 'undefined') {
                auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        this.currentUser = user;
                        window.currentUser = user;
                        await this.loadUserInfo();
                        resolve(user);
                    } else {
                        window.location.href = 'index.html';
                    }
                });
            }
        });
    }

    async loadUserInfo() {
        try {
            let userData = null;
            if (typeof db !== 'undefined') {
                const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
                if (userDoc.exists) {
                    userData = userDoc.data();
                }
            }
            
            const userName = (userData?.name) || this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User';
            
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = userName;
            }
            
            let avatarUrl = (userData?.avatarUrl) || this.currentUser.photoURL;
            if (!avatarUrl) {
                avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`;
            }
            
            const userAvatarEl = document.getElementById('userAvatar');
            if (userAvatarEl) {
                userAvatarEl.src = avatarUrl;
                userAvatarEl.alt = userName;
            }
            
        } catch (error) {
            console.error('Error loading user info:', error);
            const userName = this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User';
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = userName;
            }
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`;
            const userAvatarEl = document.getElementById('userAvatar');
            if (userAvatarEl) {
                userAvatarEl.src = avatarUrl;
                userAvatarEl.alt = userName;
            }
        }
    }

    setupCommonUI() {
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');
        const themeToggle = document.getElementById('themeToggle');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            document.addEventListener('click', (e) => {
                if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await auth.signOut();
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Error signing out:', error);
                }
            });
        }

        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                
                const icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                }
                
                localStorage.setItem('theme', newTheme);
            });

            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    async loadQuestions() {
        try {
            const response = await fetch('../../questions.json');
            if (!response.ok) {
                throw new Error(`Failed to load questions: ${response.status}`);
            }
            const allQuestions = await response.json();
            
            const rwQuestions = allQuestions.filter(q => q.section === 'RW');
            const mathQuestions = allQuestions.filter(q => q.section === 'Math');
            
            const shuffledRW = this.shuffleArray([...rwQuestions]);
            const shuffledMath = this.shuffleArray([...mathQuestions]);
            
            this.questions = [
                ...shuffledRW.slice(0, 50),
                ...shuffledMath.slice(0, 50)
            ];
            
            this.questions = this.shuffleArray(this.questions);
            
        } catch (error) {
            console.error('Could not load questions from file:', error);
            console.warn('Using fallback questions');
            this.questions = this.getFallbackQuestions();
        }
        
        this.shuffleQuestions();
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    getFallbackQuestions() {
        const fallbackQuestions = [
            {"id":"RW-0001","batch":1,"section":"RW","difficulty":"Easy","skills":["grammar","verb tense"],"tags":["conventions of standard english"],"stem":"The scientist, after years of research, finally [[publish]] her groundbreaking findings in a prestigious journal.","passage":null,"choices":["No change","published","publishes","publishing"],"answer_index":2,"answer_letter":"C","explanation":"The singular subject 'scientist' requires the singular present tense verb 'publishes' to agree. The adverb 'finally' indicates a completed action, but the main clause structure requires a finite verb.","calculator":null},
            {"id":"RW-0002","batch":1,"section":"RW","difficulty":"Easy","skills":["punctuation","commas"],"tags":["boundaries","conventions"],"stem":"Choose the best punctuation for the underlined section: The old house, which had been abandoned for decades was finally being renovated.","passage":null,"choices":["No change","decades, was","decades; was","decades — was"],"answer_index":1,"answer_letter":"B","explanation":"The clause 'which had been abandoned for decades' is nonrestrictive and must be set off with a comma. A comma is required after 'decades' to separate this clause from the main verb 'was being renovated'.","calculator":null},
            {"id":"RW-0003","batch":1,"section":"RW","difficulty":"Medium","skills":["transitions","logical sequence"],"tags":["expression of ideas"],"stem":"The experiment's initial results were highly promising. ______, subsequent attempts to replicate the data proved unsuccessful, casting doubt on the original conclusions.","passage":null,"choices":["For example","However","Similarly","Therefore"],"answer_index":1,"answer_letter":"B","explanation":"'However' is the correct transitional word to signal the contrast between the 'promising' initial results and the 'unsuccessful' subsequent attempts.","calculator":null},
            {"id":"RW-0004","batch":1,"section":"RW","difficulty":"Hard","skills":["rhetorical synthesis"],"tags":["expression of ideas","integration"],"stem":"An economist made the following three observations. 1) Consumer confidence is a leading indicator of economic growth. 2) Recent surveys show a sharp decline in consumer confidence. 3) Stock market volatility often increases during periods of low consumer confidence. Which choice best describes a likely outcome based on the economist's observations?","passage":null,"choices":["A period of economic growth is likely to be preceded by high consumer confidence.","The recent decline in consumer confidence suggests that stock market volatility may increase.","Stock market volatility is the primary cause of fluctuations in consumer confidence.","Economic growth causes a subsequent rise in consumer confidence and a drop in stock market volatility."],"answer_index":1,"answer_letter":"B","explanation":"This choice correctly synthesizes observation 2 (decline in confidence) with observation 3 (volatility increases with low confidence) to predict a likely outcome.","calculator":null},
            {"id":"RW-0005","batch":1,"section":"RW","difficulty":"Medium","skills":["logical inference","command of evidence"],"tags":["information and ideas"],"passage":"The Burgess Shale formation in the Canadian Rockies is a renowned fossil bed dating to the Cambrian period, approximately 508 million years ago. It preserves a unique snapshot of early marine life with exceptional soft-tissue detail. The rarity of such preservation is due to the specific conditions required: rapid burial under fine sediment in deep, anoxic waters to prevent scavenging and decomposition.","stem":"The passage suggests that the exceptional preservation of the Burgess Shale fossils is primarily attributable to which factor?","choices":["The great age of the fossils","The type of rock in which they were found","The specific environmental conditions at the site","The presence of exclusively marine organisms"],"answer_index":2,"answer_letter":"C","explanation":"The passage explicitly states that the 'rarity of such preservation is due to the specific conditions required,' which are then detailed (rapid burial, fine sediment, anoxic waters).","calculator":null},
            {"id":"M-0001","batch":1,"section":"Math","difficulty":"Easy","skills":["linear equations"],"tags":["algebra"],"stem":"If 4x + 7 = 19, what is the value of x?","passage":null,"choices":["3","4","5","6"],"answer_index":0,"answer_letter":"A","explanation":"4x + 7 = 19 → 4x = 12 → x = 3.","calculator":false},
            {"id":"M-0002","batch":1,"section":"Math","difficulty":"Easy","skills":["proportions"],"tags":["ratios"],"stem":"A recipe requires 3 cups of flour for every 2 cups of sugar. If a baker uses 9 cups of flour, how many cups of sugar are needed?","passage":null,"choices":["4","5","6","7"],"answer_index":2,"answer_letter":"C","explanation":"Set up the proportion 3/2 = 9/s. Cross-multiplying gives 3s = 18, so s = 6.","calculator":true},
            {"id":"M-0003","batch":1,"section":"Math","difficulty":"Medium","skills":["systems of linear equations"],"tags":["algebra"],"stem":"If 2x - y = 10 and x + y = 5, what is the value of x?","passage":null,"choices":["3","4","5","6"],"answer_index":2,"answer_letter":"C","explanation":"Add the two equations to eliminate y: (2x - y) + (x + y) = 10 + 5 → 3x = 15 → x = 5.","calculator":false},
            {"id":"M-0004","batch":1,"section":"Math","difficulty":"Hard","skills":["functions"],"tags":["algebra"],"stem":"The function f is defined by f(x) = 2x² - 3x + 1. What is the value of f(-2)?","passage":null,"choices":["-13","-1","15","21"],"answer_index":2,"answer_letter":"C","explanation":"f(-2) = 2(-2)² - 3(-2) + 1 = 2(4) + 6 + 1 = 8 + 6 + 1 = 15.","calculator":true},
            {"id":"M-0005","batch":1,"section":"Math","difficulty":"Medium","skills":["geometry","area"],"tags":["geometry"],"stem":"A rectangle has a length that is 3 times its width. If the perimeter of the rectangle is 64 inches, what is the area of the rectangle, in square inches?","passage":null,"choices":["48","96","192","256"],"answer_index":2,"answer_letter":"C","explanation":"Let w = width, then l = 3w. Perimeter P = 2(l + w) = 2(3w + w) = 8w = 64, so w = 8 and l = 24. Area A = l * w = 24 * 8 = 192.","calculator":true}
        ];
        
        const rwQuestions = fallbackQuestions.filter(q => q.section === 'RW');
        const mathQuestions = fallbackQuestions.filter(q => q.section === 'Math');
        
        const rwToUse = Math.min(50, rwQuestions.length);
        const mathToUse = Math.min(50, mathQuestions.length);
        
        const result = [
            ...rwQuestions.slice(0, rwToUse),
            ...mathQuestions.slice(0, mathToUse)
        ];
        
        return result;
    }

    shuffleQuestions() {
        const rwQuestions = this.questions.filter(q => q.section === 'RW');
        const mathQuestions = this.questions.filter(q => q.section === 'Math');
        
        this.questions = [...rwQuestions, ...mathQuestions];
    }

    initializeEventListeners() {
        document.getElementById('start-test-btn').addEventListener('click', () => this.startTest());
        document.getElementById('prev-btn').addEventListener('click', () => this.navigateQuestion(-1));
        document.getElementById('next-btn').addEventListener('click', () => this.navigateQuestion(1));
        document.getElementById('mark-review-btn').addEventListener('click', () => this.toggleMarkForReview());
        document.getElementById('question-palette-btn').addEventListener('click', () => this.showQuestionPalette());
        document.getElementById('close-palette-btn').addEventListener('click', () => this.hideQuestionPalette());
        document.getElementById('continue-btn').addEventListener('click', () => this.continueToMathSection());
        document.getElementById('review-answers-btn').addEventListener('click', () => this.showAnswerReview());
        document.getElementById('retake-test-btn').addEventListener('click', () => this.retakeTest());
        document.getElementById('print-results-btn').addEventListener('click', () => this.printResults());
        document.getElementById('back-to-results-btn').addEventListener('click', () => this.showResults());
        document.getElementById('review-filter').addEventListener('change', (e) => this.filterReviewQuestions(e.target.value));
        document.getElementById('view-saved-tests-btn').addEventListener('click', () => this.showSavedTests());
        document.getElementById('back-to-welcome-btn').addEventListener('click', () => this.showScreen('welcome-screen'));
        document.getElementById('exit-test-btn').addEventListener('click', () => this.exitTest());
        document.getElementById('mobileMenuBtn').addEventListener('click', () => this.toggleMobileMenu());
        
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    exitTest() {
        this.showExitConfirmModal();
    }

    showExitConfirmModal() {
        const modal = document.getElementById('exit-confirm-modal');
        modal.classList.add('show');
        
        document.getElementById('cancel-exit-btn').onclick = () => {
            modal.classList.remove('show');
        };
        
        document.getElementById('confirm-exit-btn').onclick = () => {
            modal.classList.remove('show');
            this.resetTest();
            this.showScreen('welcome-screen');
        };
    }

    toggleMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navMenu = document.getElementById('navMenu');
        
        mobileMenuBtn.classList.toggle('active');
        navMenu.classList.toggle('active');
    }

    resetTest() {
        this.currentSection = 'RW';
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.markedQuestions = new Set();
        this.startTime = null;
        this.sectionStartTime = null;
        this.sectionTimes = {};
        this.timeRemaining = 0;
        this.testId = null;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    showSavedTests() {
        this.showScreen('saved-tests-screen');
        this.renderSavedTests();
    }

    renderSavedTests() {
        const savedTests = this.getSavedTests();
        const container = document.getElementById('saved-tests-list');
        
        if (savedTests.length === 0) {
            container.innerHTML = `
                <div class="no-tests">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No saved tests yet</h3>
                    <p>Complete a practice test to see your results here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = savedTests.map(test => `
            <div class="saved-test-item" data-test-id="${test.id}">
                <div class="test-info">
                    <div class="test-score">
                        <span class="score-number">${test.score}</span>
                        <span class="score-label">/ 1600</span>
                    </div>
                    <div class="test-details">
                        <h4>SAT Practice Test</h4>
                        <p class="test-date">${new Date(test.date).toLocaleDateString()}</p>
                        <div class="section-scores">
                            <span>R&W: ${test.details.rwScore}</span>
                            <span>Math: ${test.details.mathScore}</span>
                        </div>
                    </div>
                </div>
                <div class="test-actions">
                    <button class="view-details-btn" onclick="satTest.viewTestDetails('${test.id}')">
                        <i class="fas fa-eye"></i>
                        View Details
                    </button>
                    <button class="delete-test-btn" onclick="satTest.confirmDeleteTest('${test.id}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    viewTestDetails(testId) {
        const savedTests = this.getSavedTests();
        const test = savedTests.find(t => t.id === testId);
        
        if (!test) return;

        const modal = document.createElement('div');
        modal.className = 'test-details-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Test Details</h2>
                    <button class="close-btn" onclick="this.closest('.test-details-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="test-overview">
                        <div class="score-display">
                            <div class="total-score">${test.score} / 1600</div>
                            <div class="test-date">${new Date(test.date).toLocaleDateString()}</div>
                        </div>
                        <div class="section-breakdown">
                            <div class="section">
                                <h3>Reading & Writing</h3>
                                <div class="section-score">${test.details.rwScore}</div>
                                <div class="section-stats">
                                    ${test.details.rwCorrect} / ${test.details.rwTotal} correct
                                    (${((test.details.rwCorrect / test.details.rwTotal) * 100).toFixed(1)}%)
                                </div>
                            </div>
                            <div class="section">
                                <h3>Math</h3>
                                <div class="section-score">${test.details.mathScore}</div>
                                <div class="section-stats">
                                    ${test.details.mathCorrect} / ${test.details.mathTotal} correct
                                    (${((test.details.mathCorrect / test.details.mathTotal) * 100).toFixed(1)}%)
                                </div>
                            </div>
                        </div>
                        <div class="time-stats">
                            <h3>Time Usage</h3>
                            <div class="time-breakdown">
                                <div>Reading & Writing: ${this.formatTime(test.details.timeUsed.rw)}</div>
                                <div>Math: ${this.formatTime(test.details.timeUsed.math)}</div>
                                <div>Total: ${this.formatTime(test.details.timeUsed.total)}</div>
                            </div>
                        </div>
                        ${test.details.reviewData ? `
                            <div class="review-section">
                                <h3>Review Answers</h3>
                                <button class="view-review-btn" onclick="satTest.showDetailedReview('${testId}')">
                                    <i class="fas fa-search"></i>
                                    View Detailed Answer Review
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showDetailedReview(testId) {
        const savedTests = this.getSavedTests();
        const test = savedTests.find(t => t.id === testId);
        
        if (!test || !test.details.reviewData) return;

        document.querySelector('.test-details-modal').remove();

        const modal = document.createElement('div');
        modal.className = 'test-details-modal review-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Answer Review - ${new Date(test.date).toLocaleDateString()}</h2>
                    <div class="review-controls">
                        <select id="review-filter-modal" class="review-select">
                            <option value="all">All Questions</option>
                            <option value="correct">Correct</option>
                            <option value="incorrect">Incorrect</option>
                            <option value="marked">Marked</option>
                            <option value="unanswered">Not Answered</option>
                            <option value="rw">Reading & Writing</option>
                            <option value="math">Math</option>
                        </select>
                        <button class="close-btn" onclick="this.closest('.test-details-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div id="detailed-review-content" class="detailed-review-content">
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        this.renderDetailedReview(test.details.reviewData, 'all');
        
        document.getElementById('review-filter-modal').addEventListener('change', (e) => {
            this.renderDetailedReview(test.details.reviewData, e.target.value);
        });
    }

    renderDetailedReview(reviewData, filter) {
        let filteredData = reviewData;
        
        switch(filter) {
            case 'correct':
                filteredData = reviewData.filter(q => q.isCorrect);
                break;
            case 'incorrect':
                filteredData = reviewData.filter(q => q.isAnswered && !q.isCorrect);
                break;
            case 'marked':
                filteredData = reviewData.filter(q => q.isMarked);
                break;
            case 'unanswered':
                filteredData = reviewData.filter(q => !q.isAnswered);
                break;
            case 'rw':
                filteredData = reviewData.filter(q => q.section === 'RW');
                break;
            case 'math':
                filteredData = reviewData.filter(q => q.section === 'Math');
                break;
        }

        const container = document.getElementById('detailed-review-content');
        
        if (filteredData.length === 0) {
            container.innerHTML = '<div class="no-questions">No questions match the current filter.</div>';
            return;
        }

        container.innerHTML = filteredData.map((question, index) => {
            const statusClass = question.isAnswered ? (question.isCorrect ? 'correct' : 'incorrect') : 'unanswered';
            const statusIcon = question.isAnswered ? (question.isCorrect ? 'check-circle' : 'times-circle') : 'circle';
            
            return `
                <div class="review-question ${statusClass}">
                    <div class="question-header">
                        <div class="question-info">
                            <span class="question-number">Question ${index + 1}</span>
                            <span class="question-section">${question.section}</span>
                            <span class="question-difficulty">${question.difficulty}</span>
                            ${question.isMarked ? '<span class="marked-badge"><i class="fas fa-flag"></i> Marked</span>' : ''}
                        </div>
                        <div class="question-status">
                            <i class="fas fa-${statusIcon} ${statusClass}"></i>
                        </div>
                    </div>
                    
                    <div class="question-content">
                        <div class="question-text">${question.questionText}</div>
                        ${question.passage ? `<div class="passage-text">${question.passage}</div>` : ''}
                        
                        <div class="choices-review">
                            ${question.choices.map((choice, choiceIndex) => {
                                const isUserAnswer = question.userAnswer === choiceIndex;
                                const isCorrectAnswer = question.correctAnswer === choiceIndex;
                                let choiceClass = '';
                                if (isCorrectAnswer) choiceClass += ' correct-answer';
                                if (isUserAnswer && !isCorrectAnswer) choiceClass += ' user-wrong';
                                if (isUserAnswer && isCorrectAnswer) choiceClass += ' user-correct';
                                
                                return `
                                    <div class="choice-review${choiceClass}">
                                        <span class="choice-letter">${String.fromCharCode(65 + choiceIndex)}</span>
                                        <span class="choice-text">${choice}</span>
                                        ${isCorrectAnswer ? '<i class="fas fa-check-circle correct"></i>' : ''}
                                        ${isUserAnswer && !isCorrectAnswer ? '<i class="fas fa-times-circle incorrect"></i>' : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        
                        <div class="answer-summary">
                            <div class="answer-info">
                                <strong>Your Answer:</strong> ${question.userAnswerLetter || 'Not answered'}
                                <strong>Correct Answer:</strong> ${question.correctAnswerLetter}
                            </div>
                        </div>
                        
                        <div class="explanation">
                            <h4>Explanation:</h4>
                            <p>${question.explanation}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    confirmDeleteTest(testId) {
        this.currentDeleteTestId = testId;
        const deleteModal = document.getElementById('delete-test-modal');
        deleteModal.style.display = 'flex';

        document.getElementById('cancel-delete-test-btn').onclick = () => {
            deleteModal.style.display = 'none';
            this.currentDeleteTestId = null;
        };

        document.getElementById('confirm-delete-test-btn').onclick = () => {
            if (this.deleteSavedTest(this.currentDeleteTestId)) {
                this.renderSavedTests();
            }
            deleteModal.style.display = 'none';
            this.currentDeleteTestId = null;
        };
    }

    initializeCalculator() {
        window.calculator = {
            display: document.getElementById('calc-display'),
            historyDisplay: document.getElementById('calc-history'),
            memoryIndicator: document.getElementById('calc-memory'),
            currentInput: '0',
            operator: null,
            previousInput: null,
            waitingForOperand: false,
            memory: 0,
            hasMemory: false,
            mode: 'basic',
            isMinimized: false,
            history: '',
            pendingFunction: null,

            updateDisplay() {
                let displayValue = this.currentInput;
                if (!isNaN(displayValue) && Math.abs(parseFloat(displayValue)) >= 1e10) {
                    displayValue = parseFloat(displayValue).toExponential(6);
                } else if (!isNaN(displayValue)) {
                    const num = parseFloat(displayValue);
                    if (num !== Math.floor(num)) {
                        displayValue = num.toFixed(8).replace(/\.?0+$/, '');
                    }
                }
                this.display.textContent = displayValue;
                
                this.historyDisplay.textContent = this.history;
                
                this.memoryIndicator.style.display = this.hasMemory ? 'block' : 'none';
            },

            inputNumber(num) {
                if (this.waitingForOperand) {
                    this.currentInput = num;
                    this.waitingForOperand = false;
                } else {
                    this.currentInput = this.currentInput === '0' ? num : this.currentInput + num;
                }
                this.updateDisplay();
            },

            inputDecimal() {
                if (this.waitingForOperand) {
                    this.currentInput = '0.';
                    this.waitingForOperand = false;
                } else if (this.currentInput.indexOf('.') === -1) {
                    this.currentInput += '.';
                }
                this.updateDisplay();
            },

            inputOperation(nextOperator) {
                const inputValue = parseFloat(this.currentInput);

                if (this.previousInput === null) {
                    this.previousInput = inputValue;
                } else if (this.operator) {
                    const currentValue = this.previousInput || 0;
                    const newValue = this.performCalculation(this.operator, currentValue, inputValue);

                    this.currentInput = String(newValue);
                    this.previousInput = newValue;
                    this.updateDisplay();
                }

                this.waitingForOperand = true;
                this.operator = nextOperator;
                
                if (nextOperator === '!') {
                    this.history = `factorial(${inputValue})`;
                    this.calculate();
                } else if (nextOperator === '%') {
                    this.currentInput = String(inputValue / 100);
                    this.waitingForOperand = false;
                    this.operator = null;
                    this.updateDisplay();
                } else {
                    this.history = `${this.currentInput} ${nextOperator}`;
                }
            },

            inputFunction(func) {
                const inputValue = parseFloat(this.currentInput);
                let result;

                try {
                    switch (func) {
                        case 'sin':
                            result = Math.sin(this.toRadians(inputValue));
                            this.history = `sin(${inputValue})`;
                            break;
                        case 'cos':
                            result = Math.cos(this.toRadians(inputValue));
                            this.history = `cos(${inputValue})`;
                            break;
                        case 'tan':
                            result = Math.tan(this.toRadians(inputValue));
                            this.history = `tan(${inputValue})`;
                            break;
                        case 'log':
                            if (inputValue <= 0) throw new Error('Invalid input');
                            result = Math.log10(inputValue);
                            this.history = `log(${inputValue})`;
                            break;
                        case 'ln':
                            if (inputValue <= 0) throw new Error('Invalid input');
                            result = Math.log(inputValue);
                            this.history = `ln(${inputValue})`;
                            break;
                        case 'sqrt':
                            if (inputValue < 0) throw new Error('Invalid input');
                            result = Math.sqrt(inputValue);
                            this.history = `√(${inputValue})`;
                            break;
                        case 'abs':
                            result = Math.abs(inputValue);
                            this.history = `|${inputValue}|`;
                            break;
                        default:
                            throw new Error('Unknown function');
                    }

                    this.currentInput = String(result);
                    this.waitingForOperand = true;
                    this.updateDisplay();
                } catch (error) {
                    this.currentInput = 'Error';
                    this.updateDisplay();
                }
            },

            inputConstant(constant) {
                switch (constant) {
                    case 'pi':
                        this.currentInput = String(Math.PI);
                        break;
                    case 'e':
                        this.currentInput = String(Math.E);
                        break;
                }
                this.waitingForOperand = true;
                this.updateDisplay();
            },

            toRadians(degrees) {
                return degrees * (Math.PI / 180);
            },

            factorial(n) {
                if (n < 0 || !Number.isInteger(n)) throw new Error('Invalid input');
                if (n > 170) throw new Error('Number too large');
                if (n === 0 || n === 1) return 1;
                let result = 1;
                for (let i = 2; i <= n; i++) {
                    result *= i;
                }
                return result;
            },

            performCalculation(operator, firstOperand, secondOperand) {
                switch (operator) {
                    case '+': return firstOperand + secondOperand;
                    case '-': return firstOperand - secondOperand;
                    case '*': return firstOperand * secondOperand;
                    case '/': 
                        if (secondOperand === 0) throw new Error('Division by zero');
                        return firstOperand / secondOperand;
                    case '^': return Math.pow(firstOperand, secondOperand);
                    case '!': return this.factorial(firstOperand);
                    default: return secondOperand;
                }
            },

            calculate() {
                try {
                    const inputValue = parseFloat(this.currentInput);

                    if (this.operator === '!') {
                        const result = this.factorial(inputValue);
                        this.currentInput = String(result);
                    } else if (this.previousInput !== null && this.operator) {
                        const newValue = this.performCalculation(this.operator, this.previousInput, inputValue);
                        this.currentInput = String(newValue);
                        this.history += ` ${inputValue} = ${newValue}`;
                    }

                    this.previousInput = null;
                    this.operator = null;
                    this.waitingForOperand = true;
                    this.updateDisplay();
                } catch (error) {
                    this.currentInput = 'Error';
                    this.history = 'Error';
                    this.updateDisplay();
                }
            },

            clear() {
                this.currentInput = '0';
                this.previousInput = null;
                this.operator = null;
                this.waitingForOperand = false;
                this.history = '';
                this.updateDisplay();
            },

            clearEntry() {
                this.currentInput = '0';
                this.updateDisplay();
            },

            backspace() {
                if (this.currentInput.length > 1) {
                    this.currentInput = this.currentInput.slice(0, -1);
                } else {
                    this.currentInput = '0';
                }
                this.updateDisplay();
            },

            toggleSign() {
                if (this.currentInput !== '0') {
                    this.currentInput = this.currentInput.startsWith('-') 
                        ? this.currentInput.slice(1) 
                        : '-' + this.currentInput;
                }
                this.updateDisplay();
            },

            memoryClear() {
                this.memory = 0;
                this.hasMemory = false;
                this.updateDisplay();
            },

            memoryRecall() {
                this.currentInput = String(this.memory);
                this.waitingForOperand = true;
                this.updateDisplay();
            },

            memoryAdd() {
                this.memory += parseFloat(this.currentInput);
                this.hasMemory = true;
                this.waitingForOperand = true;
                this.updateDisplay();
            },

            memorySubtract() {
                this.memory -= parseFloat(this.currentInput);
                this.hasMemory = true;
                this.waitingForOperand = true;
                this.updateDisplay();
            },

            switchMode(mode) {
                this.mode = mode;
                const basicBtn = document.getElementById('basic-mode');
                const scientificBtn = document.getElementById('scientific-mode');
                const scientificButtons = document.getElementById('scientific-buttons');

                if (mode === 'scientific') {
                    basicBtn.classList.remove('active');
                    scientificBtn.classList.add('active');
                    scientificButtons.classList.remove('hidden');
                } else {
                    basicBtn.classList.add('active');
                    scientificBtn.classList.remove('active');
                    scientificButtons.classList.add('hidden');
                }
            },

            toggleMinimize() {
                const calculator = document.querySelector('.calculator');
                const minimizeBtn = document.querySelector('.calc-minimize');
                
                this.isMinimized = !this.isMinimized;
                
                if (this.isMinimized) {
                    calculator.classList.add('minimized');
                    minimizeBtn.textContent = '+';
                } else {
                    calculator.classList.remove('minimized');
                    minimizeBtn.textContent = '−';
                }
            }
        };

        calculator.updateDisplay();
    }

        async startTest() {
        await this.loadQuestions();
        this.currentScreen = 'test';
        this.currentSection = 'RW';
        this.currentQuestionIndex = 0;
        this.startTime = Date.now();
        this.sectionStartTime = Date.now();
        this.timeRemaining = 64 * 60;
        this.testId = this.generateTestId();
        this.showScreen('test-screen');
        this.updateSectionDisplay();
        this.displayQuestion();
        this.startTimer();
        this.updateQuestionPalette();
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    updateSectionDisplay() {
        const sectionName = this.currentSection === 'RW' ? 'Reading & Writing' : 'Math';
        const questionsInSection = this.questions.filter(q => q.section === this.currentSection);
        const currentInSection = questionsInSection.findIndex(q => q.id === this.questions[this.currentQuestionIndex].id) + 1;
        
        document.getElementById('current-section').textContent = sectionName;
        document.getElementById('current-question').textContent = currentInSection;
        document.getElementById('total-questions').textContent = questionsInSection.length;
        
        const calculatorPanel = document.getElementById('calculator-panel');
        if (this.currentSection === 'Math' && this.questions[this.currentQuestionIndex].calculator !== false) {
            calculatorPanel.classList.remove('hidden');
        } else {
            calculatorPanel.classList.add('hidden');
        }
    }

    displayQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        const questionText = document.getElementById('question-text');
        const passageText = document.getElementById('passage-text');
        const choicesContainer = document.getElementById('choices-container');
        const markBtn = document.getElementById('mark-review-btn');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        questionText.innerHTML = this.formatQuestionText(question.stem);
        
        if (question.passage) {
            passageText.innerHTML = question.passage;
            passageText.classList.remove('hidden');
        } else {
            passageText.classList.add('hidden');
        }
        
        choicesContainer.innerHTML = '';
        question.choices.forEach((choice, index) => {
            const choiceElement = document.createElement('div');
            choiceElement.className = 'choice';
            choiceElement.innerHTML = `
                <div class="choice-letter">${String.fromCharCode(65 + index)}</div>
                <div class="choice-text">${choice}</div>
            `;
            
            const userAnswer = this.userAnswers[question.id];
            if (userAnswer === index) {
                choiceElement.classList.add('selected');
            }
            
            choiceElement.addEventListener('click', () => this.selectAnswer(index));
            choicesContainer.appendChild(choiceElement);
        });
        
        if (this.markedQuestions.has(question.id)) {
            markBtn.classList.add('marked');
            markBtn.innerHTML = '<i class="fas fa-flag"></i> Marked for Review';
        } else {
            markBtn.classList.remove('marked');
            markBtn.innerHTML = '<i class="fas fa-flag"></i> Mark for Review';
        }
        
        prevBtn.disabled = this.currentQuestionIndex === 0;
        
        const isLastInSection = this.isLastQuestionInSection();
        const isLastOverall = this.currentQuestionIndex === this.questions.length - 1;
        
        if (isLastOverall) {
            nextBtn.innerHTML = 'Finish Test <i class="fas fa-check"></i>';
        } else if (isLastInSection) {
            nextBtn.innerHTML = 'Next Section <i class="fas fa-arrow-right"></i>';
        } else {
            nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
        }
        
        this.updateSectionDisplay();
    }

    formatQuestionText(text) {
        return text.replace(/\[\[(.*?)\]\]/g, '<span class="underlined-text">$1</span>');
    }

    selectAnswer(answerIndex) {
        const question = this.questions[this.currentQuestionIndex];
        this.userAnswers[question.id] = answerIndex;
        
        document.querySelectorAll('.choice').forEach((choice, index) => {
            choice.classList.toggle('selected', index === answerIndex);
        });
        
        this.updateQuestionPalette();
    }

    toggleMarkForReview() {
        const question = this.questions[this.currentQuestionIndex];
        const markBtn = document.getElementById('mark-review-btn');
        
        if (this.markedQuestions.has(question.id)) {
            this.markedQuestions.delete(question.id);
            markBtn.classList.remove('marked');
            markBtn.innerHTML = '<i class="fas fa-flag"></i> Mark for Review';
        } else {
            this.markedQuestions.add(question.id);
            markBtn.classList.add('marked');
            markBtn.innerHTML = '<i class="fas fa-flag"></i> Marked for Review';
        }
        
        this.updateQuestionPalette();
    }

    navigateQuestion(direction) {
        if (direction === 1) {
            if (this.isLastQuestionInSection() && this.currentSection === 'RW') {
                this.endRWSection();
                return;
            } else if (this.currentQuestionIndex === this.questions.length - 1) {
                this.endTest();
                return;
            }
        }
        
        const newIndex = this.currentQuestionIndex + direction;
        if (newIndex >= 0 && newIndex < this.questions.length) {
            this.currentQuestionIndex = newIndex;
            
            if (this.questions[this.currentQuestionIndex].section !== this.currentSection) {
                this.currentSection = this.questions[this.currentQuestionIndex].section;
            }
            
            this.displayQuestion();
        }
    }

    isLastQuestionInSection() {
        const currentSection = this.questions[this.currentQuestionIndex].section;
        const nextIndex = this.currentQuestionIndex + 1;
        
        if (nextIndex >= this.questions.length) return true;
        
        return this.questions[nextIndex].section !== currentSection;
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                if (this.currentSection === 'RW') {
                    this.endRWSection();
                } else {
                    this.endTest();
                }
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const timerDisplay = document.getElementById('timer-display');
        const timerContainer = timerDisplay.parentElement;
        
        timerDisplay.textContent = display;
        
        timerContainer.classList.remove('warning', 'critical');
        if (this.timeRemaining <= 300) {
            timerContainer.classList.add('critical');
        } else if (this.timeRemaining <= 600) {
            timerContainer.classList.add('warning');
        }
    }

    showQuestionPalette() {
        document.getElementById('question-palette').classList.remove('hidden');
        this.updateQuestionPalette();
    }

    hideQuestionPalette() {
        document.getElementById('question-palette').classList.add('hidden');
    }

    updateQuestionPalette() {
        const paletteGrid = document.getElementById('palette-grid');
        paletteGrid.innerHTML = '';
        
        const sectionQuestions = this.questions.filter(q => q.section === this.currentSection);
        
        sectionQuestions.forEach((question, index) => {
            const button = document.createElement('button');
            button.className = 'palette-question';
            button.textContent = index + 1;
            
            const actualIndex = this.questions.findIndex(q => q.id === question.id);
            
            if (this.userAnswers.hasOwnProperty(question.id)) {
                button.classList.add('answered');
            }
            
            if (this.markedQuestions.has(question.id)) {
                button.classList.add('marked');
            }
            
            if (actualIndex === this.currentQuestionIndex) {
                button.classList.add('current');
            }
            
            button.addEventListener('click', () => {
                this.currentQuestionIndex = actualIndex;
                this.displayQuestion();
                this.hideQuestionPalette();
            });
            
            paletteGrid.appendChild(button);
        });
    }

    endRWSection() {
        clearInterval(this.timerInterval);
        this.sectionTimes.RW = Date.now() - this.sectionStartTime;
        
        const answeredQuestions = this.questions.filter(q => 
            q.section === 'RW' && this.userAnswers.hasOwnProperty(q.id)
        ).length;
        
        const markedQuestions = this.questions.filter(q => 
            q.section === 'RW' && this.markedQuestions.has(q.id)
        ).length;
        
        const timeUsed = this.formatTime(this.sectionTimes.RW);
        
        document.getElementById('answered-count').textContent = answeredQuestions;
        document.getElementById('marked-count').textContent = markedQuestions;
        document.getElementById('time-used').textContent = timeUsed;
        
        this.showScreen('section-break-screen');
    }

    continueToMathSection() {
        this.currentSection = 'Math';
        this.currentQuestionIndex = this.questions.findIndex(q => q.section === 'Math');
        this.sectionStartTime = Date.now();
        this.timeRemaining = 70 * 60;
        
        this.showScreen('test-screen');
        this.displayQuestion();
        this.startTimer();
        this.updateQuestionPalette();
    }

    endTest() {
        clearInterval(this.timerInterval);
        this.sectionTimes.Math = Date.now() - this.sectionStartTime;
        
        this.calculateResults();
        this.showResults();
    }

    calculateResults() {
        const rwQuestions = this.questions.filter(q => q.section === 'RW');
        const mathQuestions = this.questions.filter(q => q.section === 'Math');
        
        let rwCorrect = 0;
        let mathCorrect = 0;
        
        rwQuestions.forEach(question => {
            const userAnswer = this.userAnswers[question.id];
            if (userAnswer === question.answer_index) {
                rwCorrect++;
            }
        });
        
        mathQuestions.forEach(question => {
            const userAnswer = this.userAnswers[question.id];
            if (userAnswer === question.answer_index) {
                mathCorrect++;
            }
        });
        
        const rwPercentage = (rwCorrect / rwQuestions.length) * 100;
        const mathPercentage = (mathCorrect / mathQuestions.length) * 100;
        
        const rwScore = Math.round(200 + (rwPercentage / 100) * 600);
        const mathScore = Math.round(200 + (mathPercentage / 100) * 600);
        const totalScore = rwScore + mathScore;
        
        this.results = {
            rw: { correct: rwCorrect, total: rwQuestions.length, percentage: rwPercentage, score: rwScore },
            math: { correct: mathCorrect, total: mathQuestions.length, percentage: mathPercentage, score: mathScore },
            total: totalScore,
            timeUsed: {
                rw: this.sectionTimes.RW || 0,
                math: this.sectionTimes.Math || 0,
                total: (this.sectionTimes.RW || 0) + (this.sectionTimes.Math || 0)
            },
            completedAt: new Date(),
            testId: this.testId || this.generateTestId()
        };
        
        this.saveTestResults();
    }

    generateTestId() {
        return 'sat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async saveTestResults() {
        try {
            const reviewData = this.generateReviewData();
            
            const testData = {
                id: this.results.testId,
                type: 'SAT',
                score: this.results.total,
                date: this.results.completedAt,
                details: {
                    rwScore: this.results.rw.score,
                    mathScore: this.results.math.score,
                    rwCorrect: this.results.rw.correct,
                    rwTotal: this.results.rw.total,
                    mathCorrect: this.results.math.correct,
                    mathTotal: this.results.math.total,
                    timeUsed: this.results.timeUsed,
                    userAnswers: this.userAnswers,
                    markedQuestions: Array.from(this.markedQuestions),
                    reviewData: reviewData
                }
            };

            this.saveToLocalStorage(testData);

            if (this.currentUser && typeof db !== 'undefined') {
                await this.saveToFirebase(testData);
            }

        } catch (error) {
            console.error('Error saving test results:', error);
        }
    }

    generateReviewData() {
        return this.questions.map(question => {
            const userAnswer = this.userAnswers[question.id];
            const isCorrect = userAnswer === question.answer_index;
            const isMarked = this.markedQuestions.has(question.id);
            const isAnswered = userAnswer !== undefined;
            
            return {
                questionId: question.id,
                questionText: question.stem,
                passage: question.passage,
                choices: question.choices,
                correctAnswer: question.answer_index,
                correctAnswerLetter: question.answer_letter,
                userAnswer: userAnswer,
                userAnswerLetter: userAnswer !== undefined ? String.fromCharCode(65 + userAnswer) : null,
                isCorrect: isCorrect,
                isMarked: isMarked,
                isAnswered: isAnswered,
                explanation: question.explanation,
                section: question.section,
                difficulty: question.difficulty,
                skills: question.skills,
                tags: question.tags
            };
        });
    }

    saveToLocalStorage(testData) {
        try {
            const savedTests = JSON.parse(localStorage.getItem('satTests') || '[]');
            savedTests.push(testData);
            savedTests.sort((a, b) => new Date(b.date) - new Date(a.date));
            localStorage.setItem('satTests', JSON.stringify(savedTests));
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    }

    async saveToFirebase(testData) {
        try {
            const scoresRef = db.collection('users').doc(this.currentUser.uid).collection('scores');
            const now = firebase.firestore.Timestamp.now();
            
            await scoresRef.add({
                createdAt: now,
                notes: "",
                percentile: null,
                retakeDate: null,
                score: testData.score,
                targetScore: null,
                testDate: firebase.firestore.Timestamp.fromDate(testData.date),
                testType: "sat",
                updatedAt: now
            });
        } catch (error) {
            console.error('Error saving to Firebase:', error);
        }
    }

    getSavedTests() {
        try {
            return JSON.parse(localStorage.getItem('satTests') || '[]');
        } catch (error) {
            console.error('Error loading saved tests:', error);
            return [];
        }
    }

    deleteSavedTest(testId) {
        try {
            const savedTests = this.getSavedTests();
            const updatedTests = savedTests.filter(test => test.id !== testId);
            localStorage.setItem('satTests', JSON.stringify(updatedTests));
            return true;
        } catch (error) {
            console.error('Error deleting test:', error);
            return false;
        }
    }

    showResults() {
        this.showScreen('results-screen');
        
        document.getElementById('total-score').textContent = this.results.total;
        document.getElementById('rw-score').textContent = this.results.rw.score;
        document.getElementById('math-score').textContent = this.results.math.score;
        
        document.getElementById('rw-correct').textContent = this.results.rw.correct;
        document.getElementById('rw-total').textContent = this.results.rw.total;
        document.getElementById('rw-percentage').textContent = this.results.rw.percentage.toFixed(1) + '%';
        
        document.getElementById('math-correct').textContent = this.results.math.correct;
        document.getElementById('math-total').textContent = this.results.math.total;
        document.getElementById('math-percentage').textContent = this.results.math.percentage.toFixed(1) + '%';
        
        document.getElementById('rw-time-used').textContent = this.formatTime(this.results.timeUsed.rw);
        document.getElementById('math-time-used').textContent = this.formatTime(this.results.timeUsed.math);
        document.getElementById('total-time-used').textContent = this.formatTime(this.results.timeUsed.total);
        
        this.displaySkillBreakdown();
        this.showSaveConfirmation();
    }

    showSaveConfirmation() {
        const existingAlert = document.querySelector('.test-saved-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = document.createElement('div');
        alert.className = 'test-saved-alert';
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-check-circle"></i>
                <span>Test results saved successfully!</span>
            </div>
        `;
        
        const resultsContainer = document.querySelector('.results-container');
        resultsContainer.insertBefore(alert, resultsContainer.firstChild);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    displaySkillBreakdown() {
        const skillGrid = document.getElementById('skill-breakdown');
        skillGrid.innerHTML = '';
        
        const skillStats = {};
        
        this.questions.forEach(question => {
            question.skills.forEach(skill => {
                if (!skillStats[skill]) {
                    skillStats[skill] = { correct: 0, total: 0 };
                }
                skillStats[skill].total++;
                
                const userAnswer = this.userAnswers[question.id];
                if (userAnswer === question.answer_index) {
                    skillStats[skill].correct++;
                }
            });
        });
        
        Object.entries(skillStats).forEach(([skill, stats]) => {
            const percentage = ((stats.correct / stats.total) * 100).toFixed(1);
            
            const skillItem = document.createElement('div');
            skillItem.className = 'skill-item';
            skillItem.innerHTML = `
                <div class="skill-name">${this.formatSkillName(skill)}</div>
                <div class="skill-score">
                    <span class="skill-percentage">${percentage}%</span>
                    <span class="skill-fraction">${stats.correct}/${stats.total}</span>
                </div>
            `;
            
            skillGrid.appendChild(skillItem);
        });
    }

    formatSkillName(skill) {
        return skill.split(/[\s_-]+/).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    showAnswerReview() {
        this.showScreen('review-screen');
        this.displayReviewQuestions('all');
    }

    displayReviewQuestions(filter) {
        const reviewContent = document.getElementById('review-content');
        reviewContent.innerHTML = '';
        
        let questionsToShow = this.questions;
        
        switch (filter) {
            case 'correct':
                questionsToShow = this.questions.filter(q => 
                    this.userAnswers[q.id] === q.answer_index
                );
                break;
            case 'incorrect':
                questionsToShow = this.questions.filter(q => 
                    this.userAnswers.hasOwnProperty(q.id) && 
                    this.userAnswers[q.id] !== q.answer_index
                );
                break;
            case 'marked':
                questionsToShow = this.questions.filter(q => 
                    this.markedQuestions.has(q.id)
                );
                break;
            case 'rw':
                questionsToShow = this.questions.filter(q => q.section === 'RW');
                break;
            case 'math':
                questionsToShow = this.questions.filter(q => q.section === 'Math');
                break;
        }
        
        questionsToShow.forEach((question, index) => {
            const reviewQuestion = this.createReviewQuestionElement(question, index + 1);
            reviewContent.appendChild(reviewQuestion);
        });
    }

    createReviewQuestionElement(question, questionNumber) {
        const userAnswer = this.userAnswers[question.id];
        const isCorrect = userAnswer === question.answer_index;
        const isMarked = this.markedQuestions.has(question.id);
        
        const questionDiv = document.createElement('div');
        questionDiv.className = 'review-question';
        
        const statusBadges = [];
        if (userAnswer !== undefined) {
            statusBadges.push(`<span class="status-badge ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? 'Correct' : 'Incorrect'}</span>`);
        }
        if (isMarked) {
            statusBadges.push('<span class="status-badge marked">Marked</span>');
        }
        
        questionDiv.innerHTML = `
            <div class="review-question-header">
                <span class="question-number">${question.section} Question ${questionNumber}</span>
                <div class="question-status">${statusBadges.join('')}</div>
            </div>
            <div class="review-question-text">${this.formatQuestionText(question.stem)}</div>
            ${question.passage ? `<div class="passage-text">${question.passage}</div>` : ''}
            <div class="review-choices">
                ${question.choices.map((choice, index) => {
                    let choiceClass = 'review-choice';
                    if (userAnswer === index && isCorrect) {
                        choiceClass += ' user-correct';
                    } else if (userAnswer === index) {
                        choiceClass += ' user-answer';
                    } else if (index === question.answer_index) {
                        choiceClass += ' correct-answer';
                    }
                    
                    return `
                        <div class="${choiceClass}">
                            <div class="choice-letter">${String.fromCharCode(65 + index)}</div>
                            <div class="choice-text">${choice}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="explanation">
                <div class="explanation-header">
                    <i class="fas fa-lightbulb"></i>
                    Explanation
                </div>
                <div class="explanation-text">${question.explanation}</div>
            </div>
        `;
        
        return questionDiv;
    }

    filterReviewQuestions(filter) {
        this.displayReviewQuestions(filter);
    }

    retakeTest() {
        this.userAnswers = {};
        this.markedQuestions = new Set();
        this.currentQuestionIndex = 0;
        this.currentSection = 'RW';
        this.sectionTimes = {};
        this.results = null;
        
        this.showScreen('welcome-screen');
    }

    printResults() {
        window.print();
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    handleKeyboardShortcuts(e) {
        if (this.currentScreen !== 'test') return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                if (!document.getElementById('prev-btn').disabled) {
                    this.navigateQuestion(-1);
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.navigateQuestion(1);
                break;
            case 'a':
            case 'A':
                e.preventDefault();
                this.selectAnswer(0);
                break;
            case 'b':
            case 'B':
                e.preventDefault();
                this.selectAnswer(1);
                break;
            case 'c':
            case 'C':
                e.preventDefault();
                this.selectAnswer(2);
                break;
            case 'd':
            case 'D':
                e.preventDefault();
                this.selectAnswer(3);
                break;
            case 'm':
            case 'M':
                e.preventDefault();
                this.toggleMarkForReview();
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                this.showQuestionPalette();
                break;
            case 'Escape':
                e.preventDefault();
                this.hideQuestionPalette();
                break;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.satTest = new SATTest();
});

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle?.querySelector('i');
    if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    localStorage.setItem('theme', newTheme);
};

window.toggleUserMenu = function() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.toggle('show');
    }
};
