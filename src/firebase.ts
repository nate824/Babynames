import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  serverTimestamp,
  type Firestore
} from "firebase/firestore";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  // storageBucket / messagingSenderId optional for our use case
  storageBucket?: string;
  messagingSenderId?: string;
}

// Build-time config from .env (preferred). Empty strings if not set.
const envConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
};

const LS_KEY_CONFIG = "bnp.firebase.config";

export function loadFirebaseConfig(): FirebaseConfig | null {
  if (envConfig.apiKey && envConfig.projectId && envConfig.appId) {
    return envConfig;
  }
  try {
    const raw = localStorage.getItem(LS_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as FirebaseConfig;
      if (parsed.apiKey && parsed.projectId && parsed.appId) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveFirebaseConfig(cfg: FirebaseConfig) {
  localStorage.setItem(LS_KEY_CONFIG, JSON.stringify(cfg));
}

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

export function getDb(): Firestore {
  if (_db) return _db;
  const cfg = loadFirebaseConfig();
  if (!cfg) throw new Error("Firebase config not set");
  _app = initializeApp(cfg);
  _db = getFirestore(_app);
  return _db;
}

export type PartnerKey = "a" | "b";

export interface PartnerSwipes {
  likes: string[];
  dislikes: string[];
  updatedAt?: unknown;
}

export interface Suggestion {
  id: string;
  name: string;
  gender: "b" | "g" | "n";
  fromLabel?: string;
  at?: number;
}

export interface CustomName {
  name: string;
  gender: "b" | "g" | "n";
}

export interface CoupleDoc {
  a?: PartnerSwipes;
  b?: PartnerSwipes;
  // Suggestions are keyed by the partner they're FOR (the recipient).
  suggestionsA?: Suggestion[];
  suggestionsB?: Suggestion[];
  // Names typed in by either partner that aren't in the bundled dataset.
  customNames?: Record<string, CustomName>;
}

function coupleRef(coupleCode: string) {
  return doc(getDb(), "couples", coupleCode.toLowerCase().trim());
}

export async function writePartnerSwipes(
  coupleCode: string,
  partner: PartnerKey,
  swipes: PartnerSwipes
) {
  await setDoc(
    coupleRef(coupleCode),
    {
      [partner]: { ...swipes, updatedAt: serverTimestamp() }
    },
    { merge: true }
  );
}

export async function addSuggestion(
  coupleCode: string,
  recipient: PartnerKey,
  suggestion: Suggestion,
  customName?: CustomName
) {
  const ref = coupleRef(coupleCode);
  const field = recipient === "a" ? "suggestionsA" : "suggestionsB";
  const payload: Record<string, unknown> = {
    [field]: arrayUnion(suggestion)
  };
  if (customName) {
    payload[`customNames.${suggestion.id}`] = customName;
  }
  try {
    await updateDoc(ref, payload);
  } catch {
    // Doc may not exist yet — create it.
    await setDoc(
      ref,
      {
        [field]: [suggestion],
        ...(customName ? { customNames: { [suggestion.id]: customName } } : {})
      },
      { merge: true }
    );
  }
}

export function subscribeCouple(
  coupleCode: string,
  cb: (data: CoupleDoc) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    coupleRef(coupleCode),
    (snap) => {
      const data = (snap.data() as CoupleDoc) ?? {};
      cb(data);
    },
    (err) => onError?.(err)
  );
}
