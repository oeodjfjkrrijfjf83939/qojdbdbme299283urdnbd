// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCfbaLbcx8D7QguQONhL6iDiaAvgQbGhVA",
    authDomain: "multilynk-qr.firebaseapp.com",
    projectId: "multilynk-qr",
    storageBucket: "multilynk-qr.firebasestorage.app",
    appId: "1:329033716655:web:adb0399032ae48e230955a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
