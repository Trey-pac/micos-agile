// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDXTytDXonkcj9A3XuzCeV1F4V-Sfa51Ug",
    authDomain: "mico-s-micro-farm-agile.firebaseapp.com",
    databaseURL: "https://mico-s-micro-farm-agile-default-rtdb.firebaseio.com",
    projectId: "mico-s-micro-farm-agile",
    storageBucket: "mico-s-micro-farm-agile.firebasestorage.app",
    messagingSenderId: "899003989851",
    appId: "1:899003989851:web:e47df3198e73640e22647e",
    measurementId: "G-L3WMNTCW9G"
};

// Initialize Firebase (only if config is set)
let database = null;
let useFirebase = false;

if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    try {
        if (!window.firebase.apps.length) {
            window.firebase.initializeApp(firebaseConfig);
        }
        database = window.firebase.database();
        useFirebase = true;
    } catch (error) {
        console.log("Firebase not configured, using local storage");
    }
}

// Firebase Function URLs
export const FUNCTION_BASE = 'https://us-central1-mico-s-micro-farm-agile.cloudfunctions.net';

export { database, useFirebase };
