import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
} from "firebase/auth";

import { getFirebaseApp } from "./app";

export interface CloudUser {
  uid: string;
  email: string | null;
}

function toCloudUser(user: { uid: string; email: string | null }): CloudUser {
  return { uid: user.uid, email: user.email };
}

function requireAuth(): Auth {
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase is not configured");
  return getAuth(app);
}

export async function signUp(
  email: string,
  password: string
): Promise<CloudUser> {
  const credential = await createUserWithEmailAndPassword(
    requireAuth(),
    email,
    password
  );
  return toCloudUser(credential.user);
}

export async function signIn(
  email: string,
  password: string
): Promise<CloudUser> {
  const credential = await signInWithEmailAndPassword(
    requireAuth(),
    email,
    password
  );
  return toCloudUser(credential.user);
}

export async function signOutUser(): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  await firebaseSignOut(getAuth(app));
}

// Firebase Auth restores a persisted session asynchronously, so
// `auth.currentUser` is unreliable immediately after init. This resolves
// once the SDK has finished restoring (or confirmed there's nothing to
// restore), which only happens once per offscreen document lifetime.
export async function waitForAuthReady(): Promise<CloudUser | null> {
  const app = getFirebaseApp();
  if (!app) return null;

  const auth = getAuth(app);
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user ? toCloudUser(user) : null);
    });
  });
}
