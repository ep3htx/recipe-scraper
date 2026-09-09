import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2, Moon, Footprints } from "lucide-react";
import { weightApi, vitalsApi, waterApi, exerciseApi, sleepApi, stepsApi } from "../api/endpoints";
import Card from "../components/Card";
import QuickActionButtons from "../components/QuickActionButtons";
import QuickLogSheet, { type QuickLogType } from "../components/quickLog/QuickLogSheet";

export default function Log() {
  const [quickLog, setQuickLog] = useState<QuickLogType | null>(null);
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries();

  const weights = useQuery({ queryKey: ["weight", "list"], queryFn: () => weightApi.list() });
  const bp = useQuery({ queryKey: ["vitals", "bp", "list"], queryFn: () => vitalsApi.listBloodPressure() });
  const water = useQuery({ queryKey: ["water", "today"], queryFn: waterApi.today });
  const workouts = useQuery({ queryKey: ["exercise", "list"], queryFn: () => exerciseApi.list() });

  const deleteWeight = useMutation({ mutationFn: weightApi.remove, onSuccess: invalidate });
  const deleteBP = useMutation({ mutationFn: vitalsApi.removeBloodPressure, onSuccess: invalidate });
  const deleteWater = useMutation({ mutationFn: waterApi.remove, onSuccess: invalidate });
  const deleteWorkout = useMutation({ mutationFn: exerciseApi.remove, onSuccess: invalidate });

  const today = format(new Date(), "yyyy-MM-dd");
  const [sleepHours, setSleepHours] = useState("");
  const [stepsCount, setStepsCount] = useState("");
  const saveSleep = useMutation({ mutationFn: () => sleepApi.set(today, Number(sleepHours)), onSuccess: invalidate });
  const saveSteps = useMutation({ mutationFn: () => stepsApi.set(today, Number(stepsCount)), onSuccess: invalidate });

  return (
    <div className="space-y-5 px-4 pt-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Log</h1>
        <p className="text-sm text-gray-400">Quick entries — as few taps as possible.</p>
      </header>

      <QuickActionButtons onSelect={setQuickLog} />

      <Card>
        <div className="grid grid-cols-2 gap-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (sleepHours) saveSleep.mutate();
            }}
          >
            <Moon size={16} className="shrink-0 text-gray-400" />
            <input
              inputMode="decimal"
              placeholder="Sleep (hrs)"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </form>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (stepsCount) saveSteps.mutate();
            }}
          >
            <Footprints size={16} className="shrink-0 text-gray-400" />
            <input
              inputMode="numeric"
              placeholder="Steps today"
              value={stepsCount}
              onChange={(e) => setStepsCount(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </form>
        </div>
      </Card>

      <LogSection title="Weight">
        {weights.data?.length ? (
          weights.data.slice(0, 8).map((w) => (
            <LogRow key={w.id} onDelete={() => deleteWeight.mutate(w.id)}>
              <span className="font-medium">{w.weight} lbs</span>
              {w.bodyFatPct ? <span className="text-gray-400"> · {w.bodyFatPct}% BF</span> : null}
              <DateLabel date={w.recordedAt} />
            </LogRow>
          ))
        ) : (
          <EmptyRow />
        )}
      </LogSection>

      <LogSection title="Blood Pressure">
        {bp.data?.length ? (
          bp.data.slice(0, 8).map((r) => (
            <LogRow key={r.id} onDelete={() => deleteBP.mutate(r.id)}>
              <span className="font-medium">
                {r.systolic}/{r.diastolic}
              </span>
              {r.pulse ? <span className="text-gray-400"> · {r.pulse} bpm</span> : null}
              {r.flags?.some((f) => f.outOfRange) && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">outside your range</span>}
              <DateLabel date={r.recordedAt} />
            </LogRow>
          ))
        ) : (
          <EmptyRow />
        )}
      </LogSection>

      <LogSection title="Water today">
        {water.data?.entries.length ? (
          water.data.entries.map((w) => (
            <LogRow key={w.id} onDelete={() => deleteWater.mutate(w.id)}>
              <span className="font-medium">{w.amountOz} oz</span>
              <DateLabel date={w.recordedAt} />
            </LogRow>
          ))
        ) : (
          <EmptyRow />
        )}
      </LogSection>

      <LogSection title="Workouts">
        {workouts.data?.length ? (
          workouts.data.slice(0, 8).map((w) => (
            <LogRow key={w.id} onDelete={() => deleteWorkout.mutate(w.id)}>
              <span className="font-medium capitalize">{w.type.replace(/_/g, " ")}</span>
              {w.durationMinutes ? <span className="text-gray-400"> · {w.durationMinutes} min</span> : null}
              <DateLabel date={w.startedAt} />
            </LogRow>
          ))
        ) : (
          <EmptyRow />
        )}
      </LogSection>

      <QuickLogSheet type={quickLog} onClose={() => setQuickLog(null)} />
    </div>
  );
}

function LogSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">{title}</h2>
      <Card className="divide-y divide-gray-100 p-0 dark:divide-gray-800">{children}</Card>
    </section>
  );
}

function LogRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <div>{children}</div>
      <button onClick={onDelete} className="rounded-full p-1.5 text-gray-300 hover:bg-gray-100 hover:text-rose-500 dark:hover:bg-gray-800" aria-label="Delete">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function DateLabel({ date }: { date: string }) {
  return <span className="ml-1.5 text-xs text-gray-400">{format(new Date(date), "MMM d, h:mm a")}</span>;
}

function EmptyRow() {
  return <div className="px-4 py-5 text-center text-sm text-gray-400">Nothing logged yet.</div>;
}
