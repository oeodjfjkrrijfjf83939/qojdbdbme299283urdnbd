import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCfbaLbcx8D7QguQONhL6iDiaAvgQbGhVA",
    projectId: "multilynk-qr",
    appId: "1:329033716655:web:adb0399032ae48e230955a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Silently sign in anonymously on initialization to authenticate database queries
signInAnonymously(auth).catch(err => {
    console.error("⚠️ Firebase Anonymous Authentication failed:", err);
});

export { db, auth };
