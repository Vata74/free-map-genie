import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
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

// Uses chrome.identity.getAuthToken, which relies on the extension's OAuth2
// client_id/scopes declared in the manifest (see wxt.config.ts) and on the
// extension having a stable, pinned ID (also set there). Only available on
// Chrome; there's no browser.identity.getAuthToken equivalent on Firefox.
export async function signInWithGoogle(): Promise<CloudUser> {
  const result = await browser.identity.getAuthToken({ interactive: true });
  if (!result.token) {
    throw new Error("Google sign-in was cancelled or denied.");
  }

  const credential = GoogleAuthProvider.credential(null, result.token);
  const userCredential = await signInWithCredential(requireAuth(), credential);
  return toCloudUser(userCredential.user);
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
