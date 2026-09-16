import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase config — from console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyBmSPdbgBM__8KpB3M9K3h10EVHjDhkZ5U",
  authDomain: "englishspeech-2ce95.firebaseapp.com",
  projectId: "englishspeech-2ce95",
  storageBucket: "englishspeech-2ce95.firebasestorage.app",
  messagingSenderId: "457257916568",
  appId: "1:457257916568:web:d1f5a936d4b7b9f19718ed",
}

// Initialize Firebase — order matters: app first, then auth and db
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { app, auth, db }
