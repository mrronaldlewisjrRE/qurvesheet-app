import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBz5tgcvmKQfckmzXT1mIKZc9SFl15SPsw",
  authDomain: "gen-lang-client-0594384308.firebaseapp.com",
  projectId: "gen-lang-client-0594384308",
  storageBucket: "gen-lang-client-0594384308.firebasestorage.app",
  messagingSenderId: "821001810691",
  appId: "1:821001810691:web:710f8046f28fa93c516f36"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication and Google provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
// Set custom parameters if needed
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore on the custom database instance provisioned for this applet
const db = getFirestore(app, "ai-studio-omnisheetai-e189ccf0-6a85-4bc8-b040-1b94148689f7");

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { app, auth, googleProvider, db, signInWithPopup, signOut };
