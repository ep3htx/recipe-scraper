import { useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 px-6 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Heart size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Wellness</h1>
          <p className="text-sm text-gray-400">Your private, self-hosted wellness dashboard</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button type="submit" disabled={pending} className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-gray-400"
        >
          {mode === "login" ? "First time here? Create an account" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
