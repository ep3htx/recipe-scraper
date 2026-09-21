import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pill, Plus, Minus, Trash2 } from "lucide-react";
import { supplementsApi } from "../api/endpoints";
import Card from "./Card";

// Supplement library with a one-tap "took one" button and today's dose count.
// New supplements arrive via the barcode sheet (Meals -> Scan).
export default function SupplementsCard() {
  const queryClient = useQueryClient();
  const { data: supplements } = useQuery({ queryKey: ["supplements"], queryFn: supplementsApi.list });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["supplements"] });
  const take = useMutation({ mutationFn: (id: string) => supplementsApi.log(id), onSuccess: refresh });
  const undo = useMutation({ mutationFn: (id: string) => supplementsApi.undoLatest(id), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => supplementsApi.remove(id), onSuccess: refresh });

  return (
    <div>
      <h3 className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">Supplements</h3>
      <Card className="divide-y divide-gray-100 p-0 dark:divide-gray-800">
        {supplements?.length ? (
          supplements.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-4 py-2.5">
              <Pill size={16} className={s.takenToday ? "text-brand-600" : "text-gray-300"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{s.name}</p>
                <p className="truncate text-xs text-gray-400">{[s.brand, s.servingSize].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              {s.takenToday ? (
                <>
                  <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">&times;{s.takenToday}</span>
                  <button aria-label={`Undo last ${s.name} dose`} onClick={() => undo.mutate(s.id)} className="rounded-full border border-gray-200 p-1.5 text-gray-500 dark:border-gray-700">
                    <Minus size={14} />
                  </button>
                </>
              ) : null}
              <button aria-label={`Log ${s.name}`} onClick={() => take.mutate(s.id)} className="rounded-full bg-brand-600 p-1.5 text-white active:scale-95">
                <Plus size={14} />
              </button>
              <button
                aria-label={`Remove ${s.name}`}
                onClick={() => {
                  if (window.confirm(`Remove ${s.name} and its dose history?`)) remove.mutate(s.id);
                }}
                className="text-gray-300 hover:text-rose-500"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        ) : (
          <p className="px-4 py-4 text-center text-sm text-gray-400">Scan a supplement bottle to add it here.</p>
        )}
      </Card>
    </div>
  );
}
