// ============================================================
// אשדוד-שליח – Firebase Admin Initialization
// ============================================================

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import logger from '../utils/logger';

let firebaseApp: admin.app.App;

export function initializeFirebase(): admin.app.App {
  if (admin.apps.length > 0) {
    firebaseApp = admin.apps[0] as admin.app.App;
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn(
      'Firebase credentials not fully set – using application default credentials (emulator/GCP).'
    );
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket,
    });
  } else {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
  }

  logger.info(`Firebase Admin initialized for project: ${projectId ?? 'default'}`);
  return firebaseApp;
}

export function getFirebaseApp(): admin.app.App {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
}

export function getDb(): FirebaseFirestore.Firestore {
  return getFirestore(getFirebaseApp());
}

export function getMessagingInstance(): admin.messaging.Messaging {
  return getMessaging(getFirebaseApp());
}

export function getAuthInstance(): admin.auth.Auth {
  return getAuth(getFirebaseApp());
}

export default { initializeFirebase, getFirebaseApp, getDb, getMessagingInstance, getAuthInstance };
