import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, ThumbsUp, TrendingUp, Target } from "lucide-react";
import clsx from "clsx";
import { aiApi } from "../api/endpoints";
import Card from "../components/Card";

const SUGGESTIONS = [
  "Why didn't I lose weight this week?",
  "What should I eat tonight?",
  "Give me a high-protein lunch.",
  "How am I doing this month?",
  "Give me a workout for today.",
];

export default function Coach() {
  const { data: status } = useQuery({ queryKey: ["ai", "status"], queryFn: aiApi.status });
  const { data: today } = useQuery({ queryKey: ["ai", "coach-today"], queryFn: aiApi.today, enabled: status?.enabled !== false });

  return (
    <div className="space-y-4 px-4 pt-4 md:mx-auto md:max-w-3xl md:px-0 md:pt-0">
      <header className="flex items-center gap-2">
        <Sparkles className="text-brand-500" size={22} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">AI Coach</h1>
      </header>

      {status && !status.enabled && (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          The AI Coach is disabled on this server. An administrator can enable it by setting AI_PROVIDER in the backend .env file. Everything else in the app keeps working without it.
        </Card>
      )}

      <Card title="Today's summary">
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">{today?.summary ?? "Log some data today to see a summary here."}</p>
      </Card>

      {today?.recommendations && today.recommendations.length > 0 && (
        <Card title="Today's recommendations">
          <ul className="space-y-2">
            {today.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="mt-0.5 text-brand-500">•</span>
                {r}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PeriodInsightCard type="weekly" icon={<TrendingUp size={16} />} title="Weekly review" />
      <PeriodInsightCard type="monthly" icon={<Target size={16} />} title="Monthly review" />

      <ChatCard enabled={status?.enabled !== false} />
    </div>
  );
}

function PeriodInsightCard({ type, title, icon }: { type: "weekly" | "monthly"; title: string; icon: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: insights } = useQuery({ queryKey: ["ai", "insights", type], queryFn: () => aiApi.insights(type) });
  const latest = insights?.[0];
  const generate = useMutation({
    mutationFn: () => (type === "weekly" ? aiApi.generateWeekly() : aiApi.generateMonthly()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai", "insights", type] }),
  });

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <button onClick={() => generate.mutate()} disabled={generate.isPending} className="text-xs font-semibold text-brand-600 disabled:opacity-50 dark:text-brand-400">
          {generate.isPending ? "Generating…" : latest ? "Refresh" : "Generate"}
        </button>
      </div>
      {latest ? (
        <div className="space-y-2 text-sm">
          <p className="text-gray-700 dark:text-gray-200">{latest.content.summary}</p>
          {latest.content.wins?.length > 0 && (
            <div className="flex items-start gap-1.5">
              <ThumbsUp size={14} className="mt-0.5 shrink-0 text-brand-500" />
              <p className="text-gray-500 dark:text-gray-400">{latest.content.wins.join(" · ")}</p>
            </div>
          )}
          {latest.content.focus && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
              <span className="font-semibold">Focus: </span>
              {latest.content.focus}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No {type} review yet.</p>
      )}
    </Card>
  );
}

function ChatCard({ enabled }: { enabled: boolean }) {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: (message: string) => aiApi.chat(message, conversationId),
    onSuccess: (res) => {
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    },
    onError: (err: Error) => {
      setMessages((m) => [...m, { role: "assistant", content: `Sorry, something went wrong: ${err.message}` }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function submit(text: string) {
    if (!text.trim() || send.isPending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    send.mutate(text);
    setInput("");
  }

  return (
    <Card title="Ask your coach">
      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              disabled={!enabled}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div ref={scrollRef} className="mb-3 max-h-80 space-y-3 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={clsx("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm", m.role === "user" ? "ml-auto bg-brand-600 text-white" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100")}>
              {m.content}
            </div>
          ))}
          {send.isPending && <div className="max-w-[70%] rounded-2xl bg-gray-100 px-3.5 py-2.5 text-sm text-gray-400 dark:bg-gray-800">Thinking…</div>}
        </div>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!enabled}
          placeholder={enabled ? "Ask me anything about your progress…" : "AI coach is disabled"}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
        />
        <button type="submit" disabled={!enabled || send.isPending} className="rounded-xl bg-brand-600 px-4 text-white disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
      <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
        General wellness guidance based on your logged data — not medical advice. Talk to a healthcare professional about medical concerns.
      </p>
    </Card>
  );
}
