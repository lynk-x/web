import { initializeApp } from 'firebase/app';

/**
 * Firebase project ID dynamically derived from NEXT_PUBLIC_FIREBASE_PROJECT_ID,
 * inferred from NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN (e.g. 'project-id.firebaseapp.com'),
 * or defaulted to 'lynk-x-firebase'.
 */
const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.split('.')[0]
    : 'lynk-x-firebase');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDju1jIcIjZMvW31gxMlaMkYVxxrhftQFY',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'lynk-x-firebase.firebaseapp.com',
  projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'lynk-x-firebase.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '632799565510',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:632799565510:web:78327f319b4f3be791e9c7',
};

const app = initializeApp(firebaseConfig);

export { app };

