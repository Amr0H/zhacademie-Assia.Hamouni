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
    
    // Enhanced mobile compatibility for Firestore persistence
    db.enablePersistence({ 
        synchronizeTabs: true,
        experimentalForceOwningTab: true 
    }).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.warn('The current browser does not support persistence.');
        } else {
            console.warn('Firestore persistence error:', err);
        }
    });
    
    // Enhanced authentication persistence for mobile devices
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
        console.warn('Auth persistence setup failed:', error);
    });
    
    console.log('Firebase initialized successfully');
    
} catch (error) {
    console.error('Firebase initialization failed:', error);
    
    // Enhanced error messaging for mobile users
    const errorMessage = error.code === 'auth/network-request-failed' 
        ? 'Network connection error. Please check your internet connection and refresh the page.'
        : 'Failed to initialize application. Please refresh the page and try again.';
        
    if (typeof showError === 'function') {
        showError(errorMessage);
    } else {
        alert(errorMessage);
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

// Signal that Firebase is ready immediately since this script loads synchronously
window.firebaseReady = true;

// Dispatch event after DOM is ready to ensure listeners are attached
function notifyFirebaseReady() {
    console.log('Dispatching Firebase ready event...');
    window.dispatchEvent(new CustomEvent('firebaseInitialized', {
        detail: { auth, db, storage }
    }));
}

// Fire immediately if DOM is already loaded, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notifyFirebaseReady);
} else {
    // DOM is already ready, fire immediately
    setTimeout(notifyFirebaseReady, 100);
}
