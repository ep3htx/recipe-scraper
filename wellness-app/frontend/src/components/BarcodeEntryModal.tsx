import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ScanBarcode } from "lucide-react";
import clsx from "clsx";
import { barcodeApi, mealsApi, supplementsApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { BarcodeLookup, Food, FoodCandidate, Supplement } from "../api/types";
import Modal from "./Modal";

const INPUT = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800";
const SMALL_INPUT = "w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800";
const PRIMARY_BTN = "w-full rounded-xl bg-brand-600 py-3 text-base font-semibold text-white disabled:opacity-50";

function defaultMealType() {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

const errMessage = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong — try again");

function optionalNumber(s: string): number | undefined {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function MealTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
      {["breakfast", "lunch", "dinner", "snack"].map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Main sheet: scan / type a code, then log or save whatever it resolves to.
// ---------------------------------------------------------------------------

export default function BarcodeEntryModal({ open, onClose, initialCode }: { open: boolean; onClose: () => void; initialCode?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<BarcodeLookup | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = useMutation({
    mutationFn: (c: string) => barcodeApi.lookup(c),
    onMutate: () => {
      setResult(null);
      setError(null);
      setBanner(null);
    },
    onSuccess: (data) => setResult(data),
    onError: (e) => setError(errMessage(e)),
  });

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    setBanner(null);
    if (initialCode) {
      setCode(initialCode);
      lookup.mutate(initialCode);
    } else {
      setCode("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCode]);

  const submit = () => {
    if (code.replace(/\D/g, "").length >= 8) lookup.mutate(code);
    else setError("Enter or scan at least 8 digits");
  };

  // After logging, clear the sheet and refocus so the next scan can follow straight away.
  const finished = (message: string) => {
    setBanner(message);
    setResult(null);
    setError(null);
    setCode("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <Modal open={open} onClose={onClose} title="Scan Barcode">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            autoFocus
            inputMode="numeric"
            placeholder="Scan or type UPC / EAN"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || (e.key === "Tab" && code.length >= 8)) {
                e.preventDefault();
                submit();
              }
            }}
            className={clsx(INPUT, "flex-1 tracking-wider")}
          />
          <button onClick={submit} disabled={lookup.isPending} className="flex items-center gap-1 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
            <ScanBarcode size={16} /> {lookup.isPending ? "…" : "Look up"}
          </button>
        </div>

        {banner && (
          <p className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
            <Check size={16} /> {banner} &mdash; scan the next item
          </p>
        )}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20">{error}</p>}

        {result?.found && result.food && <LogFood food={result.food} onDone={finished} />}
        {result?.found && result.supplement && <LogSupplement supplement={result.supplement} onDone={finished} />}
        {result?.found && result.candidate && (
          <NewProductForm
            key={result.code}
            code={result.code}
            initial={result.candidate}
            initialKind={result.kind ?? "food"}
            note={"Found on Open Food Facts — check the numbers, then save. It's kept in your library so the next scan is instant."}
            onDone={finished}
          />
        )}
        {result && !result.found && (
          <NewProductForm
            key={result.code}
            code={result.code}
            initialKind="food"
            note={
              result.lookupUnavailable
                ? "Couldn't reach Open Food Facts right now. Enter it once and it's saved for next time."
                : "Not in Open Food Facts. Enter it once and it's saved for next time."
            }
            onDone={finished}
          />
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Already in the library: just log it.
// ---------------------------------------------------------------------------

function LogFood({ food, onDone }: { food: Food; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [mealType, setMealType] = useState(defaultMealType);
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const log = useMutation({
    mutationFn: () => mealsApi.create({ mealType, items: [{ foodId: food.id, quantity: Number(quantity) || 1 }] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone(`Logged ${food.name}`);
    },
    onError: (e) => setError(errMessage(e)),
  });

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
      <div>
        <p className="font-semibold text-gray-900 dark:text-gray-50">{food.name}</p>
        <p className="text-xs text-gray-400">
          {[food.brand, food.servingSize].filter(Boolean).join(" · ")} &mdash; {Math.round(food.calories)} cal, {Math.round(food.protein)}g protein
          {food.sodium != null ? `, ${Math.round(food.sodium)}mg sodium` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MealTypeSelect value={mealType} onChange={setMealType} />
        <input inputMode="decimal" aria-label="Servings" placeholder="Servings" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={INPUT} />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button disabled={log.isPending} onClick={() => log.mutate()} className={PRIMARY_BTN}>
        {log.isPending ? "Saving…" : "Log meal"}
      </button>
    </div>
  );
}

function LogSupplement({ supplement, onDone }: { supplement: Supplement; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const log = useMutation({
    mutationFn: () => supplementsApi.log(supplement.id, Number(quantity) || 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
      onDone(`Logged ${supplement.name}`);
    },
    onError: (e) => setError(errMessage(e)),
  });

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
      <div>
        <p className="font-semibold text-gray-900 dark:text-gray-50">{supplement.name}</p>
        <p className="text-xs text-gray-400">Supplement{[supplement.brand, supplement.servingSize].filter(Boolean).length ? " · " + [supplement.brand, supplement.servingSize].filter(Boolean).join(" · ") : ""}</p>
      </div>
      <input inputMode="decimal" aria-label="Servings" placeholder="Servings taken" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={INPUT} />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button disabled={log.isPending} onClick={() => log.mutate()} className={PRIMARY_BTN}>
        {log.isPending ? "Saving…" : "Log dose"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unknown barcode (or an Open Food Facts hit): confirm details once, save it
// against the barcode, and optionally log it in the same step.
// ---------------------------------------------------------------------------

function NewProductForm({
  code,
  initial,
  initialKind,
  note,
  onDone,
}: {
  code: string;
  initial?: FoodCandidate;
  initialKind: "food" | "supplement";
  note: string;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<"food" | "supplement">(initialKind);
  const [mealType, setMealType] = useState(defaultMealType);
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: initial?.name ?? "",
    brand: initial?.brand ?? "",
    servingSize: initial?.servingSize ?? "",
    calories: initial ? String(initial.calories) : "",
    protein: initial ? String(initial.protein) : "",
    carbs: initial ? String(initial.carbs) : "",
    fat: initial ? String(initial.fat) : "",
    fiber: initial?.fiber != null ? String(initial.fiber) : "",
    sodium: initial?.sodium != null ? String(initial.sodium) : "",
  });
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = useMutation({
    mutationFn: async (logIt: boolean) => {
      const name = f.name.trim();
      const brand = f.brand.trim() || undefined;
      const qty = Number(quantity) > 0 ? Number(quantity) : 1;

      if (kind === "food") {
        const saved = await barcodeApi.save({
          kind: "food",
          code,
          name,
          brand,
          servingSize: f.servingSize.trim() || "1 serving",
          calories: optionalNumber(f.calories) ?? 0,
          protein: optionalNumber(f.protein) ?? 0,
          carbs: optionalNumber(f.carbs) ?? 0,
          fat: optionalNumber(f.fat) ?? 0,
          fiber: optionalNumber(f.fiber),
          sodium: optionalNumber(f.sodium),
        });
        if (logIt) await mealsApi.create({ mealType, items: [{ foodId: saved.food!.id, quantity: qty }] });
      } else {
        const saved = await barcodeApi.save({ kind: "supplement", code, name, brand, servingSize: f.servingSize.trim() || undefined });
        if (logIt) await supplementsApi.log(saved.supplement!.id, qty);
      }
      return `${logIt ? "Logged" : "Saved"} ${name}`;
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      onDone(message);
    },
    onError: (e) => setError(errMessage(e)),
  });

  const canSave = f.name.trim() !== "" && (kind === "supplement" || f.calories.trim() !== "");

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-gray-200 p-3 dark:border-gray-700">
      <p className="text-xs text-gray-400">{note}</p>

      <div className="flex gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-900">
        {(["food", "supplement"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={clsx("flex-1 rounded-full py-1.5 text-sm font-medium capitalize transition", kind === k ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-50" : "text-gray-500")}
          >
            {k}
          </button>
        ))}
      </div>

      <input placeholder="Name" value={f.name} onChange={set("name")} className={INPUT} />
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Brand (optional)" value={f.brand} onChange={set("brand")} className={INPUT} />
        <input placeholder={kind === "food" ? "Serving size" : "Serving (e.g. 2 softgels)"} value={f.servingSize} onChange={set("servingSize")} className={INPUT} />
      </div>

      {kind === "food" && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-400">Per serving</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["calories", "Calories"],
                ["protein", "Protein g"],
                ["carbs", "Carbs g"],
                ["fat", "Fat g"],
                ["fiber", "Fiber g"],
                ["sodium", "Sodium mg"],
              ] as const
            ).map(([k, label]) => (
              <input key={k} inputMode="decimal" placeholder={label} aria-label={label} value={f[k]} onChange={set(k)} className={SMALL_INPUT} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {kind === "food" ? <MealTypeSelect value={mealType} onChange={setMealType} /> : <div />}
        <input inputMode="decimal" aria-label="Servings" placeholder="Servings" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={INPUT} />
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button disabled={!canSave || save.isPending} onClick={() => save.mutate(true)} className={PRIMARY_BTN}>
        {save.isPending ? "Saving…" : kind === "food" ? "Save & log meal" : "Save & log dose"}
      </button>
      <button disabled={!canSave || save.isPending} onClick={() => save.mutate(false)} className="w-full py-1 text-sm font-medium text-gray-500 disabled:opacity-50">
        Save to library only
      </button>
    </div>
  );
}
