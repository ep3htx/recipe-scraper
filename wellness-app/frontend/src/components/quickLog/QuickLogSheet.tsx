import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import { weightApi, vitalsApi, waterApi, exerciseApi, stepsApi, measurementsApi } from "../../api/endpoints";
import { format } from "date-fns";

export type QuickLogType = "weight" | "bp" | "water" | "workout" | "steps" | "heartrate" | "measurements";

const TITLES: Record<QuickLogType, string> = {
  weight: "Log Weight",
  bp: "Log Blood Pressure",
  water: "Log Water",
  workout: "Log Workout",
  steps: "Log Steps",
  heartrate: "Log Resting Heart Rate",
  measurements: "Log Body Measurements",
};

const WORKOUT_TYPES = ["walking", "running", "cycling", "strength", "resistance_bands", "kettlebells", "bodyweight", "sports", "mobility"];

export default function QuickLogSheet({ type, onClose }: { type: QuickLogType | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries();

  return (
    <Modal open={type !== null} onClose={onClose} title={type ? TITLES[type] : ""}>
      {type === "weight" && <WeightForm onDone={() => (invalidate(), onClose())} />}
      {type === "bp" && <BPForm onDone={() => (invalidate(), onClose())} />}
      {type === "water" && <WaterForm onDone={() => (invalidate(), onClose())} />}
      {type === "workout" && <WorkoutForm onDone={() => (invalidate(), onClose())} />}
      {type === "steps" && <StepsForm onDone={() => (invalidate(), onClose())} />}
      {type === "heartrate" && <HeartRateForm onDone={() => (invalidate(), onClose())} />}
      {type === "measurements" && <MeasurementsForm onDone={() => (invalidate(), onClose())} />}
    </Modal>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{children}</label>;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-base text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-xl bg-brand-600 py-3 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

function WeightForm({ onDone }: { onDone: () => void }) {
  const [weight, setWeight] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const mutation = useMutation({
    mutationFn: () => weightApi.create({ weight: Number(weight), bodyFatPct: bodyFatPct ? Number(bodyFatPct) : undefined }),
    onSuccess: onDone,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div>
        <FieldLabel>Weight (lbs)</FieldLabel>
        <input required autoFocus inputMode="decimal" className={inputClass} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="238.6" />
      </div>
      <div>
        <FieldLabel>Body fat % (optional)</FieldLabel>
        <input inputMode="decimal" className={inputClass} value={bodyFatPct} onChange={(e) => setBodyFatPct(e.target.value)} placeholder="24.5" />
      </div>
      <SaveButton pending={mutation.isPending} />
    </form>
  );
}

function BPForm({ onDone }: { onDone: () => void }) {
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const mutation = useMutation({
    mutationFn: () => vitalsApi.createBloodPressure({ systolic: Number(systolic), diastolic: Number(diastolic), pulse: pulse ? Number(pulse) : undefined }),
    onSuccess: onDone,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Systolic</FieldLabel>
          <input required autoFocus inputMode="numeric" className={inputClass} value={systolic} onChange={(e) => setSystolic(e.target.value)} placeholder="120" />
        </div>
        <div>
          <FieldLabel>Diastolic</FieldLabel>
          <input required inputMode="numeric" className={inputClass} value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder="80" />
        </div>
      </div>
      <div>
        <FieldLabel>Pulse (optional)</FieldLabel>
        <input inputMode="numeric" className={inputClass} value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="72" />
      </div>
      <SaveButton pending={mutation.isPending} />
    </form>
  );
}

function WaterForm({ onDone }: { onDone: () => void }) {
  const mutation = useMutation({
    mutationFn: (amountOz: number) => waterApi.create(amountOz),
    onSuccess: onDone,
  });
  const [custom, setCustom] = useState("");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[8, 12, 16, 20, 24, 32].map((oz) => (
          <button
            key={oz}
            onClick={() => mutation.mutate(oz)}
            className="rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 active:scale-[0.97] dark:border-gray-700 dark:text-gray-200"
          >
            +{oz} oz
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom) mutation.mutate(Number(custom));
        }}
      >
        <input inputMode="decimal" className={inputClass} placeholder="Custom amount (oz)" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button type="submit" className="rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">
          Add
        </button>
      </form>
    </div>
  );
}

function WorkoutForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState("walking");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [notes, setNotes] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      exerciseApi.create({
        type,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        caloriesBurned: caloriesBurned ? Number(caloriesBurned) : undefined,
        notes: notes || undefined,
      }),
    onSuccess: onDone,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div>
        <FieldLabel>Type</FieldLabel>
        <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
          {WORKOUT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Duration (min)</FieldLabel>
          <input inputMode="numeric" className={inputClass} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="25" />
        </div>
        <div>
          <FieldLabel>Calories</FieldLabel>
          <input inputMode="numeric" className={inputClass} value={caloriesBurned} onChange={(e) => setCaloriesBurned(e.target.value)} placeholder="180" />
        </div>
      </div>
      <div>
        <FieldLabel>Notes (optional)</FieldLabel>
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resistance band circuit" />
      </div>
      <SaveButton pending={mutation.isPending} />
    </form>
  );
}


function StepsForm({ onDone }: { onDone: () => void }) {
  const [steps, setSteps] = useState("");
  const mutation = useMutation({
    mutationFn: () => stepsApi.set(format(new Date(), "yyyy-MM-dd"), Number(steps)),
    onSuccess: onDone,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div>
        <FieldLabel>Steps today</FieldLabel>
        <input required autoFocus inputMode="numeric" className={inputClass} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="8000" />
      </div>
      <SaveButton pending={mutation.isPending} />
    </form>
  );
}

function HeartRateForm({ onDone }: { onDone: () => void }) {
  const [bpm, setBpm] = useState("");
  const mutation = useMutation({
    mutationFn: () => vitalsApi.create({ restingHeartRate: Number(bpm) }),
    onSuccess: onDone,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div>
        <FieldLabel>Resting heart rate (bpm)</FieldLabel>
        <input required autoFocus inputMode="numeric" className={inputClass} value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="62" />
      </div>
      <SaveButton pending={mutation.isPending} />
    </form>
  );
}


function MeasurementsForm({ onDone }: { onDone: () => void }) {
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [hips, setHips] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      measurementsApi.create({
        waist: waist ? Number(waist) : undefined,
        chest: chest ? Number(chest) : undefined,
        hips: hips ? Number(hips) : undefined,
      }),
    onSuccess: onDone,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div>
        <FieldLabel>Waist (in)</FieldLabel>
        <input required autoFocus inputMode="decimal" className={inputClass} value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="34.5" />
      </div>
      <div>
        <FieldLabel>Chest (in, optional)</FieldLabel>
        <input inputMode="decimal" className={inputClass} value={chest} onChange={(e) => setChest(e.target.value)} placeholder="42" />
      </div>
      <div>
        <FieldLabel>Hips (in, optional)</FieldLabel>
        <input inputMode="decimal" className={inputClass} value={hips} onChange={(e) => setHips(e.target.value)} placeholder="40" />
      </div>
      <SaveButton pending={mutation.isPending} />
    </form>
  );
}
