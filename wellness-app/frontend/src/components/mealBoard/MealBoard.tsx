import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Sparkles, ShoppingCart, GripVertical } from "lucide-react";
import clsx from "clsx";
import { mealPlansApi, foodsApi, aiApi } from "../../api/endpoints";
import Card from "../Card";
import Modal from "../Modal";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Calendar-grid meal board: day columns x meal-type rows. Cards can be
// dragged between cells (desktop, mouse), and every cell also has a tap-to-
// search "+" so adding/moving works without drag on a phone.
export default function MealBoard() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useQuery({ queryKey: ["meal-plans"], queryFn: mealPlansApi.list });
  const plan = plans?.[0];

  const [pendingCell, setPendingCell] = useState<{ dayOffset: number; mealType: string } | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["meal-plans"] });

  const createPlan = useMutation({
    mutationFn: () => {
      const start = new Date();
      const end = new Date(start.getTime() + 6 * 86_400_000);
      return mealPlansApi.create({
        name: "My Meal Plan",
        startDate: start.toISOString() as never,
        endDate: end.toISOString() as never,
      });
    },
    onSuccess: invalidate,
  });

  const generateWithAI = useMutation({
    mutationFn: () => aiApi.generateMealPlan({ days: 7, mealsPerDay: 3, snacksPerDay: 1 }),
    onSuccess: invalidate,
  });

  const moveItem = useMutation({
    mutationFn: (vars: { itemId: string; dayOffset: number; mealType: string }) =>
      mealPlansApi.moveItem(plan!.id, vars.itemId, { dayOffset: vars.dayOffset, mealType: vars.mealType }),
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => mealPlansApi.removeItem(plan!.id, itemId),
    onSuccess: invalidate,
  });

  const toGrocery = useMutation({
    mutationFn: () => mealPlansApi.toGroceryList(plan!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grocery-lists"] }),
  });

  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">Loading...</div>;

  if (!plan) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No meal plan yet — start one to build your board.</p>
        <div className="flex justify-center gap-2">
          <button onClick={() => createPlan.mutate()} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
            Start empty board
          </button>
          <button
            onClick={() => generateWithAI.mutate()}
            disabled={generateWithAI.isPending}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Sparkles size={15} /> {generateWithAI.isPending ? "Generating…" : "Generate with AI"}
          </button>
        </div>
        {generateWithAI.isError && <p className="text-xs text-rose-500">{(generateWithAI.error as Error).message}</p>}
      </Card>
    );
  }

  const dayCount = Math.max(7, ...plan.items.map((i) => i.dayOffset + 1));
  const days = Array.from({ length: dayCount }, (_, i) => i);

  function itemsFor(dayOffset: number, mealType: string) {
    return plan!.items.filter((i) => i.dayOffset === dayOffset && i.mealType === mealType);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{plan.name}</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => generateWithAI.mutate()}
            disabled={generateWithAI.isPending}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 disabled:opacity-50 dark:text-brand-400"
          >
            <Sparkles size={14} /> {generateWithAI.isPending ? "Generating…" : "New AI plan"}
          </button>
          <button onClick={() => toGrocery.mutate()} className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <ShoppingCart size={14} /> Grocery list
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="grid min-w-[720px] grid-cols-[80px_repeat(7,1fr)]">
          <div className="border-b border-r border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900" />
          {days.slice(0, 7).map((d) => (
            <div key={d} className="border-b border-r border-gray-200 bg-gray-50 p-2 text-center text-xs font-bold uppercase tracking-wide text-gray-500 last:border-r-0 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              {DAY_LABELS[d % 7]}
            </div>
          ))}

          {MEAL_TYPES.map((mealType) => (
            <Fragment key={mealType}>
              <div className="flex items-center border-r border-b border-gray-200 bg-gray-50 p-2 text-xs font-semibold capitalize text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                {mealType}
              </div>
              {days.slice(0, 7).map((dayOffset) => (
                <div
                  key={`${mealType}-${dayOffset}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const itemId = e.dataTransfer.getData("text/plain");
                    if (itemId) moveItem.mutate({ itemId, dayOffset, mealType });
                    setDraggingItemId(null);
                  }}
                  className={clsx(
                    "min-h-[84px] space-y-1.5 border-r border-b border-gray-100 p-1.5 last:border-r-0 dark:border-gray-800",
                    draggingItemId && "bg-brand-50/40 dark:bg-brand-900/10"
                  )}
                >
                  {itemsFor(dayOffset, mealType).map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", item.id);
                        setDraggingItemId(item.id);
                      }}
                      onDragEnd={() => setDraggingItemId(null)}
                      className="group flex cursor-grab items-start gap-1 rounded-lg bg-brand-50 px-2 py-1.5 text-[11px] leading-tight text-brand-800 active:cursor-grabbing dark:bg-brand-900/30 dark:text-brand-200"
                    >
                      <GripVertical size={11} className="mt-0.5 shrink-0 opacity-40" />
                      <span className="flex-1">
                        {item.title}
                        {item.calories != null && <span className="block text-[10px] opacity-70">{Math.round(item.calories)} cal</span>}
                      </span>
                      <button onClick={() => removeItem.mutate(item.id)} className="shrink-0 opacity-0 group-hover:opacity-100">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setPendingCell({ dayOffset, mealType })}
                    className="flex w-full items-center justify-center rounded-lg border border-dashed border-gray-200 py-1 text-gray-300 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-gray-400">Drag a card to move it between days — or tap the + to search and add.</p>

      <AddToCellModal
        planId={plan.id}
        cell={pendingCell}
        onClose={() => setPendingCell(null)}
        onAdded={() => {
          setPendingCell(null);
          invalidate();
        }}
      />
    </div>
  );
}

function AddToCellModal({
  planId,
  cell,
  onClose,
  onAdded,
}: {
  planId: string;
  cell: { dayOffset: number; mealType: string } | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const { data: foods } = useQuery({
    queryKey: ["foods", "search", search],
    queryFn: () => foodsApi.search(search || undefined),
    enabled: cell !== null,
  });

  const addFood = useMutation({
    mutationFn: (foodId: string) => mealPlansApi.addItemFromFood(planId, { foodId, dayOffset: cell!.dayOffset, mealType: cell!.mealType }),
    onSuccess: onAdded,
  });

  return (
    <Modal open={cell !== null} onClose={onClose} title={cell ? `Add to ${cell.mealType}` : ""}>
      <input
        autoFocus
        placeholder="Search foods…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
      />
      <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
        {foods?.length ? (
          foods.map((f) => (
            <button
              key={f.id}
              onClick={() => addFood.mutate(f.id)}
              disabled={addFood.isPending}
              className="flex w-full items-center justify-between px-1 py-2.5 text-left text-sm disabled:opacity-50"
            >
              <span>
                {f.name} <span className="text-xs text-gray-400">({f.servingSize})</span>
              </span>
              <span className="text-xs text-gray-400">{f.calories} cal</span>
            </button>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-gray-400">{search ? "No matches." : "Start typing to search."}</p>
        )}
      </div>
    </Modal>
  );
}
