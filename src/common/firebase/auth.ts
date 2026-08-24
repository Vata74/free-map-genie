import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type AuthCredential,
  type User,
} from "firebase/auth";

import { getFirebaseApp } from "./app";

export interface CloudUser {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
}

function toCloudUser(user: User): CloudUser {
  return { uid: user.uid, email: user.email, isAnonymous: user.isAnonymous };
}

function requireAuth(): Auth {
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase is not configured");
  return getAuth(app);
}

// The extension signs in anonymously the moment the offscreen document
// loads (see waitForAuthReady), so there's always a signed-in user with
// cloud backup working before the person ever opens the popup. Signing up
// or signing in with a real credential should upgrade that same anonymous
// account in place (same uid, same Firestore documents) rather than
// starting a new one — unless that credential already belongs to a
// different account (e.g. signing into Google on a second device that
// already has its own anonymous account), in which case we fall back to
// switching into the existing account instead.
async function linkOrSignIn(credential: AuthCredential): Promise<CloudUser> {
  const auth = requireAuth();
  const current = auth.currentUser;

  if (current?.isAnonymous) {
    try {
      const result = await linkWithCredential(current, credential);
      return toCloudUser(result.user);
    } catch (err: any) {
      if (err?.code !== "auth/credential-already-in-use") throw err;
    }
  }

  const result = await signInWithCredential(auth, credential);
  return toCloudUser(result.user);
}

export async function signUp(
  email: string,
  password: string
): Promise<CloudUser> {
  const auth = requireAuth();

  if (auth.currentUser?.isAnonymous) {
    return linkOrSignIn(EmailAuthProvider.credential(email, password));
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
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

// Takes the Google OAuth access token as a param rather than fetching it
// itself with chrome.identity.getAuthToken(): that API only exists in
// privileged extension pages (background, popup), not in this content
// script running inside the offscreen document's iframe, even though the
// iframe lives inside the extension's own offscreen.html. See
// BackgroundService.getGoogleAuthToken() for where the token actually
// comes from.
export async function signInWithGoogle(accessToken: string): Promise<CloudUser> {
  return linkOrSignIn(GoogleAuthProvider.credential(null, accessToken));
}

// Signs out of the current (real) account and immediately starts a fresh
// anonymous session, so cloud backup keeps working right away instead of
// leaving the extension signed out until the next offscreen document reload.
export async function signOutUser(): Promise<CloudUser | null> {
  const app = getFirebaseApp();
  if (!app) return null;

  const auth = getAuth(app);
  await firebaseSignOut(auth);

  try {
    const credential = await signInAnonymously(auth);
    return toCloudUser(credential.user);
  } catch (err) {
    logger.error("Anonymous sign-in after sign-out failed.", err);
    return null;
  }
}

// Firebase Auth restores a persisted session asynchronously, so
// `auth.currentUser` is unreliable immediately after init. This resolves
// once the SDK has finished restoring (or confirmed there's nothing to
// restore), which only happens once per offscreen document lifetime. If
// there's nothing to restore, it signs in anonymously so cloud backup is
// active immediately with no login step required.
export async function waitForAuthReady(): Promise<CloudUser | null> {
  const app = getFirebaseApp();
  if (!app) return null;

  const auth = getAuth(app);
  const restored = await new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

  if (restored) return toCloudUser(restored);

  try {
    const credential = await signInAnonymously(auth);
    return toCloudUser(credential.user);
  } catch (err) {
    logger.error("Anonymous sign-in failed.", err);
    return null;
  }
}
