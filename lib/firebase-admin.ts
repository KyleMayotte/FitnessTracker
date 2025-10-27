import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

let adminAuth: Auth | null = null;

if (projectId && clientEmail && privateKey) {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  adminAuth = getAuth(getApp());
} else {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'Firebase Admin credentials are not fully configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }
}

// Verify Firebase ID token from Authorization header
export async function verifyFirebaseToken(authHeader: string | null) {
  if (!adminAuth) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Skipping Firebase token verification because Admin SDK is not initialized.');
    }
    return null;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
}
