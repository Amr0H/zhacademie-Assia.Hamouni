    const firebaseConfig = {
        apiKey: "AIzaSyB8lUl9EO7g6ipcOdl6XSNTwB-jtDF-e6I",
        authDomain: "maintenance-calendar-danialand.firebaseapp.com",
        projectId: "maintenance-calendar-danialand",
        storageBucket: "maintenance-calendar-danialand.firebasestorage.app",
        messagingSenderId: "354887807560",
        appId: "1:354887807560:web:45845627f5acd35dc79e7d"
    };
    
    let auth, db, storage;

    try {
        firebase.initializeApp(firebaseConfig);
        
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
        
        // Mobile-friendly persistence configuration
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // For mobile devices, use simpler persistence without tab synchronization
            db.enablePersistence().catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Persistence failed: Multiple tabs open or unsupported browser.');
                } else if (err.code == 'unimplemented') {
                    console.warn('Persistence not supported on this mobile browser.');
                }
            });
        } else {
            // For desktop, use full persistence with tab sync
            db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code == 'unimplemented') {
                    console.warn('The current browser does not support persistence.');
                }
            });
        }

        // Mobile-friendly auth persistence
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
            console.warn('Auth persistence setup failed:', error);
            // Try alternative persistence for mobile
            if (isMobile) {
                auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch((fallbackError) => {
                    console.warn('Session persistence also failed:', fallbackError);
                });
            }
        });
        
        console.log('Firebase initialized successfully');
        
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        if (typeof showError === 'function') {
            showError('Failed to initialize application. Please refresh the page and try again.');
        } else {
            alert('Failed to initialize application. Please refresh the page and try again.');
        }
    }

    const CLOUDINARY_CONFIG = {
        cloudName: 'ddcsyjvcr',
        apiKey: '736476972558189',
        apiSecret: 'hH5nJ5A3y7sfPojkk4VBGYQT3Kg'
    };

    window.firebaseApp = firebase;
    window.auth = auth;
    window.db = db;
    window.storage = storage;
    window.cloudinaryConfig = CLOUDINARY_CONFIG;