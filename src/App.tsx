import { useEffect, useState } from "react";
import { loadSession, clearSession, type Session } from "./session";
import SetupPage from "./pages/SetupPage";
import SwipePage from "./pages/SwipePage";
import MatchesPage from "./pages/MatchesPage";
import { useSwipeStore } from "./swipeStore";
import { AnimatePresence, motion } from "framer-motion";

type View = "swipe" | "matches";

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [view, setView] = useState<View>("swipe");

  // Show a brief celebration when match count grows.
  const [celebrating, setCelebrating] = useState<string | null>(null);

  if (!session) {
    return <SetupPage onReady={setSession} />;
  }

  return (
    <SessionApp
      session={session}
      view={view}
      setView={setView}
      celebrating={celebrating}
      setCelebrating={setCelebrating}
      onSignOut={() => {
        clearSession();
        setSession(null);
      }}
    />
  );
}

interface SessionAppProps {
  session: Session;
  view: View;
  setView: (v: View) => void;
  celebrating: string | null;
  setCelebrating: (s: string | null) => void;
  onSignOut: () => void;
}

function SessionApp({
  session,
  view,
  setView,
  celebrating,
  setCelebrating,
  onSignOut
}: SessionAppProps) {
  const store = useSwipeStore(session.coupleCode, session.partner);

  // Detect new matches to celebrate
  const [prevMatchCount, setPrevMatchCount] = useState<number>(store.matches.size);
  useEffect(() => {
    if (store.matches.size > prevMatchCount) {
      // Find the newest match (we don't know which one — just pick the last added that's new)
      // For UX it's enough to show a generic "It's a match!" overlay.
      setCelebrating("match");
      const t = window.setTimeout(() => setCelebrating(null), 1800);
      return () => window.clearTimeout(t);
    }
    setPrevMatchCount(store.matches.size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.matches.size]);

  return (
    <>
      {view === "swipe" ? (
        <SwipePage
          session={session}
          store={store}
          onOpenMatches={() => setView("matches")}
          onSignOut={onSignOut}
        />
      ) : (
        <MatchesPage
          session={session}
          store={store}
          onBack={() => setView("swipe")}
        />
      )}

      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-pink-600 text-white rounded-3xl px-8 py-6 shadow-2xl text-center">
              <div className="text-5xl">💕</div>
              <div className="font-display text-3xl font-bold mt-2">It's a match!</div>
              <div className="text-sm opacity-80 mt-1">
                You both loved a name. Check the matches tab.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
