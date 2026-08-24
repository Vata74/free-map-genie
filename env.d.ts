declare global {
  export namespace NodeJS {
    interface ProcessEnv {
      /** Email for MG login [e2e] */
      MG_EMAIL?: string;
      /** Password for MG login [e2e] */
      MG_PASSWORD?: string;
      /** Firebase web app config, from the Firebase console */
      FIREBASE_API_KEY?: string;
      FIREBASE_AUTH_DOMAIN?: string;
      FIREBASE_PROJECT_ID?: string;
      FIREBASE_STORAGE_BUCKET?: string;
      FIREBASE_MESSAGING_SENDER_ID?: string;
      FIREBASE_APP_ID?: string;
    }
  }
}

declare module "dotenv" {
  export interface DotenvParseOutput extends NodeJS.ProcessEnv {
    MG_EMAIL?: string;
    MG_PASSWORD?: string;
    FIREBASE_API_KEY?: string;
    FIREBASE_AUTH_DOMAIN?: string;
    FIREBASE_PROJECT_ID?: string;
    FIREBASE_STORAGE_BUCKET?: string;
    FIREBASE_MESSAGING_SENDER_ID?: string;
    FIREBASE_APP_ID?: string;
  }
}

export {};
