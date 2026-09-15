import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase config — from console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyAyJfR5qrL-MsZH2qo9zKdLhrdBt6wab7o",
  authDomain: "englishguru-83dcd.firebaseapp.com",
  projectId: "englishguru-83dcd",
  storageBucket: "englishguru-83dcd.firebasestorage.app",
  messagingSenderId: "896970802312",
  appId: "1:896970802312:web:cee25364bb6f4d4d9f4b3d"
}

// Initialize Firebase — order matters: app first, then auth and db
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { app, auth, db }
