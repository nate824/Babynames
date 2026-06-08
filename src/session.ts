import type { PartnerKey } from "./firebase";

const LS_KEY = "bnp.session.v1";

export interface Session {
  coupleCode: string;
  partner: PartnerKey;
  partnerLabel: string; // display name, e.g. "Nate" or "Sarah"
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.coupleCode || !parsed.partner) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(s: Session) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(LS_KEY);
}
