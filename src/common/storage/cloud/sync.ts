import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

import { getFirebaseApp } from "@/common/firebase/app";
import {
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser as firebaseSignOutUser,
  waitForAuthReady,
  type CloudUser,
} from "@/common/firebase/auth";

import type { Key } from "../key";
import type { UserData } from "../format";

const PUSH_DEBOUNCE_MS = 3000;

// Syncs one Dexie-shaped UserData blob per (Firebase user, game) to
// Firestore at users/{uid}/games/{gameId}. Dexie stays the source of truth
// for local reads/writes; this only mirrors it to/from the cloud so it
// survives the local browser storage being cleared or wiped.
export class CloudSync {
  private user: CloudUser | null = null;
  private readonly ready: Promise<void>;
  private readonly pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pulledKeys = new Set<string>();

  public constructor(
    private readonly getLocalData: (key: Key) => Promise<UserData>,
    private readonly setLocalData: (key: Key, data: UserData) => Promise<void>
  ) {
    this.ready = waitForAuthReady().then((user) => {
      this.user = user;
    });
  }

  public isConfigured(): boolean {
    return !!getFirebaseApp();
  }

  public async getUser(): Promise<CloudUser | null> {
    await this.ready;
    return this.user;
  }

  public async signUp(email: string, password: string): Promise<CloudUser> {
    const user = await firebaseSignUp(email, password);
    this.user = user;
    this.pulledKeys.clear();
    return user;
  }

  public async signIn(email: string, password: string): Promise<CloudUser> {
    const user = await firebaseSignIn(email, password);
    this.user = user;
    this.pulledKeys.clear();
    return user;
  }

  public async signInWithGoogle(): Promise<CloudUser> {
    const user = await firebaseSignInWithGoogle();
    this.user = user;
    this.pulledKeys.clear();
    return user;
  }

  public async signOut(): Promise<CloudUser | null> {
    const user = await firebaseSignOutUser();
    this.user = user;
    this.pulledKeys.clear();
    return user;
  }

  private firestore(): Firestore | null {
    const app = getFirebaseApp();
    return app ? getFirestore(app) : null;
  }

  private docRef(key: Key) {
    const db = this.firestore();
    if (!db || !this.user) return null;
    return doc(db, "users", this.user.uid, "games", String(key.gameId));
  }

  private isEmpty(data: UserData): boolean {
    return (
      Object.keys(data.locations).length === 0 &&
      data.trackedCategoryIds.length === 0 &&
      data.presets.length === 0 &&
      data.notes.length === 0
    );
  }

  // Hydrates local storage from the cloud copy of this key, at most once per
  // sign-in, and only when local storage is currently empty. This covers
  // "new device, pull down what I had" without ever overwriting data the
  // user already has locally on this device.
  public async pullIfNeeded(key: Key): Promise<void> {
    await this.ready;
    if (!this.user) return;

    const cacheKey = key.toString();
    if (this.pulledKeys.has(cacheKey)) return;
    this.pulledKeys.add(cacheKey);

    const ref = this.docRef(key);
    if (!ref) return;

    try {
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) return;

      const local = await this.getLocalData(key);
      if (!this.isEmpty(local)) return;

      const { updatedAt, ...cloud } = snapshot.data() as UserData & {
        updatedAt?: unknown;
      };
      await this.setLocalData(key, cloud);
    } catch (err) {
      logger.error("Failed to pull cloud data.", err);
    }
  }

  // Debounced so a burst of local writes (marking several locations in a
  // row) collapses into one push instead of one write per action. Doesn't
  // gate on this.user directly since the initial anonymous sign-in may
  // still be in flight; push() awaits `ready` before checking.
  public schedulePush(key: Key): void {
    if (!this.isConfigured()) return;

    const cacheKey = key.toString();
    const existing = this.pushTimers.get(cacheKey);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.pushTimers.delete(cacheKey);
      this.push(key).catch((err) => {
        logger.error("Failed to push cloud data.", err);
      });
    }, PUSH_DEBOUNCE_MS);

    this.pushTimers.set(cacheKey, timer);
  }

  private async push(key: Key): Promise<void> {
    await this.ready;
    const ref = this.docRef(key);
    if (!ref) return;

    const data = await this.getLocalData(key);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() });
  }
}
