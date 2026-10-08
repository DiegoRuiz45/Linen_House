import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, PackageOpen, UserRound } from "lucide-react";

import Header from "../components/layout/Header";
import { useAuth } from "../context/useAuth";


const API_URL = (
  import.meta.env.VITE_API_URL
  ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

const STATUS_LABELS = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};


function formatPrice(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}


async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "No fue posible completar la operación.",
    );
  }
  return data;
}


export default function Account() {
  const { user, loading, completeLogin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }
    Promise.all([
      request("/orders"),
      request("/notifications"),
    ])
      .then(([orderData, notificationData]) => {
        setOrders(orderData);
        setNotifications(notificationData);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setOrdersLoading(false));
  }, [user]);

  const updateProfile = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    try {
      const updated = await request("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: form.get("first_name"),
          last_name: form.get("last_name") || null,
          phone: form.get("phone") || null,
        }),
      });
      completeLogin(updated);
      setSuccess("Perfil actualizado.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-linen"><Header /><main className="grid min-h-[600px] place-items-center font-body text-sm text-coffee/60">Cargando cuenta…</main></div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-linen"><Header /><main className="grid min-h-[600px] place-items-center px-6 text-center"><div><UserRound className="mx-auto text-terracotta" size={34} /><h1 className="mt-5 font-display text-4xl text-charcoal">Inicia sesión</h1><p className="mt-3 font-body text-sm text-coffee/65">Usa el acceso del encabezado para consultar tu perfil y pedidos.</p><Link className="mt-7 inline-flex rounded-full bg-terracotta px-6 py-3 font-body text-xs font-semibold text-white" to="/">Volver al inicio</Link></div></main></div>;
  }

  return (
    <div className="min-h-screen bg-linen">
      <Header />
      <main className="mx-auto w-full max-w-[1320px] px-6 pb-24 pt-12 lg:px-12">
        <p className="font-body text-[10px] font-semibold uppercase tracking-[.2em] text-terracotta">Mi cuenta</p>
        <h1 className="mt-2 font-display text-[clamp(38px,5vw,58px)] text-charcoal">Hola, {user.first_name}</h1>
        {(error || success) && <div className={`mt-6 rounded-xl p-4 font-body text-xs ${error ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{error || success}</div>}
        {notifications.length > 0 && <section className="mt-8 rounded-2xl border border-black/10 bg-white/45 p-5"><div className="mb-4 flex items-center gap-3"><Bell className="text-terracotta" size={19} /><h2 className="font-display text-2xl text-charcoal">Novedades</h2></div><div className="grid gap-2 sm:grid-cols-2">{notifications.slice(0, 6).map((notification) => <article className={`rounded-xl border p-4 ${notification.read_at ? "border-black/5 bg-transparent" : "border-terracotta/20 bg-terracotta/[.05]"}`} key={notification.id}><strong className="font-body text-xs text-charcoal">{notification.title}</strong><p className="mt-1 font-body text-[11px] leading-relaxed text-coffee/65">{notification.message}</p><small className="mt-2 block font-body text-[9px] text-coffee/45">{new Date(notification.created_at).toLocaleString("es-CO")}</small></article>)}</div></section>}
        <div className="mt-10 grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="h-fit rounded-2xl border border-black/10 bg-white/45 p-6">
            <div className="mb-6 flex items-center gap-3"><UserRound className="text-terracotta" size={21} /><h2 className="font-display text-2xl text-charcoal">Perfil</h2></div>
            <form className="grid gap-4" onSubmit={updateProfile}>
              <label className="font-body text-[11px] text-coffee">Nombre<input className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-3 text-sm text-charcoal outline-none focus:border-terracotta" name="first_name" required defaultValue={user.first_name} /></label>
              <label className="font-body text-[11px] text-coffee">Apellido<input className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-3 text-sm text-charcoal outline-none focus:border-terracotta" name="last_name" defaultValue={user.last_name ?? ""} /></label>
              <label className="font-body text-[11px] text-coffee">Teléfono<input className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-3 text-sm text-charcoal outline-none focus:border-terracotta" name="phone" type="tel" defaultValue={user.phone ?? ""} /></label>
              <label className="font-body text-[11px] text-coffee">Correo<input className="mt-2 w-full cursor-not-allowed rounded-lg border border-black/10 bg-black/[.03] px-3 py-3 text-sm text-coffee/60" disabled value={user.email} /></label>
              <button className="mt-2 rounded-full bg-terracotta px-5 py-3 font-body text-xs font-semibold text-white hover:bg-terracotta-dark" type="submit">Guardar perfil</button>
            </form>
          </section>
          <section>
            <div className="mb-5 flex items-center gap-3"><PackageOpen className="text-terracotta" size={22} /><h2 className="font-display text-3xl text-charcoal">Mis pedidos</h2></div>
              {ordersLoading ? <div className="rounded-2xl border border-black/10 bg-white/40 p-10 text-center font-body text-sm text-coffee/60">Cargando pedidos…</div> : orders.length === 0 ? <div className="rounded-2xl border border-black/10 bg-white/40 p-10 text-center"><p className="font-body text-sm text-coffee/60">Todavía no tienes pedidos.</p><Link className="mt-5 inline-flex rounded-full border border-terracotta px-5 py-2.5 font-body text-xs font-semibold text-terracotta" to="/productos">Ver productos</Link></div> : <div className="grid gap-4">{orders.map((order) => <article className="rounded-2xl border border-black/10 bg-white/45 p-5 sm:p-6" key={order.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-body text-[10px] uppercase tracking-[.14em] text-coffee/50">{order.number}</p><h3 className="mt-1 font-display text-xl text-charcoal">{STATUS_LABELS[order.status]}</h3><p className="mt-1 font-body text-[10px] text-coffee/55">{new Date(order.created_at).toLocaleString("es-CO")}</p></div><strong className="font-display text-xl text-charcoal">{formatPrice(order.total)}</strong></div><div className="mt-5 border-t border-black/10 pt-4">{order.items.map((item) => <div className="flex justify-between gap-4 py-2 font-body text-xs" key={item.id}><span>{item.quantity} × {item.product_name}<small className="ml-2 text-coffee/50">{item.size} · {item.color}</small></span><span>{formatPrice(item.subtotal)}</span></div>)}</div>{order.tracking_number && <p className="mt-4 rounded-lg bg-linen-dark/50 p-3 font-body text-xs text-coffee">{order.shipping_carrier}: <strong>{order.tracking_number}</strong></p>}</article>)}</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
