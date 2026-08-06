import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

export const firebaseReady = Boolean(firebaseConfig && firebaseConfig.apiKey);
export let auth = null;
export let db = null;
if (firebaseReady) { const app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); }
export { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, getDocs, query, where, serverTimestamp };
