import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCfbaLbcx8D7QguQONhL6iDiaAvgQbGhVA",
    authDomain: "multilynk-qr.firebaseapp.com",
    projectId: "multilynk-qr",
    storageBucket: "multilynk-qr.firebasestorage.app",
    appId: "1:329033716655:web:adb0399032ae48e230955a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Helper for secondary auth (used to create credentials without signing out current admin)
let secondaryAuthInstance = null;
function getSecondaryAuth() {
    if (!secondaryAuthInstance) {
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        secondaryAuthInstance = getAuth(secondaryApp);
    }
    return secondaryAuthInstance;
}

export { db, auth, getSecondaryAuth };

