import Link from "next/link";

export default function NotFound() {
  return (
    <div className="login-screen">
      <div className="login-screen-content w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Página no encontrada</h1>
        <p className="text-sm text-slate-500 mt-2">
          La ruta que buscas no existe.
        </p>
        <Link href="/login" className="btn-primary inline-block mt-6">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
