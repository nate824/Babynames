import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import type { NameEntry } from "../names";

const GENDER_LABEL: Record<NameEntry["gender"], string> = {
  b: "boy",
  g: "girl",
  n: "any"
};

const GENDER_CLASS: Record<NameEntry["gender"], string> = {
  b: "from-blue-200 to-blue-50 text-blue-900",
  g: "from-pink-200 to-pink-50 text-pink-900",
  n: "from-purple-200 to-purple-50 text-purple-900"
};

interface Props {
  name: NameEntry;
  onSwipe: (liked: boolean) => void;
  // Stacking: 0 = top card, 1 = behind, etc.
  depth: number;
  active: boolean;
  suggestedBy?: string | null;
}

const SWIPE_THRESHOLD = 110;

export default function SwipeCard({ name, onSwipe, depth, active, suggestedBy }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);

  function handleDragEnd(_e: unknown, info: PanInfo) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > SWIPE_THRESHOLD || velocity > 600) {
      onSwipe(true);
    } else if (offset < -SWIPE_THRESHOLD || velocity < -600) {
      onSwipe(false);
    }
  }

  const stackOffset = depth * 8;
  const stackScale = 1 - depth * 0.04;

  return (
    <motion.div
      className={`absolute inset-0 no-select rounded-3xl shadow-xl border border-white/60 bg-gradient-to-br ${GENDER_CLASS[name.gender]}`}
      style={{
        x: active ? x : 0,
        rotate: active ? rotate : 0,
        zIndex: 100 - depth
      }}
      initial={false}
      animate={{
        y: stackOffset,
        scale: stackScale,
        opacity: depth > 2 ? 0 : 1
      }}
      drag={active ? "x" : false}
      dragElastic={0.6}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={active ? { cursor: "grabbing" } : undefined}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
        <motion.div
          className="absolute top-6 left-6 px-4 py-2 rounded-lg border-4 border-red-500 text-red-500 font-bold text-2xl rotate-[-12deg]"
          style={{ opacity: active ? nopeOpacity : 0 }}
        >
          NOPE
        </motion.div>
        <motion.div
          className="absolute top-6 right-6 px-4 py-2 rounded-lg border-4 border-green-500 text-green-500 font-bold text-2xl rotate-[12deg]"
          style={{ opacity: active ? likeOpacity : 0 }}
        >
          LOVE
        </motion.div>

        {suggestedBy && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-pink-600 text-white text-xs font-semibold shadow-md whitespace-nowrap">
            ♥ {suggestedBy} picked this for you
          </div>
        )}
        <div className="text-sm uppercase tracking-widest opacity-70 mb-2">
          {GENDER_LABEL[name.gender]}
        </div>
        <div className="font-display text-6xl md:text-7xl font-bold text-center break-words">
          {name.name}
        </div>
        <div className="absolute bottom-6 text-xs opacity-50">
          swipe left to skip, right to love
        </div>
      </div>
    </motion.div>
  );
}
