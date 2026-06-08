import { useState } from "react";
import {
  loadFirebaseConfig,
  saveFirebaseConfig,
  type FirebaseConfig
} from "../firebase";
import { saveSession, type Session } from "../session";

interface Props {
  onReady: (session: Session) => void;
}

export default function SetupPage({ onReady }: Props) {
  const existingCfg = loadFirebaseConfig();
  const [coupleCode, setCoupleCode] = useState("");
  const [partner, setPartner] = useState<"a" | "b">("a");
  const [partnerLabel, setPartnerLabel] = useState("");
  const [showCfg, setShowCfg] = useState(!existingCfg);
  const [cfgText, setCfgText] = useState("");
  const [cfgError, setCfgError] = useState<string | null>(null);

  function handleSaveConfig() {
    setCfgError(null);
    try {
      // The Firebase console snippet has `import ...`, `const firebaseConfig = {...}`,
      // and trailing `initializeApp()` calls. Extract just the `{...}` config object.
      const start = cfgText.indexOf("{");
      if (start === -1) throw new Error("Couldn't find a config object — make sure you copied the whole `firebaseConfig` block.");
      let depth = 0;
      let end = -1;
      for (let i = start; i < cfgText.length; i++) {
        const ch = cfgText[i];
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end === -1) throw new Error("Couldn't find the end of the config object — looks truncated.");
      const block = cfgText.substring(start, end + 1);
      // Convert JS object literal to JSON: quote unquoted keys, normalize quotes, strip trailing commas.
      const json = block
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/'/g, '"')
        .replace(/,(\s*[}\]])/g, "$1");
      const cfg = JSON.parse(json) as FirebaseConfig;
      if (!cfg.apiKey || !cfg.projectId || !cfg.appId) {
        throw new Error("Config is missing apiKey, projectId, or appId.");
      }
      saveFirebaseConfig(cfg);
      setShowCfg(false);
    } catch (err) {
      setCfgError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleStart() {
    if (!coupleCode.trim()) return;
    const session: Session = {
      coupleCode: coupleCode.trim().toLowerCase(),
      partner,
      partnerLabel: partnerLabel.trim() || (partner === "a" ? "Partner A" : "Partner B")
    };
    saveSession(session);
    onReady(session);
  }

  const cfgPresent = !!loadFirebaseConfig();

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto flex flex-col gap-6">
      <header className="text-center pt-6">
        <h1 className="font-display text-5xl font-bold text-pink-700">Baby Names</h1>
        <p className="text-slate-600 mt-2">Swipe together. See your matches.</p>
      </header>

      {!cfgPresent || showCfg ? (
        <section className="bg-white/80 rounded-2xl p-5 shadow border border-pink-100">
          <h2 className="font-semibold mb-1">Connect to Firebase</h2>
          <p className="text-sm text-slate-600 mb-3">
            Paste your <code>firebaseConfig</code> from the Firebase console. One-time setup
            — see the README for the 5-minute walkthrough.
          </p>
          <textarea
            value={cfgText}
            onChange={(e) => setCfgText(e.target.value)}
            placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "....firebaseapp.com",\n  projectId: "...",\n  appId: "..."\n};`}
            rows={8}
            className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 bg-white"
          />
          {cfgError && <p className="text-red-600 text-sm mt-2">{cfgError}</p>}
          <button
            onClick={handleSaveConfig}
            className="mt-3 w-full py-3 bg-pink-600 text-white rounded-xl font-semibold hover:bg-pink-700"
          >
            Save config
          </button>
        </section>
      ) : (
        <section className="bg-white/80 rounded-2xl p-5 shadow border border-pink-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Firebase connected</h2>
              <p className="text-xs text-slate-500">
                Project: {loadFirebaseConfig()?.projectId}
              </p>
            </div>
            <button
              className="text-sm text-pink-600 underline"
              onClick={() => setShowCfg(true)}
            >
              change
            </button>
          </div>
        </section>
      )}

      <section className="bg-white/80 rounded-2xl p-5 shadow border border-pink-100 flex flex-col gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">Couple code</label>
          <input
            value={coupleCode}
            onChange={(e) => setCoupleCode(e.target.value)}
            placeholder="something only you two will use"
            className="w-full p-3 rounded-lg border border-slate-300"
          />
          <p className="text-xs text-slate-500 mt-1">
            Pick anything — both of you enter the same code to sync up.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">You are…</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPartner("a")}
              className={`p-3 rounded-lg border ${
                partner === "a"
                  ? "bg-pink-600 text-white border-pink-600"
                  : "bg-white border-slate-300"
              }`}
            >
              Partner A
            </button>
            <button
              type="button"
              onClick={() => setPartner("b")}
              className={`p-3 rounded-lg border ${
                partner === "b"
                  ? "bg-pink-600 text-white border-pink-600"
                  : "bg-white border-slate-300"
              }`}
            >
              Partner B
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Your name (optional)</label>
          <input
            value={partnerLabel}
            onChange={(e) => setPartnerLabel(e.target.value)}
            placeholder="e.g. Nate"
            className="w-full p-3 rounded-lg border border-slate-300"
          />
        </div>

        <button
          onClick={handleStart}
          disabled={!coupleCode.trim() || !cfgPresent || showCfg}
          className="mt-2 w-full py-3 bg-pink-600 text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-pink-700"
        >
          Start swiping
        </button>
      </section>
    </div>
  );
}
