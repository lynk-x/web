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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export { app };

