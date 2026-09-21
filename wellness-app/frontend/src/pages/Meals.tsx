import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Sparkles, Check, ScanBarcode } from "lucide-react";
import clsx from "clsx";
import { mealsApi, foodsApi, groceryApi, pantryApi, aiApi } from "../api/endpoints";
import type { Food } from "../api/types";
import Card from "../components/Card";
import Modal from "../components/Modal";
import MealBoard from "../components/mealBoard/MealBoard";
import BarcodeEntryModal from "../components/BarcodeEntryModal";
import SupplementsCard from "../components/SupplementsCard";
import { useBarcodeWedge } from "../hooks/useBarcodeWedge";

const TABS = ["Today", "Plan", "Grocery", "Pantry"] as const;
type Tab = (typeof TABS)[number];

export default function Meals() {
  const [tab, setTab] = useState<Tab>("Today");
  const [searchParams, setSearchParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState<string | undefined>();

  const openScan = (code?: string) => {
    setScanCode(code);
    setScanOpen(true);
  };
  // A USB/Bluetooth scanner "typing" a code while nothing is focused opens the sheet.
  useBarcodeWedge(openScan, !scanOpen && !addOpen);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAddOpen(true);
      searchParams.delete("add");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 px-4 pt-4 md:px-0 md:pt-0">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Meals</h1>
        {tab === "Today" && (
          <div className="flex gap-2">
            <button onClick={() => openScan()} className="flex items-center gap-1 rounded-full border border-brand-600 px-3.5 py-2 text-sm font-semibold text-brand-700 active:scale-95 dark:text-brand-300">
              <ScanBarcode size={16} /> Scan
            </button>
            <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 rounded-full bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white active:scale-95">
              <Plus size={16} /> Add
            </button>
          </div>
        )}
      </header>

      <div className="flex gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-900">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 rounded-full py-1.5 text-sm font-medium transition",
              tab === t ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-50" : "text-gray-500"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Today" && <TodayTab />}
      {tab === "Plan" && <PlanTab />}
      {tab === "Grocery" && <GroceryTab />}
      {tab === "Pantry" && <PantryTab />}

      <AddMealModal open={addOpen} onClose={() => setAddOpen(false)} />
      <BarcodeEntryModal
        open={scanOpen}
        initialCode={scanCode}
        onClose={() => {
          setScanOpen(false);
          setScanCode(undefined);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

function TodayTab() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["meals", "today"], queryFn: mealsApi.today });
  const remove = useMutation({ mutationFn: mealsApi.remove, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meals"] }) });

  const grouped = ["breakfast", "lunch", "dinner", "snack"] as const;

  return (
    <div className="space-y-3">
      {data && (
        <Card className="flex justify-around text-center">
          <Stat label="Calories" value={Math.round(data.totals.calories)} />
          <Stat label="Protein" value={`${Math.round(data.totals.protein)}g`} />
          <Stat label="Carbs" value={`${Math.round(data.totals.carbs)}g`} />
          <Stat label="Fat" value={`${Math.round(data.totals.fat)}g`} />
        </Card>
      )}
      {grouped.map((type) => {
        const meals = data?.meals.filter((m) => m.mealType === type) ?? [];
        if (meals.length === 0) return null;
        return (
          <div key={type}>
            <h3 className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">{type}</h3>
            <Card className="divide-y divide-gray-100 p-0 dark:divide-gray-800">
              {meals.map((meal) => (
                <div key={meal.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">{Math.round(meal.items.reduce((s, i) => s + i.calories, 0))} cal</span>
                    <button onClick={() => remove.mutate(meal.id)} className="text-gray-300 hover:text-rose-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {meal.items.map((item, i) => (
                    <p key={i} className="text-sm text-gray-700 dark:text-gray-200">
                      {item.description ?? "Food item"} × {item.quantity}
                    </p>
                  ))}
                </div>
              ))}
            </Card>
          </div>
        );
      })}
      {!data?.meals.length && <p className="py-4 text-center text-sm text-gray-400">No meals logged today yet.</p>}
      <SupplementsCard />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
    </div>
  );
}

function AddMealModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [mealType, setMealType] = useState("breakfast");
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [custom, setCustom] = useState({ description: "", calories: "", protein: "", carbs: "", fat: "" });

  const { data: foods } = useQuery({ queryKey: ["foods", "search", search], queryFn: () => foodsApi.search(search || undefined), enabled: open });

  const addMeal = useMutation({
    mutationFn: () => {
      const items = selectedFood
        ? [{ foodId: selectedFood.id, quantity: Number(quantity) }]
        : [
            {
              description: custom.description,
              quantity: Number(quantity),
              calories: Number(custom.calories || 0),
              protein: Number(custom.protein || 0),
              carbs: Number(custom.carbs || 0),
              fat: Number(custom.fat || 0),
            },
          ];
      return mealsApi.create({ mealType, items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSelectedFood(null);
      setCustom({ description: "", calories: "", protein: "", carbs: "", fat: "" });
      onClose();
    },
  });

  const canSave = selectedFood != null || (custom.description && custom.calories);

  return (
    <Modal open={open} onClose={onClose} title="Add Meal">
      <div className="space-y-3">
        <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800">
          {["breakfast", "lunch", "dinner", "snack"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <input
          placeholder="Search foods…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedFood(null);
          }}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        />

        {search && (
          <div className="max-h-40 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
            {foods?.length ? (
              foods.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFood(f)}
                  className={clsx("flex w-full items-center justify-between px-3 py-2 text-left text-sm", selectedFood?.id === f.id && "bg-brand-50 dark:bg-brand-900/20")}
                >
                  <span>
                    {f.name} <span className="text-xs text-gray-400">({f.servingSize})</span>
                  </span>
                  <span className="text-xs text-gray-400">{f.calories} cal</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-xs text-gray-400">No matches — add a custom item below.</p>
            )}
          </div>
        )}

        {!selectedFood && !search && (
          <div className="space-y-2 rounded-xl border border-dashed border-gray-200 p-3 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-400">Or add a custom item</p>
            <input placeholder="Description" value={custom.description} onChange={(e) => setCustom({ ...custom, description: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <div className="grid grid-cols-4 gap-2">
              {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                <input
                  key={k}
                  inputMode="decimal"
                  placeholder={k}
                  value={custom[k]}
                  onChange={(e) => setCustom({ ...custom, [k]: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Quantity / servings</label>
          <input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
        </div>

        <button
          disabled={!canSave || addMeal.isPending}
          onClick={() => addMeal.mutate()}
          className="w-full rounded-xl bg-brand-600 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {addMeal.isPending ? "Saving…" : "Save meal"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function PlanTab() {
  return <MealBoard />;
}

// ---------------------------------------------------------------------------
// Grocery
// ---------------------------------------------------------------------------

function GroceryTab() {
  const queryClient = useQueryClient();
  const { data: lists } = useQuery({ queryKey: ["grocery-lists"], queryFn: groceryApi.list });
  const list = lists?.[0];
  const [newItem, setNewItem] = useState("");

  const toggle = useMutation({
    mutationFn: (vars: { itemId: string; purchased: boolean }) => groceryApi.updateItem(list!.id, vars.itemId, { purchased: vars.purchased }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grocery-lists"] }),
  });
  const addItem = useMutation({
    mutationFn: (name: string) => groceryApi.addItem(list!.id, { name }),
    onSuccess: () => {
      setNewItem("");
      queryClient.invalidateQueries({ queryKey: ["grocery-lists"] });
    },
  });

  if (!list) {
    return <p className="py-8 text-center text-sm text-gray-400">No grocery list yet. Generate a meal plan, then create one from it.</p>;
  }

  const byCategory = list.items.reduce<Record<string, typeof list.items>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newItem.trim()) addItem.mutate(newItem.trim());
        }}
      >
        <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add item" className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
        <button type="submit" className="rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">
          Add
        </button>
      </form>
      {Object.entries(byCategory).map(([category, items]) => (
        <Card key={category} title={category}>
          <div className="space-y-2">
            {items.map((item) => (
              <label key={item.id} className="flex items-center gap-2.5 text-sm">
                <button
                  onClick={() => toggle.mutate({ itemId: item.id, purchased: !item.purchased })}
                  className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", item.purchased ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 dark:border-gray-600")}
                >
                  {item.purchased && <Check size={13} />}
                </button>
                <span className={item.purchased ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-200"}>
                  {item.name} {item.quantity ? `(${item.quantity})` : ""}
                </span>
              </label>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantry
// ---------------------------------------------------------------------------

function PantryTab() {
  const queryClient = useQueryClient();
  const { data: items } = useQuery({ queryKey: ["pantry"], queryFn: pantryApi.list });
  const [newItem, setNewItem] = useState("");
  const [suggestions, setSuggestions] = useState<{ title: string; instructions?: string[]; usesFromPantry?: string[] }[] | null>(null);

  const addItem = useMutation({
    mutationFn: (name: string) => pantryApi.create({ name }),
    onSuccess: () => {
      setNewItem("");
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
    },
  });
  const removeItem = useMutation({ mutationFn: pantryApi.remove, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pantry"] }) });
  const askPantry = useMutation({
    mutationFn: () => aiApi.pantrySuggestions(),
    onSuccess: (res) => setSuggestions(res.suggestions as never),
  });

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newItem.trim()) addItem.mutate(newItem.trim());
        }}
      >
        <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="e.g. Chicken breast" className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
        <button type="submit" className="rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">
          Add
        </button>
      </form>

      <Card className="flex flex-wrap gap-2">
        {items?.length ? (
          items.map((i) => (
            <span key={i.id} className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-800">
              {i.name}
              <button onClick={() => removeItem.mutate(i.id)} className="text-gray-400 hover:text-rose-500">
                <Trash2 size={12} />
              </button>
            </span>
          ))
        ) : (
          <p className="text-sm text-gray-400">Add what's in your fridge and pantry.</p>
        )}
      </Card>

      <button
        onClick={() => askPantry.mutate()}
        disabled={askPantry.isPending || !items?.length}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Sparkles size={16} /> {askPantry.isPending ? "Thinking…" : "What can I make tonight?"}
      </button>
      {askPantry.isError && <p className="text-center text-xs text-rose-500">{(askPantry.error as Error).message}</p>}

      {suggestions?.map((s, i) => (
        <Card key={i} title={s.title}>
          {s.usesFromPantry && <p className="text-xs text-gray-400">Uses: {s.usesFromPantry.join(", ")}</p>}
          {s.instructions && (
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-gray-700 dark:text-gray-200">
              {s.instructions.map((step, j) => (
                <li key={j}>{step}</li>
              ))}
            </ol>
          )}
        </Card>
      ))}
    </div>
  );
}
