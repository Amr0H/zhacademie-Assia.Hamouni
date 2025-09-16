document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth.js loaded');
    
    window.addEventListener('error', function(e) {
        console.error('Global error caught:', e.error);
        if (typeof showError === 'function') {
            showError('An unexpected error occurred. Please refresh the page and try again.');
        } else {
            alert('An unexpected error occurred. Please refresh the page and try again.');
        }
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
        if (typeof showError === 'function') {
            showError('An unexpected error occurred. Please refresh the page and try again.');
        } else {
            alert('An unexpected error occurred. Please refresh the page and try again.');
        }
    });
    
    function showError(message) {
        console.log('showError called:', message);
        try {
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
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 4000);
        } catch (notificationError) {
            console.error('Error showing notification:', notificationError);
            alert(message);
        }
    }

    function showSuccess(message) {
        console.log('showSuccess called:', message);
        try {
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
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 4000);
        } catch (notificationError) {
            console.error('Error showing notification:', notificationError);
            alert(message);
        }
    }
    
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded');
        showError('Application failed to load. Please refresh the page and try again.');
        return;
    }
    
    console.log('Firebase loaded, checking auth and db...');
    
    if (!window.auth || !window.db) {
        console.error('Auth or DB not initialized:', { auth: window.auth, db: window.db });
        setTimeout(() => {
            if (!window.auth || !window.db) {
                console.error('Auth or DB still not ready after 3 seconds');
                showError('Application services not ready. Please refresh the page and try again.');
            }
        }, 3000);
        return;
    }
    
    console.log('Auth and DB ready');
    
    const switchButtons = document.querySelectorAll('.switch-btn');
    const authForms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loadingModal = document.getElementById('loadingModal');

    function showLoading() {
        if (loadingModal) {
            loadingModal.classList.add('show');
        }
    }

    function hideLoading() {
        if (loadingModal) {
            loadingModal.classList.remove('show');
        }
    }
    
    function withTimeout(promise, timeoutMs = 15000) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
            )
        ]);
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
            'auth/web-storage-unsupported': 'Your browser does not support local storage. Please enable cookies and try again.',
            'auth/cors-unsupported': 'Your browser security settings are blocking the request. Please try a different browser or disable ad blockers.',
            'auth/invalid-cordova-configuration': 'Invalid mobile app configuration. Please contact support.',
            'auth/app-deleted': 'The authentication service is temporarily unavailable. Please try again later.',
            'permission-denied': 'You do not have permission to perform this action.',
            'unavailable': 'The service is temporarily unavailable. Please try again later.',
            'unauthenticated': 'Please sign in to access this feature.',
            'deadline-exceeded': 'The request took too long to complete. Please try again.'
        };
        
        if (errorCode && errorMessages[errorCode]) {
            return errorMessages[errorCode];
        }
        
        if (!errorCode) {
            return 'An unexpected error occurred. Please refresh the page and try again.';
        }
        
        return `Error (${errorCode}): An unexpected error occurred. Please try again or contact support if the problem persists.`;
    }

    if (!switchButtons.length || !loginForm || !signupForm) {
        console.error('Required DOM elements not found');
        showError('Page not loaded properly. Please refresh and try again.');
        return;
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
        console.log('Login form submitted');
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        console.log('Email:', email);
        
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
            console.log('Setting persistence...');
            await window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            
            console.log('Checking user requests...');
            const requestQuery = await withTimeout(window.db.collection('userRequests').where('email', '==', email).get());
            
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
            
            console.log('Attempting login...');
            const userCredential = await withTimeout(window.auth.signInWithEmailAndPassword(email, password));
            const user = userCredential.user;
            
            console.log('Login successful:', user.uid);
            showSuccess('Welcome back to UniTrack!');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } catch (error) {
            hideLoading();
            console.error('Login error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            if (error.code === 'auth/user-not-found') {
                try {
                    const requestQuery = await withTimeout(window.db.collection('userRequests').where('email', '==', email).get());
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
            } else if (error.message === 'Operation timed out') {
                showError('Request timed out. Please check your connection and try again.');
            } else if (error.code === 'auth/web-storage-unsupported' || error.code === 'auth/quota-exceeded') {
                showError('Browser storage is full or disabled. Please clear your browser cache and try again.');
            } else if (error.code === 'auth/timeout') {
                showError('Request timed out. Please check your connection and try again.');
            } else if (error.code === 'auth/cors-unsupported') {
                showError('Browser security settings are blocking the request. Please try a different browser.');
            } else {
                const errorMessage = getErrorMessage(error.code);
                showError(errorMessage);
            }
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Signup form submitted');
        
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
            await withTimeout(window.db.collection('userRequests').add({
                name: name,
                email: email,
                password: password,
                status: 'pending',
                requestedAt: firebase.firestore.FieldValue.serverTimestamp()
            }));
            
            hideLoading();
            showSuccess('Account request submitted! Please wait for admin approval.');
            
            setTimeout(() => {
                signupForm.reset();
                switchButtons[0].click();
            }, 2000);
        } catch (error) {
            hideLoading();
            console.error('Signup error:', error);
            if (error.message === 'Operation timed out') {
                showError('Request timed out. Please check your connection and try again.');
            } else {
                showError('Error submitting request. Please try again.');
            }
        }
    });

    window.auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? user.uid : 'no user');
        if (user && window.location.pathname.includes('index.html')) {
            window.location.href = 'dashboard.html';
        }
    });

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
    
    console.log('Auth.js initialization complete');
});
