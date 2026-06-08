import { useMemo, useState } from "react";
import { ALL_NAMES, type Gender, type NameEntry } from "../names";
import type { SwipeStoreState } from "../swipeStore";
import type { Session } from "../session";

interface Props {
  session: Session;
  store: SwipeStoreState;
  onBack: () => void;
}

type Tab = "matches" | "mine" | "theirs";
type Filter = "all" | Gender;

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  b: "Boys",
  g: "Girls",
  n: "Any"
};

const TAB_LABELS: Record<Tab, string> = {
  matches: "Matches",
  mine: "My likes",
  theirs: "Their likes"
};

const GENDER_PILL: Record<Gender, string> = {
  b: "bg-blue-100 text-blue-700",
  g: "bg-pink-100 text-pink-700",
  n: "bg-purple-100 text-purple-700"
};

const bundledById = new Map(ALL_NAMES.map((n) => [n.id, n]));

export default function MatchesPage({ session, store, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("matches");
  const [filter, setFilter] = useState<Filter>("all");

  // Merge bundled + custom names so typed-in names render on every tab.
  const namesById = useMemo(() => {
    const merged = new Map<string, NameEntry>(bundledById);
    for (const [id, c] of Object.entries(store.customNames)) {
      if (!merged.has(id)) merged.set(id, { id, name: c.name, gender: c.gender });
    }
    return merged;
  }, [store.customNames]);

  const ids = useMemo(() => {
    const src =
      tab === "matches"
        ? store.matches
        : tab === "mine"
          ? store.myLikes
          : store.partnerLikes;
    return Array.from(src);
  }, [tab, store.matches, store.myLikes, store.partnerLikes]);

  const items = useMemo(() => {
    return ids
      .map((id) => namesById.get(id))
      .filter((n): n is NonNullable<typeof n> => !!n)
      .filter((n) => filter === "all" || n.gender === filter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ids, filter, namesById]);

  function handleReset() {
    if (
      window.confirm(
        "Reset all of YOUR swipes? Your partner's will stay. You'll start over."
      )
    ) {
      store.reset();
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between bg-white/60 backdrop-blur border-b border-pink-100">
        <button onClick={onBack} className="text-pink-700 font-semibold">
          ← Swipe
        </button>
        <div className="font-display text-2xl font-bold text-pink-700">
          {TAB_LABELS[tab]}
        </div>
        <div className="text-xs text-slate-500 w-12 text-right">{items.length}</div>
      </header>

      <div className="px-4 py-2 flex gap-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
              tab === t
                ? "bg-pink-600 text-white"
                : "bg-white/70 text-slate-700 border border-slate-200"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 flex gap-2 overflow-x-auto">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
              filter === f
                ? "bg-pink-600 text-white"
                : "bg-white/70 text-slate-700 border border-slate-200"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <main className="flex-1 px-4 pb-4 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center text-slate-500 mt-16">
            {tab === "matches" ? (
              <>
                <div className="font-display text-3xl mb-2">No matches yet</div>
                <p className="text-sm">
                  Keep swiping. When you and {session.partnerLabel}'s partner both
                  love the same name, it'll show up here.
                </p>
              </>
            ) : (
              <p className="text-sm mt-4">Nothing here yet.</p>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 mt-2">
            {items.map((n) => {
              const isMatch = store.matches.has(n.id);
              return (
                <li
                  key={n.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border ${
                    isMatch && tab !== "matches"
                      ? "border-pink-400 ring-2 ring-pink-200"
                      : "border-slate-200"
                  }`}
                >
                  <div className="font-display text-2xl font-semibold">{n.name}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${GENDER_PILL[n.gender]}`}
                    >
                      {n.gender === "b" ? "boy" : n.gender === "g" ? "girl" : "any"}
                    </span>
                    {isMatch && tab !== "matches" && (
                      <span className="text-xs text-pink-600">♥ match</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <footer className="px-4 py-3 border-t border-pink-100 bg-white/60">
        <button
          onClick={handleReset}
          className="w-full text-xs text-slate-500 underline"
        >
          Reset my swipes
        </button>
      </footer>
    </div>
  );
}
