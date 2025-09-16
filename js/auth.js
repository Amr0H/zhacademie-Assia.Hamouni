document.addEventListener('DOMContentLoaded', function() {
    // Simple initialization - Firebase should be ready by now
    const switchButtons = document.querySelectorAll('.switch-btn');
    const authForms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loadingModal = document.getElementById('loadingModal');

    // Hide Firebase loading modal immediately
    const firebaseLoader = document.getElementById('firebaseLoadingModal');
    if (firebaseLoader) {
        firebaseLoader.classList.remove('show');
    }

    // Mobile-specific initialization
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let retryCount = 0;
    const maxRetries = 3;

    // Enhanced mobile debugging
    if (isMobile) {
        console.log('Mobile device detected:', navigator.userAgent);
        console.log('Firebase available:', typeof firebase !== 'undefined');
        console.log('Auth available:', typeof auth !== 'undefined');
        console.log('DB available:', typeof db !== 'undefined');
        
        // Add global error handler for mobile
        window.addEventListener('error', function(e) {
            console.error('Global error on mobile:', e.error, e.message, e.filename, e.lineno);
        });
        
        window.addEventListener('unhandledrejection', function(e) {
            console.error('Unhandled promise rejection on mobile:', e.reason);
        });
    }

    // Enhanced mobile compatibility check
    function checkMobileCompatibility() {
        // Check for required features
        if (!window.indexedDB) {
            showError('Your browser does not support required features. Please update your browser.');
            return false;
        }
        
        // Check for localStorage
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
        } catch (e) {
            showError('Browser storage is disabled. Please enable cookies and local storage.');
            return false;
        }
        
        return true;
    }

    // Initialize mobile compatibility check
    if (!checkMobileCompatibility()) {
        return;
    }

    // Mobile keyboard handling
    if (isMobile) {
        const authContainer = document.querySelector('.auth-container');
        let isKeyboardVisible = false;
        
        // Handle virtual keyboard on mobile
        function handleViewportChange() {
            const currentHeight = window.innerHeight;
            const screenHeight = window.screen.height;
            
            if (currentHeight < screenHeight * 0.75) {
                if (!isKeyboardVisible) {
                    isKeyboardVisible = true;
                    authContainer.classList.add('keyboard-visible');
                }
            } else {
                if (isKeyboardVisible) {
                    isKeyboardVisible = false;
                    authContainer.classList.remove('keyboard-visible');
                }
            }
        }
        
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleViewportChange, 500);
        });
        
        // Prevent zoom on input focus (iOS)
        const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                if (input.style.fontSize !== '16px') {
                    input.style.fontSize = '16px';
                }
            });
        });
    }

    switchButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const formType = btn.dataset.form;
            
            switchButtons.forEach(b => b.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(formType + 'Form').classList.add('active');
        });
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLoginWithRetry();
    });

    // Enhanced login function with mobile retry mechanism
    async function handleLoginWithRetry(retryAttempt = 0) {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!email) {
            showError('Please enter your email address.');
            return;
        }
        
        if (!password) {
            showError('Please enter your password.');
            return;
        }
        
        if (!isValidEmail(email)) {
            showError('Please enter a valid email address (example: user@domain.com).');
            return;
        }
        
        showLoading();
        
        try {
            // Wait for Firebase to be fully initialized
            if (typeof firebase === 'undefined' || typeof auth === 'undefined' || typeof db === 'undefined') {
                throw new Error('Firebase services not properly initialized. Please refresh the page.');
            }
            
            // Additional mobile safety check
            if (isMobile) {
                console.log('Starting mobile login process...');
                // Wait a bit for mobile browsers to fully load Firebase
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Set Firebase auth persistence for mobile compatibility
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            
            const requestQuery = await db.collection('userRequests').where('email', '==', email).get();
            
            if (!requestQuery.empty) {
                const requestDoc = requestQuery.docs[0];
                const requestData = requestDoc.data();
                
                if (requestData.status === 'pending') {
                    hideLoading();
                    showError('Your account is pending approval. Please wait for an administrator to approve your request.');
                    return;
                }
                
                if (requestData.status === 'rejected') {
                    hideLoading();
                    showError('Your account request was rejected. Please contact the administrator for more information.');
                    return;
                }
            }
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            showSuccess('Welcome back to UniTrack!');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } catch (error) {
            hideLoading();
            console.error('Login error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            
            // Mobile-specific detailed error logging
            if (isMobile) {
                console.error('Mobile login error details:', {
                    errorCode: error.code,
                    errorMessage: error.message,
                    retryAttempt: retryAttempt,
                    userAgent: navigator.userAgent,
                    online: navigator.onLine,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Check if this is a network-related error and we can retry
            const isNetworkError = error.code === 'auth/network-request-failed' || 
                                   error.code === 'auth/timeout' || 
                                   error.code === 'auth/deadline-exceeded' ||
                                   error.code === 'auth/internal-error' ||
                                   (error.message && (error.message.includes('Failed to fetch') || 
                                                     error.message.includes('Load failed') ||
                                                     error.message.includes('NetworkError') ||
                                                     error.message.includes('fetch')));
            
            if (isNetworkError && retryAttempt < maxRetries && isMobile) {
                console.log(`Network error detected, retrying... (attempt ${retryAttempt + 1}/${maxRetries})`);
                setTimeout(() => {
                    handleLoginWithRetry(retryAttempt + 1);
                }, 2000 * (retryAttempt + 1)); // Exponential backoff
                showError(`Connection failed. Retrying... (${retryAttempt + 1}/${maxRetries})`);
                return;
            }
            
            // Enhanced mobile-specific error handling with more details
            if (error.code === 'auth/user-not-found') {
                try {
                    const requestQuery = await db.collection('userRequests').where('email', '==', email).get();
                    if (!requestQuery.empty) {
                        const requestData = requestQuery.docs[0].data();
                        if (requestData.status === 'pending') {
                            showError('Your account is pending approval. Please wait for an administrator to approve your request.');
                        } else if (requestData.status === 'rejected') {
                            showError('Your account request was rejected. Please contact the administrator for more information.');
                        } else {
                            showError('Please wait for your approved account to be activated.');
                        }
                    } else {
                        showError('No account found with this email. Please sign up first.');
                    }
                } catch (dbError) {
                    console.error('Database error:', dbError);
                    showError('No account found with this email. Please sign up first.');
                }
            } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-login-credentials') {
                showError('Incorrect password. Please check your password and try again.');
            } else if (error.code === 'auth/invalid-email') {
                showError('Please enter a valid email address.');
            } else if (error.code === 'auth/network-request-failed') {
                showError('Network connection error. Please check your internet connection and try again.');
            } else if (error.code === 'auth/too-many-requests') {
                showError('Too many failed login attempts. Please wait a moment and try again.');
            } else if (error.code === 'auth/timeout' || error.code === 'auth/deadline-exceeded') {
                showError('Request timed out. Please check your connection and try again.');
            } else if (error.code === 'auth/app-deleted' || error.code === 'auth/invalid-api-key') {
                showError('Service temporarily unavailable. Please try again in a few minutes.');
            } else if (error.code === 'auth/web-storage-unsupported') {
                showError('Your browser storage is disabled. Please enable cookies and local storage.');
            } else if (error.code === 'auth/unauthorized-domain') {
                showError('Authentication not available on this domain. Please contact support.');
            } else if (error.code === 'auth/internal-error') {
                showError('Internal service error. Please try again in a moment.');
            } else if (error.message && error.message.includes('Failed to fetch')) {
                showError('Connection failed. Please check your internet connection and try again.');
            } else if (error.message && error.message.includes('Load failed')) {
                showError('Failed to load authentication service. Please refresh the page and try again.');
            } else {
                // For mobile debugging, show more specific error information
                const errorMessage = isMobile ? 
                    `Login failed: ${error.code || 'unknown'} - ${error.message || 'No details available'}. Please screenshot this and contact support.` :
                    getErrorMessage(error.code);
                showError(errorMessage);
            }
        }
    }

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!name) {
            showError('Please enter your full name.');
            return;
        }
        
        if (name.length < 2) {
            showError('Please enter a valid name (at least 2 characters).');
            return;
        }
        
        if (!email) {
            showError('Please enter your email address.');
            return;
        }
        
        if (!isValidEmail(email)) {
            showError('Please enter a valid email address (example: user@domain.com).');
            return;
        }
        
        if (!password) {
            showError('Please enter a password.');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
        }
        
        if (!isStrongPassword(password)) {
            showError('Password must contain at least one letter and one number for better security.');
            return;
        }
        
        if (!confirmPassword) {
            showError('Please confirm your password.');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match. Please check and try again.');
            return;
        }
        
        showLoading();
        
        try {
            await db.collection('userRequests').add({
                name: name,
                email: email,
                password: password,
                status: 'pending',
                requestedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            hideLoading();
            showSuccess('Account request submitted! Please wait for admin approval.');
            
            setTimeout(() => {
                signupForm.reset();
                switchButtons[0].click();
            }, 2000);
        } catch (error) {
            hideLoading();
            showError('Error submitting request. Please try again.');
        }
    });

    auth.onAuthStateChanged((user) => {
        if (user && window.location.pathname.includes('index.html')) {
            window.location.href = 'dashboard.html';
        }
    });

    function showLoading() {
        loadingModal.classList.add('show');
    }

    function hideLoading() {
        loadingModal.classList.remove('show');
    }

    function showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }

    function showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }

    function getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No account exists with this email address. Please check your email or create a new account.',
            'auth/wrong-password': 'Incorrect password. Please check your password and try again.',
            'auth/invalid-password': 'The password you entered is invalid. Please try again.',
            'auth/invalid-email': 'Please enter a valid email address (example: user@domain.com).',
            'auth/email-already-in-use': 'An account with this email address already exists. Please sign in instead or use a different email.',
            'auth/weak-password': 'Password must be at least 6 characters long and contain a mix of letters and numbers.',
            'auth/user-disabled': 'This account has been temporarily disabled. Please contact support for assistance.',
            'auth/operation-not-allowed': 'This operation is not allowed. Please contact support if this problem persists.',
            'auth/too-many-requests': 'Too many failed login attempts. Please wait a few minutes before trying again.',
            'auth/network-request-failed': 'Network connection error. Please check your internet connection and try again.',
            'auth/internal-error': 'An internal error occurred. Please try again in a few moments.',
            'auth/invalid-credential': 'The credentials you provided are invalid. Please check your email and password.',
            'auth/invalid-login-credentials': 'Invalid email or password. Please check your credentials and try again.',
            'auth/credential-already-in-use': 'This credential is already associated with a different account.',
            'auth/requires-recent-login': 'For security reasons, please sign out and sign in again before performing this action.',
            'auth/invalid-verification-code': 'The verification code is invalid. Please check and try again.',
            'auth/invalid-verification-id': 'The verification ID is invalid. Please try the verification process again.',
            'auth/missing-verification-code': 'Please enter the verification code.',
            'auth/missing-verification-id': 'Verification ID is missing. Please restart the verification process.',
            'auth/quota-exceeded': 'Too many requests have been made. Please try again later.',
            'auth/unauthorized-domain': 'This domain is not authorized for authentication.',
            'auth/popup-blocked': 'Popup was blocked by your browser. Please allow popups for this site.',
            'auth/popup-closed-by-user': 'Authentication was cancelled. Please try again.',
            'auth/timeout': 'The operation timed out. Please check your connection and try again.',
            'auth/invalid-api-key': 'Authentication service is temporarily unavailable. Please try again later.',
            'auth/app-not-authorized': 'This app is not authorized to use authentication services.',
            'auth/keychain-error': 'A keychain error occurred. Please try signing in again.',
            'auth/missing-app-credential': 'Authentication credentials are missing. Please refresh the page and try again.',
            'auth/invalid-user-token': 'Your session has expired. Please sign in again.',
            'auth/user-token-expired': 'Your session has expired. Please sign in again.',
            'auth/null-user': 'No user is currently signed in. Please sign in to continue.',
            'auth/account-exists-with-different-credential': 'An account already exists with this email but different sign-in method.',
            'auth/missing-email': 'Please enter your email address.',
            'auth/missing-password': 'Please enter your password.',
            'permission-denied': 'You do not have permission to perform this action.',
            'unavailable': 'The service is temporarily unavailable. Please try again later.',
            'unauthenticated': 'Please sign in to access this feature.',
            'deadline-exceeded': 'The request took too long to complete. Please try again.'
        };
        
        if (errorCode && errorMessages[errorCode]) {
            return errorMessages[errorCode];
        }
        
        if (!errorCode) {
            return 'An unexpected error occurred. Please try again.';
        }
        
        return `Error (${errorCode}): An unexpected error occurred. Please try again or contact support if the problem persists.`;
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function isStrongPassword(password) {
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        return hasLetter && hasNumber;
    }

    function validateForm(formData) {
        const errors = [];
        
        if (formData.name !== undefined) {
            if (!formData.name.trim()) {
                errors.push('Name is required');
            } else if (formData.name.trim().length < 2) {
                errors.push('Name must be at least 2 characters long');
            }
        }
        
        if (!formData.email) {
            errors.push('Email is required');
        } else if (!isValidEmail(formData.email)) {
            errors.push('Please enter a valid email address');
        }
        
        if (!formData.password) {
            errors.push('Password is required');
        } else if (formData.password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }
        
        if (formData.confirmPassword !== undefined) {
            if (!formData.confirmPassword) {
                errors.push('Please confirm your password');
            } else if (formData.password !== formData.confirmPassword) {
                errors.push('Passwords do not match');
            }
        }
        
        return errors;
    }

    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: var(--bg-primary);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            border: 1px solid var(--border-color);
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 10000;
            max-width: 400px;
            backdrop-filter: blur(10px);
        }
        
        .notification.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .notification.error {
            border-left: 4px solid var(--danger-color);
        }
        
        .notification.success {
            border-left: 4px solid var(--accent-color);
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        .notification.error .notification-content i {
            color: var(--danger-color);
        }
        
        .notification.success .notification-content i {
            color: var(--accent-color);
        }
        
        .notification-content span {
            color: var(--text-primary);
            font-weight: 500;
            font-size: 0.9rem;
        }
        
        @media (max-width: 640px) {
            .notification {
                top: 1rem;
                right: 1rem;
                left: 1rem;
                max-width: none;
                transform: translateY(-100px);
            }
            
            .notification.show {
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
});
