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
        
        db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
            } else if (err.code == 'unimplemented') {
                console.warn('The current browser does not support persistence.');
            }
        });
        

        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
            console.warn('Auth persistence setup failed:', error);
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