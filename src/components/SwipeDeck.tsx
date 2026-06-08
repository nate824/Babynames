import { useEffect, useMemo, useState } from "react";
import type { NameEntry } from "../names";
import SwipeCard from "./SwipeCard";

export interface QueueItem {
  name: NameEntry;
  suggestedBy?: string;
}

interface Props {
  queue: QueueItem[];
  onSwipe: (name: NameEntry, liked: boolean) => void;
}

export default function SwipeDeck({ queue, onSwipe }: Props) {
  // We render up to 3 cards stacked. The top card animates off, then we advance index.
  const [index, setIndex] = useState(0);

  // Reset index when the queue head changes (filter/reset/etc.).
  const queueKey = useMemo(
    () => queue.slice(0, 3).map((q) => q.name.id).join("|"),
    [queue]
  );
  useEffect(() => {
    setIndex(0);
  }, [queueKey]);

  if (queue.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center text-slate-500 p-8">
        <div className="font-display text-3xl mb-2">All caught up</div>
        <p>You've swiped through every name that matches your filters.</p>
      </div>
    );
  }

  const handleSwipe = (name: NameEntry, liked: boolean) => {
    onSwipe(name, liked);
    setIndex((i) => i + 1);
  };

  const visible = queue.slice(index, index + 3);

  return (
    <div className="relative w-full h-full">
      {visible.map((item, i) => (
        <SwipeCard
          key={item.name.id}
          name={item.name}
          depth={i}
          active={i === 0}
          suggestedBy={item.suggestedBy}
          onSwipe={(liked) => handleSwipe(item.name, liked)}
        />
      ))}
    </div>
  );
}
