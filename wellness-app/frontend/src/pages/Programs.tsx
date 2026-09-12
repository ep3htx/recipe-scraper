import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, CheckCircle2, Search, Clock } from "lucide-react";
import clsx from "clsx";
import { programsApi, exerciseLibraryApi } from "../api/endpoints";
import type { WorkoutProgram, WorkoutProgramDay, Exercise } from "../api/types";
import Card from "../components/Card";
import Modal from "../components/Modal";

const TABS = ["Programs", "Exercise Library"] as const;
type Tab = (typeof TABS)[number];

export default function Programs() {
  const [tab, setTab] = useState<Tab>("Programs");

  return (
    <div className="space-y-4 px-4 pt-4 md:px-0 md:pt-0">
      <header className="flex items-center gap-2">
        <Dumbbell className="text-brand-500" size={22} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Workout Programs</h1>
      </header>

      <div className="flex gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-900 md:w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition md:flex-none",
              tab === t ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-50" : "text-gray-500"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Programs" ? <ProgramsTab /> : <ExerciseLibraryTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Programs: today's workout, browse/enroll, and a week x day board
// ---------------------------------------------------------------------------

function ProgramsTab() {
  const queryClient = useQueryClient();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [viewDay, setViewDay] = useState<WorkoutProgramDay | null>(null);

  const { data: today } = useQuery({ queryKey: ["programs", "active"], queryFn: programsApi.activeEnrollment });
  const { data: programsData } = useQuery({ queryKey: ["programs"], queryFn: () => programsApi.list() });
  const { data: selectedProgram } = useQuery({
    queryKey: ["programs", selectedProgramId],
    queryFn: () => programsApi.get(selectedProgramId!),
    enabled: !!selectedProgramId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["programs"] });
  };

  const enroll = useMutation({ mutationFn: (id: string) => programsApi.enroll(id), onSuccess: invalidateAll });
  const stop = useMutation({ mutationFn: programsApi.stopActive, onSuccess: invalidateAll });
  const complete = useMutation({ mutationFn: () => programsApi.completeToday(), onSuccess: invalidateAll });

  return (
    <div className="space-y-4">
      {today?.day && (
        <Card className="border-brand-200 dark:border-brand-900">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Week {today.enrollment.currentWeek} · Day {today.enrollment.currentDay}
              </p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{today.day.title}</h3>
            </div>
            <button onClick={() => stop.mutate()} className="text-xs text-gray-400 hover:text-rose-500">
              Stop program
            </button>
          </div>
          <ul className="space-y-1.5">
            {today.day.exercises.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-200">{ex.exerciseName}</span>
                <span className="text-xs text-gray-400">
                  {ex.sets ? `${ex.sets} x ${ex.reps ?? `${ex.durationSeconds}s`}` : ex.durationSeconds ? `${ex.durationSeconds}s` : ""}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => complete.mutate()}
            disabled={complete.isPending}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> {complete.isPending ? "Saving…" : "Mark today's workout complete"}
          </button>
        </Card>
      )}

      <div>
        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">Browse programs</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programsData?.programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              isActive={programsData.activeProgramId === program.id}
              selected={selectedProgramId === program.id}
              onSelect={() => setSelectedProgramId(selectedProgramId === program.id ? null : program.id)}
              onEnroll={() => enroll.mutate(program.id)}
              enrolling={enroll.isPending}
            />
          ))}
        </div>
      </div>

      {selectedProgram && (
        <ProgramBoard program={selectedProgram} onViewDay={setViewDay} />
      )}

      <Modal open={!!viewDay} onClose={() => setViewDay(null)} title={viewDay?.title ?? ""}>
        {viewDay?.notes && <p className="mb-3 text-sm text-gray-500">{viewDay.notes}</p>}
        <ul className="space-y-2">
          {viewDay?.exercises.map((ex) => (
            <li key={ex.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
              <span className="text-gray-700 dark:text-gray-200">{ex.exerciseName}</span>
              <span className="text-xs text-gray-400">
                {ex.sets ? `${ex.sets} sets x ${ex.reps ?? `${ex.durationSeconds}s`}` : ex.durationSeconds ? `${ex.durationSeconds}s` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}

function ProgramCard({
  program,
  isActive,
  selected,
  onSelect,
  onEnroll,
  enrolling,
}: {
  program: WorkoutProgram;
  isActive: boolean;
  selected: boolean;
  onSelect: () => void;
  onEnroll: () => void;
  enrolling: boolean;
}) {
  return (
    <Card className={clsx("space-y-2", selected && "ring-2 ring-brand-400")}>
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-50">{program.name}</h3>
        {isActive && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">Active</span>}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{program.description}</p>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">{program.difficulty}</span>
        <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <Clock size={10} /> {program.durationWeeks}w x {program.daysPerWeek}d
        </span>
        {program.equipment.map((eq) => (
          <span key={eq} className="rounded-full bg-gray-100 px-2 py-0.5 capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {eq.replace(/_/g, " ")}
          </span>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSelect} className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
          {selected ? "Hide board" : "View board"}
        </button>
        {!isActive && (
          <button
            onClick={onEnroll}
            disabled={enrolling}
            className="flex-1 rounded-lg bg-brand-600 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Start
          </button>
        )}
      </div>
    </Card>
  );
}

function ProgramBoard({ program, onViewDay }: { program: WorkoutProgram; onViewDay: (day: WorkoutProgramDay) => void }) {
  const days = program.days ?? [];
  const weeks = Array.from(new Set(days.map((d) => d.weekNumber))).sort((a, b) => a - b);
  const dayNumbers = Array.from({ length: program.daysPerWeek }, (_, i) => i + 1);

  return (
    <Card title={`${program.name} — full schedule`}>
      <div className="overflow-x-auto">
        <div className="grid gap-2" style={{ gridTemplateColumns: `70px repeat(${program.daysPerWeek}, minmax(120px, 1fr))` }}>
          <div />
          {dayNumbers.map((d) => (
            <div key={d} className="text-center text-xs font-bold uppercase tracking-wide text-gray-400">
              Day {d}
            </div>
          ))}
          {weeks.map((week) => (
            <Fragment key={week}>
              <div className="flex items-center text-xs font-semibold text-gray-500">
                Week {week}
              </div>
              {dayNumbers.map((dayNumber) => {
                const day = days.find((d) => d.weekNumber === week && d.dayNumber === dayNumber);
                return (
                  <button
                    key={`${week}-${dayNumber}`}
                    onClick={() => day && onViewDay(day)}
                    disabled={!day}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-2 text-left text-xs hover:border-brand-300 disabled:opacity-30 dark:border-gray-800 dark:bg-gray-800/50"
                  >
                    {day ? (
                      <>
                        <p className="font-semibold text-gray-700 dark:text-gray-200">{day.title}</p>
                        <p className="text-gray-400">{day.exercises.length} exercises</p>
                      </>
                    ) : (
                      <span className="text-gray-300">Rest</span>
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Exercise library browser
// ---------------------------------------------------------------------------

const CATEGORIES = ["bodyweight", "strength", "resistance_bands", "kettlebells", "mobility"];

function ExerciseLibraryTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercise-library", search, category],
    queryFn: () => exerciseLibraryApi.search({ search: search || undefined, category: category ?? undefined }),
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategory(null)}
          className={clsx("rounded-full px-3 py-1 text-xs font-medium", category === null ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300")}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={clsx("rounded-full px-3 py-1 text-xs font-medium capitalize", category === c ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300")}
          >
            {c.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {exercises?.map((ex) => <ExerciseCard key={ex.id} exercise={ex} />)}
          {exercises?.length === 0 && <p className="col-span-full py-8 text-center text-sm text-gray-400">No exercises match.</p>}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Card className="space-y-1">
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{exercise.name}</h4>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] capitalize text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {exercise.category.replace(/_/g, " ")}
        </span>
      </div>
      {exercise.description && <p className="text-xs text-gray-500 dark:text-gray-400">{exercise.description}</p>}
      <div className="flex gap-1.5 text-[10px] text-gray-400">
        {exercise.muscleGroup && <span className="capitalize">{exercise.muscleGroup}</span>}
        {exercise.equipment && exercise.equipment !== "none" && <span>· {exercise.equipment}</span>}
      </div>
    </Card>
  );
}
