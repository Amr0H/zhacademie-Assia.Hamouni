document.addEventListener('DOMContentLoaded', async function() {
    let currentUser = null;
    let requests = [];
    let currentFilter = 'pending';
    let confirmAction = null;
    let confirmRequestId = null;


    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await checkAdminAccess();
            await loadRequests();
            setupEventListeners();
        } else {
            window.location.href = 'index.html';
        }
    });

    async function checkAdminAccess() {
        try {
            const adminEmails = ['admin@unitrack.com', 'assia@gmail.com', 'admin@example.com'];
            if (!adminEmails.includes(currentUser.email)) {
                alert('Access denied. Admin privileges required.');
                await auth.signOut();
                window.location.href = 'index.html';
                return;
            }
        } catch (error) {
            console.error('Error checking admin access:', error);
            window.location.href = 'index.html';
        }
    }

    async function loadRequests() {
        try {
            const requestsSnapshot = await db.collection('userRequests').orderBy('requestedAt', 'desc').get();
            requests = requestsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                requestedAt: doc.data().requestedAt?.toDate() || new Date()
            }));

            updateStats();
            renderRequests();
        } catch (error) {
            console.error('Error loading requests:', error);
            showNotification('Error loading requests', 'error');
        }
    }

    function updateStats() {
        const pending = requests.filter(r => r.status === 'pending').length;
        const approved = requests.filter(r => r.status === 'approved').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;

        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('approvedCount').textContent = approved;
        document.getElementById('rejectedCount').textContent = rejected;
    }

    function renderRequests() {
        const requestsList = document.getElementById('requestsList');
        const filteredRequests = currentFilter === 'all' 
            ? requests 
            : requests.filter(r => r.status === currentFilter);

        if (filteredRequests.length === 0) {
            requestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No ${currentFilter} requests</h3>
                    <p>There are no ${currentFilter === 'all' ? '' : currentFilter} requests at the moment.</p>
                </div>
            `;
            return;
        }

        requestsList.innerHTML = filteredRequests.map(request => `
            <div class="request-item">
                <div class="request-info">
                    <div class="request-name">${request.name}</div>
                    <div class="request-email">${request.email}</div>
                    <div class="request-date">Requested: ${formatDate(request.requestedAt)}</div>
                </div>
                <div class="request-status">
                    <span class="status-badge ${request.status}">${request.status}</span>
                </div>
                <div class="request-actions">
                    ${request.status === 'pending' ? `
                        <button class="action-btn approve" onclick="showConfirmModal('approve', '${request.id}', '${request.name}')">
                            <i class="fas fa-check"></i>
                            Approve
                        </button>
                        <button class="action-btn reject" onclick="showConfirmModal('reject', '${request.id}', '${request.name}')">
                            <i class="fas fa-times"></i>
                            Reject
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    window.showConfirmModal = function(action, requestId, userName) {
        confirmAction = action;
        confirmRequestId = requestId;
        
        const modal = document.getElementById('confirmModal');
        const title = document.getElementById('confirmTitle');
        const message = document.getElementById('confirmMessage');
        const confirmBtn = document.getElementById('confirmActionBtn');
        
        title.textContent = action === 'approve' ? 'Approve User' : 'Reject User';
        message.textContent = `Are you sure you want to ${action} the request from ${userName}?`;
        confirmBtn.textContent = action === 'approve' ? 'Approve' : 'Reject';
        confirmBtn.className = `btn ${action === 'approve' ? 'btn-primary' : 'btn-danger'}`;
        
        modal.classList.add('active');
    };

    async function processRequest(action, requestId) {
        try {
            const request = requests.find(r => r.id === requestId);
            if (!request) return;

            if (action === 'approve') {
                try {
                    const userCredential = await auth.createUserWithEmailAndPassword(request.email, request.password);
                    const user = userCredential.user;

                    await user.updateProfile({
                        displayName: request.name
                    });

                    await db.collection('users').doc(user.uid).set({
                        name: request.name,
                        email: request.email,
                        status: 'approved',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        universities: [],
                        scores: {
                            sat: null,
                            duolingo: null
                        },
                        preferences: {
                            theme: 'light',
                            notifications: true
                        }
                    });

                    await auth.signOut();
                    
                    try {
                        await auth.signInWithEmailAndPassword('admin@unitrack.com', 'your-admin-password');
                        currentUser = auth.currentUser;
                    } catch (reAuthError) {
                        console.error('Admin re-authentication failed:', reAuthError);
                        showNotification('User approved but admin re-authentication failed. Please refresh the page.', 'error');
                        setTimeout(() => {
                            window.location.reload();
                        }, 3000);
                        return;
                    }
                } catch (createUserError) {
                    if (createUserError.code === 'auth/email-already-in-use') {
                        showNotification('User account already exists. Marking request as approved.', 'success');
                    } else {
                        throw createUserError;
                    }
                }
            }

            await db.collection('userRequests').doc(requestId).update({
                status: action === 'approve' ? 'approved' : 'rejected',
                processedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const requestIndex = requests.findIndex(r => r.id === requestId);
            if (requestIndex !== -1) {
                requests[requestIndex].status = action === 'approve' ? 'approved' : 'rejected';
            }

            updateStats();
            renderRequests();
            showNotification(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');

        } catch (error) {
            console.error(`Error ${action}ing user:`, error);
            showNotification(`Error ${action}ing user: ${error.message}`, 'error');
        }
    }

    function setupEventListeners() {
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            currentFilter = e.target.value;
            renderRequests();
        });

        document.getElementById('refreshBtn').addEventListener('click', loadRequests);

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await auth.signOut();
            window.location.href = 'index.html';
        });

        document.getElementById('confirmActionBtn').addEventListener('click', async () => {
            if (confirmAction && confirmRequestId) {
                document.getElementById('confirmModal').classList.remove('active');
                await processRequest(confirmAction, confirmRequestId);
                confirmAction = null;
                confirmRequestId = null;
            }
        });

        document.getElementById('cancelConfirmBtn').addEventListener('click', () => {
            document.getElementById('confirmModal').classList.remove('active');
            confirmAction = null;
            confirmRequestId = null;
        });

        document.getElementById('closeConfirmModal').addEventListener('click', () => {
            document.getElementById('confirmModal').classList.remove('active');
            confirmAction = null;
            confirmRequestId = null;
        });
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
});
