"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";

export default function CajeroLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/cajero-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al entrar.");
      router.push("/cajero");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-screen cajero-login-screen">
      <div className="admin-login-bg" aria-hidden>
        <AiVisual src={ART.loginBg} alt="" fill sizes="100vw" />
      </div>
      <div className="admin-login-content w-full max-w-sm">
        <div className="text-center mb-8">
          <AiVisual
            src={ART.logo}
            alt="La Dicha"
            width={72}
            height={72}
            className="mx-auto rounded-2xl mb-4"
          />
          <h1 className="text-xl font-bold text-white">Panel Cajero</h1>
          <p className="text-sm text-slate-300 mt-1">Ventanilla y recargas</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 shadow-xl space-y-4"
        >
          <input
            type="text"
            placeholder="Usuario cajero"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200"
            autoComplete="current-password"
          />
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[52px] rounded-xl bg-[#1e3a5f] text-white font-bold"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-4">
          <a href="/login" className="underline hover:text-slate-200">
            Volver al login de jugadores
          </a>
        </p>
      </div>
    </div>
  );
}
