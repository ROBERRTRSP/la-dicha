"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";

export default function LoginPage() {
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al entrar.");
      router.push("/jugar");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-screen-bg" aria-hidden>
        <AiVisual src={ART.loginBg} alt="" fill sizes="100vw" />
      </div>

      <div className="login-screen-content w-full max-w-sm">
        <div className="text-center mb-8">
          <AiVisual
            src={ART.logo}
            alt="La Dicha"
            width={120}
            height={120}
            className="mx-auto rounded-2xl mb-4 login-logo"
            priority
          />
          <h1 className="text-2xl font-bold text-[#1e3a5f]">La Dicha</h1>
          <p className="text-sm text-slate-500 mt-1">
            Suerte clara. Jugada segura.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="login-form-card bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
        >
          <div>
            <label className="text-sm font-semibold text-[#1e3a5f]">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mt-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:border-[#0d9488] outline-none"
              placeholder="Tu usuario"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#1e3a5f]">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:border-[#0d9488] outline-none"
              placeholder="••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          ¿No tienes cuenta? Pide a tu cajero que te cree una.
        </p>
        <p className="text-center text-xs text-slate-400 mt-3">
          <a href="/cajero/login" className="underline hover:text-slate-600">
            Acceso cajero
          </a>
          {" · "}
          <a href="/admin/login" className="underline hover:text-slate-600">
            Acceso administrador
          </a>
        </p>
        <p className="text-center text-xs text-slate-300 mt-2">
          Demo: usuario <strong>demo</strong> · clave <strong>1234</strong>
        </p>
      </div>
    </div>
  );
}
