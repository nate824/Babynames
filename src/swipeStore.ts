import { useEffect, useRef, useState, useCallback } from "react";
import {
  addSuggestion as addSuggestionRemote,
  subscribeCouple,
  writePartnerSwipes,
  type CoupleDoc,
  type CustomName,
  type PartnerKey,
  type Suggestion
} from "./firebase";
import { ALL_NAMES, type Gender } from "./names";

const BUNDLED_IDS = new Set(ALL_NAMES.map((n) => n.id));

// Local cache to give instant UI feedback + work offline.
const cacheKey = (coupleCode: string) => `bnp.cache.${coupleCode}`;

interface LocalSwipes {
  likes: Set<string>;
  dislikes: Set<string>;
}

function loadLocal(coupleCode: string): LocalSwipes {
  try {
    const raw = localStorage.getItem(cacheKey(coupleCode));
    if (raw) {
      const parsed = JSON.parse(raw) as { likes: string[]; dislikes: string[] };
      return { likes: new Set(parsed.likes), dislikes: new Set(parsed.dislikes) };
    }
  } catch {
    // ignore
  }
  return { likes: new Set(), dislikes: new Set() };
}

function saveLocal(coupleCode: string, swipes: LocalSwipes) {
  localStorage.setItem(
    cacheKey(coupleCode),
    JSON.stringify({
      likes: Array.from(swipes.likes),
      dislikes: Array.from(swipes.dislikes)
    })
  );
}

export interface SwipeStoreState {
  myLikes: Set<string>;
  myDislikes: Set<string>;
  partnerLikes: Set<string>;
  matches: Set<string>;
  // Names the other partner suggested for ME (still un-swiped).
  mySuggestions: Suggestion[];
  // Names I suggested for THEM (so I can see what I've sent).
  sentSuggestions: Suggestion[];
  customNames: Record<string, CustomName>;
  syncError: string | null;
  swipe: (nameId: string, liked: boolean) => void;
  suggest: (input: { name: string; gender: Gender; fromLabel?: string }) => Promise<void>;
  reset: () => void;
}

export function useSwipeStore(coupleCode: string, me: PartnerKey): SwipeStoreState {
  const partnerKey: PartnerKey = me === "a" ? "b" : "a";

  const [my, setMy] = useState<LocalSwipes>(() => loadLocal(coupleCode));
  const [partnerLikes, setPartnerLikes] = useState<Set<string>>(new Set());
  const [allSuggestionsForMe, setAllSuggestionsForMe] = useState<Suggestion[]>([]);
  const [sentSuggestions, setSentSuggestions] = useState<Suggestion[]>([]);
  const [customNames, setCustomNames] = useState<Record<string, CustomName>>({});
  const [syncError, setSyncError] = useState<string | null>(null);

  // Debounced server write
  const pendingTimer = useRef<number | null>(null);
  const scheduleWrite = useCallback(
    (next: LocalSwipes) => {
      if (pendingTimer.current) window.clearTimeout(pendingTimer.current);
      pendingTimer.current = window.setTimeout(async () => {
        try {
          await writePartnerSwipes(coupleCode, me, {
            likes: Array.from(next.likes),
            dislikes: Array.from(next.dislikes)
          });
          setSyncError(null);
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : String(err));
        }
      }, 500);
    },
    [coupleCode, me]
  );

  // Subscribe to couple doc; merge partner's likes + reconcile mine.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeCouple(
        coupleCode,
        (data: CoupleDoc) => {
          const theirs = data[partnerKey];
          setPartnerLikes(new Set(theirs?.likes ?? []));

          // If the server has my swipes and we have nothing locally, pull them.
          const mine = data[me];
          if (mine && my.likes.size === 0 && my.dislikes.size === 0) {
            const next = {
              likes: new Set(mine.likes ?? []),
              dislikes: new Set(mine.dislikes ?? [])
            };
            setMy(next);
            saveLocal(coupleCode, next);
          }

          const incomingField = me === "a" ? "suggestionsA" : "suggestionsB";
          const outgoingField = me === "a" ? "suggestionsB" : "suggestionsA";
          setAllSuggestionsForMe(data[incomingField] ?? []);
          setSentSuggestions(data[outgoingField] ?? []);
          setCustomNames(data.customNames ?? {});

          setSyncError(null);
        },
        (err) => setSyncError(err.message)
      );
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err));
    }
    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleCode, me, partnerKey]);

  const swipe = useCallback(
    (nameId: string, liked: boolean) => {
      setMy((prev) => {
        const next: LocalSwipes = {
          likes: new Set(prev.likes),
          dislikes: new Set(prev.dislikes)
        };
        if (liked) {
          next.likes.add(nameId);
          next.dislikes.delete(nameId);
        } else {
          next.dislikes.add(nameId);
          next.likes.delete(nameId);
        }
        saveLocal(coupleCode, next);
        scheduleWrite(next);
        return next;
      });
    },
    [coupleCode, scheduleWrite]
  );

  const reset = useCallback(() => {
    const empty: LocalSwipes = { likes: new Set(), dislikes: new Set() };
    setMy(empty);
    saveLocal(coupleCode, empty);
    scheduleWrite(empty);
  }, [coupleCode, scheduleWrite]);

  const suggest = useCallback(
    async ({
      name,
      gender,
      fromLabel
    }: {
      name: string;
      gender: Gender;
      fromLabel?: string;
    }) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      // Title-case the first letter of each word for display.
      const display = trimmed
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      const id = display.toLowerCase();
      const suggestion: Suggestion = {
        id,
        name: display,
        gender,
        fromLabel,
        at: Date.now()
      };
      const customName: CustomName | undefined = BUNDLED_IDS.has(id)
        ? undefined
        : { name: display, gender };
      try {
        await addSuggestionRemote(coupleCode, partnerKey, suggestion, customName);
        setSyncError(null);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
    [coupleCode, partnerKey]
  );

  // Filter out suggestions the user has already swiped on.
  const mySuggestions = allSuggestionsForMe.filter(
    (s) => !my.likes.has(s.id) && !my.dislikes.has(s.id)
  );

  const matches = new Set<string>();
  for (const id of my.likes) {
    if (partnerLikes.has(id)) matches.add(id);
  }

  return {
    myLikes: my.likes,
    myDislikes: my.dislikes,
    partnerLikes,
    matches,
    mySuggestions,
    sentSuggestions,
    customNames,
    syncError,
    swipe,
    suggest,
    reset
  };
}
