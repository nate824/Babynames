import { useMemo, useState } from "react";
import { ALL_NAMES, shuffled, type Gender, type NameEntry } from "../names";
import SwipeDeck, { type QueueItem } from "../components/SwipeDeck";
import type { SwipeStoreState } from "../swipeStore";
import type { Session } from "../session";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  session: Session;
  store: SwipeStoreState;
  onOpenMatches: () => void;
  onSignOut: () => void;
}

type Filter = "all" | Gender;

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  b: "Boys",
  g: "Girls",
  n: "Any"
};

function seedFrom(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export default function SwipePage({ session, store, onOpenMatches, onSignOut }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [suggestOpen, setSuggestOpen] = useState(false);

  const seed = useMemo(
    () => seedFrom(`${session.coupleCode}:${session.partner}`),
    [session.coupleCode, session.partner]
  );

  // Build the queue: suggestions first (ignore filter), then the shuffled main pool.
  const queue: QueueItem[] = useMemo(() => {
    const items: QueueItem[] = [];
    const seen = new Set<string>();

    // 1. Suggestions from my partner — newest first.
    const incoming = [...store.mySuggestions].sort(
      (a, b) => (b.at ?? 0) - (a.at ?? 0)
    );
    for (const s of incoming) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      items.push({
        name: { id: s.id, name: s.name, gender: s.gender } as NameEntry,
        suggestedBy: s.fromLabel || session.partnerLabel + "'s partner"
      });
    }

    // 2. The shuffled bundled pool (filtered).
    const base = shuffled(seed);
    const filtered =
      filter === "all"
        ? base
        : base.filter((n) => n.gender === filter || n.gender === "n");
    for (const n of filtered) {
      if (seen.has(n.id)) continue;
      if (store.myLikes.has(n.id) || store.myDislikes.has(n.id)) continue;
      seen.add(n.id);
      items.push({ name: n });
    }

    return items;
  }, [
    seed,
    filter,
    store.myLikes,
    store.myDislikes,
    store.mySuggestions,
    session.partnerLabel
  ]);

  const total = ALL_NAMES.length;
  const seenCount = store.myLikes.size + store.myDislikes.size;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between bg-white/60 backdrop-blur border-b border-pink-100">
        <div>
          <div className="font-display text-2xl font-bold text-pink-700 leading-none">
            Baby Names
          </div>
          <div className="text-xs text-slate-500">
            {session.partnerLabel} · {session.coupleCode}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSuggestOpen(true)}
            className="px-3 py-2 rounded-lg bg-white border border-pink-300 text-pink-700 text-sm font-semibold hover:bg-pink-50"
            title="Suggest a name for your partner"
          >
            ＋ Suggest
          </button>
          <button
            onClick={onOpenMatches}
            className="px-3 py-2 rounded-lg bg-pink-600 text-white text-sm font-semibold hover:bg-pink-700"
          >
            ♥ {store.matches.size}
          </button>
          <button
            onClick={onSignOut}
            className="text-xs text-slate-500 underline"
            title="Sign out"
          >
            exit
          </button>
        </div>
      </header>

      <div className="px-4 py-2 flex gap-2 overflow-x-auto items-center">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              filter === f
                ? "bg-pink-600 text-white"
                : "bg-white/70 text-slate-700 border border-slate-200"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
        {store.mySuggestions.length > 0 && (
          <span className="ml-1 px-2 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-semibold whitespace-nowrap">
            {store.mySuggestions.length} from your partner
          </span>
        )}
        <div className="ml-auto text-xs text-slate-500 self-center whitespace-nowrap">
          {seenCount} / {total}
        </div>
      </div>

      <main className="flex-1 px-4 pb-4 flex items-center justify-center">
        <div className="relative w-full max-w-sm aspect-[3/4]">
          <SwipeDeck
            queue={queue}
            onSwipe={(name, liked) => store.swipe(name.id, liked)}
          />
        </div>
      </main>

      <footer className="px-4 pb-6 pt-2 flex justify-center gap-6">
        <button
          aria-label="Skip"
          onClick={() => {
            const top = queue[0];
            if (top) store.swipe(top.name.id, false);
          }}
          disabled={queue.length === 0}
          className="w-16 h-16 rounded-full bg-white shadow-lg border border-red-200 text-red-500 text-2xl disabled:opacity-30"
        >
          ✕
        </button>
        <button
          aria-label="Love"
          onClick={() => {
            const top = queue[0];
            if (top) store.swipe(top.name.id, true);
          }}
          disabled={queue.length === 0}
          className="w-16 h-16 rounded-full bg-white shadow-lg border border-green-200 text-green-500 text-2xl disabled:opacity-30"
        >
          ♥
        </button>
      </footer>

      {store.syncError && (
        <div className="fixed bottom-2 left-2 right-2 bg-amber-100 border border-amber-300 text-amber-800 text-xs p-2 rounded-lg">
          Sync issue: {store.syncError}
        </div>
      )}

      <AnimatePresence>
        {suggestOpen && (
          <SuggestSheet
            session={session}
            store={store}
            onClose={() => setSuggestOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface SuggestSheetProps {
  session: Session;
  store: SwipeStoreState;
  onClose: () => void;
}

function SuggestSheet({ session, store, onClose }: SuggestSheetProps) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("n");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await store.suggest({
        name,
        gender,
        fromLabel: session.partnerLabel || undefined
      });
      setJustSent(name.trim());
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-2xl font-bold text-pink-700">
            Suggest a name
          </h2>
          <button onClick={onClose} className="text-slate-400 text-xl px-2">
            ✕
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          We'll drop it at the top of your partner's swipe queue.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ezra"
              className="w-full p-3 rounded-lg border border-slate-300 font-display text-xl"
              disabled={busy}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {(["b", "g", "n"] as Gender[]).map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setGender(g)}
                  className={`p-2.5 rounded-lg border text-sm ${
                    gender === g
                      ? g === "b"
                        ? "bg-blue-500 text-white border-blue-500"
                        : g === "g"
                          ? "bg-pink-500 text-white border-pink-500"
                          : "bg-purple-500 text-white border-purple-500"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {g === "b" ? "Boy" : g === "g" ? "Girl" : "Any"}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {justSent && !error && (
            <p className="text-green-700 text-sm">
              Sent <strong>{justSent}</strong> to your partner.
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full py-3 bg-pink-600 text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-pink-700"
          >
            {busy ? "Sending…" : "Send to partner"}
          </button>
        </form>

        {store.sentSuggestions.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-2 font-medium">
              You've suggested:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {store.sentSuggestions.slice(0, 12).map((s) => (
                <span
                  key={s.id + (s.at ?? 0)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
