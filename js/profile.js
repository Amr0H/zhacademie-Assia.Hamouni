document.addEventListener('DOMContentLoaded', async function() {
    await initializeAuth();
    setupCommonEventListeners();

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

    let currentUser = null;
    let userData = null;
    let settings = {};

    const elements = {
        profileForm: document.getElementById('profileForm'),
        changePasswordForm: document.getElementById('changePasswordForm'),
        changePasswordModal: document.getElementById('changePasswordModal'),
        profileAvatar: document.getElementById('profileAvatar'),
        profileName: document.getElementById('profileName'),
        profileEmail: document.getElementById('profileEmail'),
        accountType: document.getElementById('accountType'),
        changeAvatarBtn: document.getElementById('changeAvatarBtn'),
        changePasswordBtn: document.getElementById('changePasswordBtn'),
        closePasswordModal: document.getElementById('closePasswordModal'),
        cancelPasswordBtn: document.getElementById('cancelPasswordBtn'),
        cancelProfileBtn: document.getElementById('cancelProfileBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        exportDataBtn: document.getElementById('exportDataBtn'),
        passwordStrength: document.getElementById('passwordStrength'),
        notification: document.getElementById('notification')
    };

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            await loadSettings();
            updateUI();
            setupEventListeners();
        } else {
            window.location.href = 'index.html';
        }
    });

    async function loadUserData() {
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                userData = userDoc.data();
            } else {
                userData = {
                    name: currentUser.displayName || '',
                    email: currentUser.email || '',
                    createdAt: new Date()
                };
            }
            
            populateProfileForm();
            updateUserDisplay();
        } catch (error) {
            console.error('Error loading user data:', error);
            showNotification('Error loading profile data', 'error');
        }
    }

    async function loadSettings() {
        try {
            const settingsDoc = await db.collection('users').doc(currentUser.uid).collection('settings').doc('preferences').get();
            if (settingsDoc.exists) {
                settings = settingsDoc.data();
            } else {
                settings = {
                    emailNotifications: true,
                    deadlineReminders: true,
                    progressUpdates: true,
                    profileVisibility: 'private',
                    theme: 'light',
                    language: 'en',
                    dateFormat: 'MM/DD/YYYY'
                };
            }
            
            populateSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    function populateProfileForm() {
        const nameParts = (userData.name || '').split(' ');
        document.getElementById('firstName').value = nameParts[0] || '';
        document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';
        document.getElementById('email').value = userData.email || currentUser.email || '';
        document.getElementById('phone').value = userData.phone || '';
        document.getElementById('dateOfBirth').value = userData.dateOfBirth ? formatDateForInput(userData.dateOfBirth.toDate ? userData.dateOfBirth.toDate() : new Date(userData.dateOfBirth)) : '';
        document.getElementById('bio').value = userData.bio || '';
    }

    function populateSettings() {
        const emailNotifications = document.getElementById('emailNotifications');
        if (emailNotifications) emailNotifications.checked = settings.emailNotifications !== false;
        
        const deadlineReminders = document.getElementById('deadlineReminders');
        if (deadlineReminders) deadlineReminders.checked = settings.deadlineReminders !== false;
        
        const progressUpdates = document.getElementById('progressUpdates');
        if (progressUpdates) progressUpdates.checked = settings.progressUpdates !== false;
        
        const profileVisibility = document.getElementById('profileVisibility');
        if (profileVisibility) profileVisibility.value = settings.profileVisibility || 'private';
        
        const themePreference = document.getElementById('themePreference');
        if (themePreference) themePreference.value = settings.theme || 'light';
        
        const language = document.getElementById('language');
        if (language) language.value = settings.language || 'en';
        
        const dateFormat = document.getElementById('dateFormat');
        if (dateFormat) dateFormat.value = settings.dateFormat || 'MM/DD/YYYY';
    }

    function updateUserDisplay() {
        const userName = userData?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
        const userEmail = userData?.email || currentUser?.email || '';
        
        if (elements.profileName) elements.profileName.textContent = userName;
        if (elements.profileEmail) elements.profileEmail.textContent = userEmail;
        
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = userName;
        
        let avatarUrl = userData?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`;
        
        if (elements.profileAvatar) elements.profileAvatar.src = avatarUrl;
        const userAvatarEl = document.getElementById('userAvatar');
        if (userAvatarEl) userAvatarEl.src = avatarUrl;

        const accountTypeText = userData?.isPremium ? 'Premium Account' : 'Standard Account';
        if (elements.accountType) {
            elements.accountType.textContent = accountTypeText;
            elements.accountType.className = userData?.isPremium ? 'account-type premium' : 'account-type';
        }
    }

    function setupEventListeners() {
        // Add null checks for all event listener assignments
        if (elements.profileForm) {
            elements.profileForm.addEventListener('submit', handleProfileSubmit);
        }
        
        if (elements.changePasswordForm) {
            elements.changePasswordForm.addEventListener('submit', handlePasswordChange);
        }
        
        if (elements.changeAvatarBtn) {
            elements.changeAvatarBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.addEventListener('change', handleAvatarChange);
                input.click();
            });
        }
        
        if (elements.changePasswordBtn) {
            elements.changePasswordBtn.addEventListener('click', () => {
                if (elements.changePasswordModal) {
                    elements.changePasswordModal.classList.add('active');
                }
            });
        }

        if (elements.closePasswordModal) {
            elements.closePasswordModal.addEventListener('click', () => {
                if (elements.changePasswordModal) {
                    elements.changePasswordModal.classList.remove('active');
                }
            });
        }

        if (elements.cancelPasswordBtn) {
            elements.cancelPasswordBtn.addEventListener('click', () => {
                if (elements.changePasswordModal) {
                    elements.changePasswordModal.classList.remove('active');
                }
            });
        }

        if (elements.cancelProfileBtn) {
            elements.cancelProfileBtn.addEventListener('click', () => {
                populateProfileForm();
            });
        }

        if (elements.saveSettingsBtn) {
            elements.saveSettingsBtn.addEventListener('click', handleSettingsSave);
        }

        if (elements.exportDataBtn) {
            elements.exportDataBtn.addEventListener('click', handleDataExport);
        }

        const newPasswordInput = document.getElementById('newPassword');
        if (newPasswordInput && elements.passwordStrength) {
            newPasswordInput.addEventListener('input', checkPasswordStrength);
        }

        if (elements.changePasswordModal) {
            document.addEventListener('click', (e) => {
                if (e.target === elements.changePasswordModal) {
                    elements.changePasswordModal.classList.remove('active');
                }
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await auth.signOut();
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Error signing out:', error);
                    showNotification('Error signing out', 'error');
                }
            });
        }

        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        } else {
            console.warn('User menu button or dropdown not found', { userMenuBtn, userDropdown });
        }
    }

    async function handleProfileSubmit(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const dateOfBirth = document.getElementById('dateOfBirth').value;
        const bio = document.getElementById('bio').value.trim();

        if (!firstName) {
            showNotification('First name is required', 'error');
            return;
        }

        try {
            const updateData = {
                name: `${firstName} ${lastName}`.trim(),
                phone: phone,
                bio: bio,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (dateOfBirth) {
                updateData.dateOfBirth = firebase.firestore.Timestamp.fromDate(new Date(dateOfBirth));
            }

            await db.collection('users').doc(currentUser.uid).set(updateData, { merge: true });
            
            userData = { ...userData, ...updateData };
            updateUserDisplay();
            
            showNotification('Profile updated successfully', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('Error updating profile', 'error');
        }
    }

    async function handleAvatarChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showNotification('Image size must be less than 10MB', 'error');
            return;
        }

        try {
            showNotification('Uploading avatar...', 'info');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'portfolio_uploads');
            formData.append('folder', `users/${currentUser.uid}/avatar`);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${window.cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            const avatarUrl = result.secure_url;

            await db.collection('users').doc(currentUser.uid).set({
                avatarUrl: avatarUrl,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            userData = userData || {};
            userData.avatarUrl = avatarUrl;

            if (elements.profileAvatar) elements.profileAvatar.src = avatarUrl;
            
            const userAvatarEl = document.getElementById('userAvatar');
            if (userAvatarEl) userAvatarEl.src = avatarUrl;

            showNotification('Avatar updated successfully', 'success');
        } catch (error) {
            console.error('Avatar upload error:', error);
            showNotification('Error uploading avatar: ' + error.message, 'error');
        }
    }

    async function handlePasswordChange(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
            await currentUser.reauthenticateWithCredential(credential);
            await currentUser.updatePassword(newPassword);
            
            if (elements.changePasswordModal) {
                elements.changePasswordModal.classList.remove('active');
            }
            
            if (elements.changePasswordForm) {
                elements.changePasswordForm.reset();
            }
            
            if (elements.passwordStrength) {
                elements.passwordStrength.className = 'password-strength';
            }
            
            showNotification('Password updated successfully', 'success');
        } catch (error) {
            console.error('Error updating password:', error);
            if (error.code === 'auth/wrong-password') {
                showNotification('Current password is incorrect', 'error');
            } else {
                showNotification('Error updating password', 'error');
            }
        }
    }

    async function handleSettingsSave() {
        try {
            const newSettings = {
                emailNotifications: document.getElementById('emailNotifications').checked,
                deadlineReminders: document.getElementById('deadlineReminders').checked,
                progressUpdates: document.getElementById('progressUpdates').checked,
                profileVisibility: document.getElementById('profileVisibility').value,
                theme: document.getElementById('themePreference').value,
                language: document.getElementById('language').value,
                dateFormat: document.getElementById('dateFormat').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(currentUser.uid).collection('settings').doc('preferences').set(newSettings, { merge: true });
            
            settings = { ...settings, ...newSettings };
            
            applyThemePreference(newSettings.theme);
            
            showNotification('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showNotification('Error saving settings', 'error');
        }
    }

    async function handleDataExport() {
        try {
            showNotification('Preparing data export...', 'info');

            const userDataDoc = await db.collection('users').doc(currentUser.uid).get();
            const universitiesSnapshot = await db.collection('users').doc(currentUser.uid).collection('universities').get();
            const tasksSnapshot = await db.collection('users').doc(currentUser.uid).collection('tasks').get();
            const scoresSnapshot = await db.collection('users').doc(currentUser.uid).collection('scores').get();
            const portfolioSnapshot = await db.collection('users').doc(currentUser.uid).collection('portfolio').get();

            const exportData = {
                profile: userDataDoc.exists ? userDataDoc.data() : {},
                universities: universitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                tasks: tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                scores: scoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                portfolio: portfolioSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `unitrack-data-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            showNotification('Data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            showNotification('Error exporting data', 'error');
        }
    }

    function checkPasswordStrength(e) {
        const password = e.target.value;
        const strengthIndicator = elements.passwordStrength;
        
        if (!password || !strengthIndicator) {
            return;
        }

        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        const classes = ['weak', 'fair', 'good', 'strong'];
        const className = classes[Math.min(strength - 1, 3)];
        strengthIndicator.className = `password-strength ${className}`;
    }

    function updateUI() {
        document.body.style.opacity = '1';
    }

    function showNotification(message, type = 'info') {
        if (!elements.notification) return;
        
        const notification = elements.notification;
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    function formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }
});