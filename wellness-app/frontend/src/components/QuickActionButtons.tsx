import { useNavigate } from "react-router-dom";
import { Scale, HeartPulse, UtensilsCrossed, Dumbbell, Droplet, Footprints, Activity } from "lucide-react";
import type { QuickLogType } from "./quickLog/QuickLogSheet";

const ACTIONS: { type: QuickLogType | "meal"; label: string; icon: typeof Scale }[] = [
  { type: "weight", label: "Weight", icon: Scale },
  { type: "bp", label: "Blood Pressure", icon: HeartPulse },
  { type: "meal", label: "Meal", icon: UtensilsCrossed },
  { type: "workout", label: "Workout", icon: Dumbbell },
  { type: "water", label: "Water", icon: Droplet },
  { type: "steps", label: "Steps", icon: Footprints },
  { type: "heartrate", label: "Resting HR", icon: Activity },
];

export default function QuickActionButtons({ onSelect, compact = false }: { onSelect: (type: QuickLogType) => void; compact?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-7 gap-2">
      {ACTIONS.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          onClick={() => (type === "meal" ? navigate("/meals?add=1") : onSelect(type))}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-gray-200 bg-white py-3 text-gray-700 shadow-sm transition active:scale-95 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            <Icon size={18} />
          </span>
          {!compact && <span className="text-[10px] font-medium leading-tight">{label}</span>}
        </button>
      ))}
    </div>
  );
}
