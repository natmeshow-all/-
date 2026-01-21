// Firebase configuration and initialization
// Make sure to set up your .env file with your Firebase credentials

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Required environment variables
const requiredEnvVars = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Validate required environment variables
const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value || value.trim() === "")
    .map(([key]) => key);

if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(", ")}\n` +
        `Please check your .env file or copy .env.example to .env and fill in the values.\n` +
        `See README.md for setup instructions.`;
    
    if (typeof window === "undefined") {
        // Server-side: throw error
        throw new Error(errorMessage);
    } else {
        // Client-side: log error and show user-friendly message
        console.error(errorMessage);
        console.error("Firebase configuration is incomplete. Please contact the administrator.");
    }
}

const firebaseConfig = {
    apiKey: requiredEnvVars.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: requiredEnvVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: requiredEnvVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_APP_ID!,
    databaseURL: requiredEnvVars.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
};

import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

// Initialize Firebase (prevent re-initialization in development)
let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;
let googleProvider: GoogleAuthProvider;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

db = getFirestore(app);
storage = getStorage(app);
auth = getAuth(app);
const database = getDatabase(app);
googleProvider = new GoogleAuthProvider();

export { app, db, storage, auth, googleProvider, database };
