// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA9wbYtDSQ7Xl2yEq3uQ_cVosbuKN0wfHM",
    authDomain: "myclassroom-a6764.firebaseapp.com",
    projectId: "myclassroom-a6764",
    storageBucket: "myclassroom-a6764.firebasestorage.app",
    messagingSenderId: "1028892148903",
    appId: "1:1028892148903:web:06d75a803b08e836378782",
    measurementId: "G-BRSZH9F99K"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        // Initialize Analytics (optional)
        if (firebase.analytics) {
            firebase.analytics();
        }
        // Initialize Firestore
        if (firebase.firestore) {
            const db = firebase.firestore();
            db.enablePersistence().catch(err => console.warn("Persistence Error:", err.code));
        }
    } catch (e) {
        console.error("Firebase Init Error:", e);
    }
} else {
    console.error("Firebase SDK not loaded!");
}
