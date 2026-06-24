"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";

type UserRow = {
  id: string;
  username: string;
  fullName: string;
  phone: string | null;
  role: string;
  active: boolean;
  balance: number | null;
};

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    phone: "",
    role: "JUGADOR",
    password: "1234",
    initialBalance: "0",
  });
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        initialBalance: Number(form.initialBalance) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Error");
      return;
    }
    setMsg("Usuario creado.");
    setForm({ username: "", fullName: "", phone: "", role: "JUGADOR", password: "1234", initialBalance: "0" });
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    load();
  }

  async function changePassword(user: UserRow) {
    const password = window.prompt(
      `Nueva contraseña para ${user.username}:`,
      ""
    );
    if (password === null) return;
    if (password.trim().length < 4) {
      setMsg("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    setMsg("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, password: password.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "No se pudo cambiar la contraseña.");
      return;
    }
    setMsg(`Contraseña actualizada para ${user.username}.`);
  }

  return (
    <div>
      <h1 className="admin-page-title">Usuarios</h1>

      <form className="staff-form" onSubmit={createUser}>
        <h2 className="admin-subtitle">Crear usuario</h2>
        <div className="admin-settings-grid">
          <label className="admin-field">
            <span>Usuario</span>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </label>
          <label className="admin-field">
            <span>Nombre</span>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </label>
          <label className="admin-field">
            <span>Teléfono</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="admin-field">
            <span>Rol</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="staff-select">
              <option value="JUGADOR">Jugador</option>
              <option value="CAJERO">Cajero</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Contraseña</span>
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="admin-field">
            <span>Saldo inicial</span>
            <input type="number" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} />
          </label>
        </div>
        <button type="submit" className="admin-save-btn">Crear</button>
        {msg && <p className="admin-save-msg">{msg}</p>}
      </form>

      <h2 className="admin-subtitle">Listado</h2>
      {loading ? (
        <p className="admin-loading">Cargando…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.fullName}</td>
                  <td>{u.role}</td>
                  <td>{u.balance != null ? formatMoney(u.balance) : "—"}</td>
                  <td>{u.active ? "Activo" : "Inactivo"}</td>
                  <td className="admin-table-actions">
                    <button
                      type="button"
                      className="staff-link-btn"
                      onClick={() => changePassword(u)}
                    >
                      Cambiar clave
                    </button>
                    <button type="button" className="staff-link-btn" onClick={() => toggleActive(u.id, u.active)}>
                      {u.active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
