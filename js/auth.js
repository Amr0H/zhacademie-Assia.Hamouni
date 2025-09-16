document.addEventListener('DOMContentLoaded', function() {
    const switchButtons = document.querySelectorAll('.switch-btn');
    const authForms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loadingModal = document.getElementById('loadingModal');

    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Enhanced mobile logging
    if (isMobile) {
        console.log('Mobile device detected:', navigator.userAgent);
        
        // Add mobile-specific debugging
        window.mobileDebug = {
            log: function(message, data) {
                console.log(`[MOBILE DEBUG] ${message}`, data || '');
                // Store debug info for later inspection
                if (!window.mobileDebugLog) window.mobileDebugLog = [];
                window.mobileDebugLog.push({
                    timestamp: new Date().toISOString(),
                    message: message,
                    data: data
                });
            }
        };
        
        window.mobileDebug.log('DOM Content Loaded');
    }

    // Add mobile-specific form handling
    function enhanceFormForMobile() {
        if (!isMobile) return;
        
        // Prevent zoom on input focus
        const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]');
        inputs.forEach(input => {
            input.setAttribute('autocomplete', input.type === 'email' ? 'email' : 'current-password');
            input.setAttribute('autocapitalize', 'none');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');
            
            // Add mobile event listeners
            input.addEventListener('touchstart', function() {
                window.mobileDebug?.log('Input touched:', input.id);
            });
        });
        
        // Enhance form submission for mobile
        [loginForm, signupForm].forEach(form => {
            if (form) {
                form.addEventListener('touchend', function(e) {
                    if (e.target.type === 'submit') {
                        e.preventDefault();
                        setTimeout(() => {
                            form.dispatchEvent(new Event('submit'));
                        }, 100);
                    }
                });
            }
        });
    }

    enhanceFormForMobile();

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
        
        window.mobileDebug?.log('Login form submitted');
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        window.mobileDebug?.log('Form data collected', { email: email ? 'provided' : 'empty', password: password ? 'provided' : 'empty' });
        
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
        window.mobileDebug?.log('Starting authentication process');
        
        try {
            // Add mobile-specific timeout
            const authPromise = isMobile ? 
                Promise.race([
                    performAuthentication(email, password),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('MOBILE_TIMEOUT')), 15000))
                ]) :
                performAuthentication(email, password);
                
            await authPromise;
            
        } catch (error) {
            hideLoading();
            window.mobileDebug?.log('Authentication error', { code: error.code, message: error.message });
            handleAuthError(error, email);
        }
    });

    // Separate authentication function for better error handling
    async function performAuthentication(email, password) {
        window.mobileDebug?.log('Checking user requests');
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
        
        window.mobileDebug?.log('Attempting Firebase authentication');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        window.mobileDebug?.log('Authentication successful', { uid: user.uid });
        showSuccess('Welcome back to UniTrack!');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }

    // Enhanced error handling function
    function handleAuthError(error, email) {
        console.error('Login error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.message === 'MOBILE_TIMEOUT') {
            showError('Login timeout. Please check your internet connection and try again.');
            return;
        }
        
        if (error.code === 'auth/user-not-found') {
            handleUserNotFound(email);
        } else if (error.code === 'auth/network-request-failed') {
            showError('Network connection error. Please check your internet connection and try again.');
        } else if (error.code === 'auth/too-many-requests') {
            showError('Too many failed login attempts. Please wait a moment and try again.');
        } else if (error.code === 'auth/operation-not-allowed') {
            showError('Email/password sign-in is not enabled. Please contact support.');
        } else if (error.code === 'auth/app-deleted') {
            showError('Authentication service is unavailable. Please try again later.');
        } else if (error.code === 'auth/invalid-api-key') {
            showError('Authentication configuration error. Please contact support.');
        } else {
            const errorMessage = getErrorMessage(error.code);
            showError(errorMessage);
        }
    }

    // Separate function for user not found handling
    async function handleUserNotFound(email) {
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
        window.mobileDebug?.log('Showing error', message);
        
        const notification = document.createElement('div');
        notification.className = 'notification error';
        
        // Add mobile-specific debugging info for generic errors
        let displayMessage = message;
        if (isMobile && message.includes('unexpected error')) {
            displayMessage = `${message} (Mobile: ${navigator.userAgent.includes('iPhone') ? 'iOS' : navigator.userAgent.includes('Android') ? 'Android' : 'Other'})`;
        }
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${displayMessage}</span>
                ${isMobile ? '<small style="display:block;margin-top:5px;opacity:0.7;">Tap to dismiss</small>' : ''}
            </div>
        `;
        
        // Add tap to dismiss for mobile
        if (isMobile) {
            notification.addEventListener('touchend', function() {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            });
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, isMobile ? 6000 : 4000); // Longer display time on mobile
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
            'auth/network-request-failed': isMobile ? 
                'Network error on mobile. Please check your internet connection, try switching between WiFi and mobile data, then try again.' :
                'Network connection error. Please check your internet connection and try again.',
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
            'auth/timeout': isMobile ? 
                'The operation timed out on mobile. Please check your connection and try again.' :
                'The operation timed out. Please check your connection and try again.',
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
            'unavailable': isMobile ? 
                'Service temporarily unavailable on mobile. Please try again or switch to desktop.' :
                'The service is temporarily unavailable. Please try again later.',
            'unauthenticated': 'Please sign in to access this feature.',
            'deadline-exceeded': isMobile ? 
                'Request timeout on mobile device. Please check your connection and try again.' :
                'The request took too long to complete. Please try again.'
        };
        
        if (errorCode && errorMessages[errorCode]) {
            return errorMessages[errorCode];
        }
        
        if (!errorCode) {
            return isMobile ? 
                'An unexpected error occurred on mobile. Please try refreshing the page, checking your internet connection, or try again later.' :
                'An unexpected error occurred. Please try again.';
        }
        
        return `Error (${errorCode}): ${isMobile ? 'Mobile compatibility issue. Please try refreshing or contact support.' : 'An unexpected error occurred. Please try again or contact support if the problem persists.'}`;
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
            line-height: 1.4;
        }
        
        @media (max-width: 640px) {
            .notification {
                top: 1rem;
                right: 1rem;
                left: 1rem;
                max-width: none;
                transform: translateY(-100px);
                font-size: 14px;
            }
            
            .notification.show {
                transform: translateY(0);
            }
            
            .notification-content span {
                font-size: 0.85rem;
            }
        }
        
        /* Mobile debug panel styles */
        .mobile-debug-panel {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 9999;
            display: none;
        }
        
        .mobile-debug-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 16px;
            cursor: pointer;
            z-index: 10000;
            display: none;
        }
        
        @media (max-width: 640px) {
            .mobile-debug-toggle {
                display: block;
            }
        }
    `;
    document.head.appendChild(style);

    // Add mobile debug panel for troubleshooting
    if (isMobile) {
        const debugButton = document.createElement('button');
        debugButton.className = 'mobile-debug-toggle';
        debugButton.innerHTML = '🔧';
        debugButton.title = 'Toggle Mobile Debug';
        
        const debugPanel = document.createElement('div');
        debugPanel.className = 'mobile-debug-panel';
        
        let debugVisible = false;
        debugButton.addEventListener('click', () => {
            debugVisible = !debugVisible;
            debugPanel.style.display = debugVisible ? 'block' : 'none';
            
            if (debugVisible && window.mobileDebugLog) {
                debugPanel.innerHTML = '<strong>Mobile Debug Log:</strong><br>' + 
                    window.mobileDebugLog.slice(-10).map(entry => 
                        `${entry.timestamp.split('T')[1].split('.')[0]}: ${entry.message} ${entry.data || ''}`
                    ).join('<br>');
            }
        });
        
        document.body.appendChild(debugButton);
        document.body.appendChild(debugPanel);
        
        // Log device info
        window.mobileDebug?.log('Device Info', {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            online: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled
        });
    }
});
