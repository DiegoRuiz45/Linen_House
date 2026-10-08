import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Clock3,
  CreditCard,
  House,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  Star,
  Truck,
  XCircle,
} from "lucide-react";

import Header from "../components/layout/Header";
import { useAuth } from "../context/useAuth";

const API_URL = (
  import.meta.env.VITE_API_URL
  ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

const STATUS_LABELS = {
  pending_payment: "Pendiente de pago",
  paid: "Pago confirmado",
  preparing: "Preparando tu pedido",
  shipped: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const ORDER_STEPS = [
  { status: "pending_payment", label: "Recibido", icon: Clock3 },
  { status: "paid", label: "Pago confirmado", icon: CreditCard },
  { status: "preparing", label: "Preparando", icon: PackageCheck },
  { status: "shipped", label: "En camino", icon: Truck },
  { status: "delivered", label: "Entregado", icon: House },
];

function formatPrice(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function uniqueOrderProducts(items) {
  const products = new Map();
  for (const item of items) {
    if (!products.has(item.product_id)) {
      products.set(item.product_id, item);
    }
  }
  return [...products.values()];
}

async function getOrders(signal) {
  const response = await fetch(`${API_URL}/orders`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "No fue posible consultar tus pedidos.",
    );
  }

  return Array.isArray(data) ? data : [];
}

function OrderProgress({ status }) {
  if (status === "cancelled" || status === "refunded") {
    const Icon = status === "cancelled" ? XCircle : RotateCcw;
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-terracotta/20 bg-terracotta/[0.06] p-4 text-terracotta">
        <Icon size={20} />
        <div>
          <strong className="block font-body text-xs">{STATUS_LABELS[status]}</strong>
          <span className="font-body text-[11px] text-coffee/65">
            Si necesitas ayuda, comunícate con Linen House.
          </span>
        </div>
      </div>
    );
  }

  const currentIndex = Math.max(
    ORDER_STEPS.findIndex((step) => step.status === status),
    0,
  );

  return (
    <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-5">
      {ORDER_STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        const current = index === currentIndex;
        const Icon = step.icon;

        return (
          <div className="relative" key={step.status}>
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-[20px] hidden h-px w-full sm:block ${
                  reached ? "bg-terracotta" : "bg-black/10"
                }`}
              />
            )}
            <div className="relative z-10 flex items-center gap-3 sm:flex-col sm:text-center">
              <span className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border transition-colors ${
                reached
                  ? "border-terracotta bg-terracotta text-white"
                  : "border-black/10 bg-linen text-coffee/40"
              }`}>
                {reached && !current
                  ? <Check size={17} />
                  : <Icon size={17} />}
              </span>
              <span className={`font-body text-[10px] font-semibold ${
                reached ? "text-charcoal" : "text-coffee/45"
              }`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Orders() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "customer") {
      return undefined;
    }

    const controller = new AbortController();

    getOrders(controller.signal)
      .then(setOrders)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [user]);

  if (authLoading) {
    return <div className="min-h-screen bg-linen"><Header /><main className="grid min-h-[600px] place-items-center font-body text-sm text-coffee/60">Consultando tu sesión…</main></div>;
  }

  if (!user || user.role !== "customer") {
    return (
      <div className="min-h-screen bg-linen">
        <Header />
        <main className="grid min-h-[600px] place-items-center px-6 text-center">
          <div>
            <PackageOpen className="mx-auto text-terracotta" size={38} />
            <h1 className="mt-5 font-display text-4xl text-charcoal">Consulta tus pedidos</h1>
            <p className="mx-auto mt-3 max-w-md font-body text-sm leading-relaxed text-coffee/65">
              Inicia sesión como cliente para visualizar el estado y seguimiento de tus compras.
            </p>
            <Link className="mt-7 inline-flex rounded-full bg-terracotta px-6 py-3 font-body text-xs font-semibold text-white" to="/">
              Volver al inicio
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen">
      <Header />
      <main className="mx-auto w-full max-w-[1240px] px-6 pb-24 pt-12 lg:px-12">
        <div className="flex flex-col justify-between gap-5 border-b border-black/10 pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="font-body text-[10px] font-semibold uppercase tracking-[.2em] text-terracotta">Seguimiento</p>
            <h1 className="mt-2 font-display text-[clamp(38px,5vw,58px)] leading-none text-charcoal">Mis pedidos</h1>
            <p className="mt-3 font-body text-sm text-coffee/65">Revisa en qué etapa se encuentra cada compra.</p>
          </div>
          <Link className="inline-flex h-11 items-center justify-center rounded-full border border-terracotta px-5 font-body text-xs font-semibold text-terracotta transition-colors hover:bg-terracotta hover:text-white" to="/productos">
            Seguir comprando
          </Link>
        </div>

        {error && <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-4 font-body text-xs text-red-800">{error}</div>}

        {loading ? (
          <div className="mt-8 rounded-3xl border border-black/10 bg-white/40 p-14 text-center font-body text-sm text-coffee/60">Cargando tus pedidos…</div>
        ) : orders.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-black/10 bg-white/45 p-14 text-center">
            <PackageOpen className="mx-auto text-terracotta" size={36} />
            <h2 className="mt-5 font-display text-3xl text-charcoal">Aún no tienes pedidos</h2>
            <p className="mt-2 font-body text-sm text-coffee/60">Cuando realices una compra podrás seguirla desde aquí.</p>
            <Link className="mt-6 inline-flex rounded-full bg-terracotta px-6 py-3 font-body text-xs font-semibold text-white" to="/productos">Explorar productos</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6">
            {orders.map((order) => (
              <article className="overflow-hidden rounded-3xl border border-black/[0.08] bg-white/50 shadow-[0_18px_55px_rgba(65,47,34,0.06)]" key={order.id}>
                <div className="flex flex-col justify-between gap-4 border-b border-black/[0.07] px-6 py-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-body text-[10px] uppercase tracking-[.15em] text-coffee/50">Pedido {order.number}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-2xl text-charcoal">{STATUS_LABELS[order.status] ?? order.status}</h2>
                      <span className="rounded-full bg-terracotta/10 px-3 py-1 font-body text-[10px] font-semibold text-terracotta">Actualizado {formatDate(order.updated_at)}</span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <strong className="block font-display text-2xl text-charcoal">{formatPrice(order.total)}</strong>
                    <span className="font-body text-[10px] text-coffee/50">Realizado {formatDate(order.created_at)}</span>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <OrderProgress status={order.status} />

                  <div className="mt-8 grid gap-3 border-t border-black/[0.07] pt-5">
                    {order.items.map((item) => (
                      <div className="flex items-center justify-between gap-4 rounded-2xl bg-linen/70 p-4" key={item.id}>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-terracotta/[0.08] text-terracotta"><PackageOpen size={17} /></span>
                          <div className="min-w-0">
                            <strong className="block truncate font-body text-xs text-charcoal">{item.quantity} × {item.product_name}</strong>
                            <span className="font-body text-[10px] text-coffee/55">{item.size} · {item.color}</span>
                          </div>
                        </div>
                        <strong className="shrink-0 font-body text-xs text-charcoal">{formatPrice(item.subtotal)}</strong>
                      </div>
                    ))}
                  </div>

                  {order.status === "delivered" && (
                    <div className="mt-5 rounded-2xl border border-terracotta/20 bg-terracotta/[0.06] p-5">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-terracotta">
                          <Star size={18} />
                        </span>
                        <div>
                          <strong className="font-display text-xl text-charcoal">¿Cómo fue tu compra?</strong>
                          <p className="mt-1 font-body text-xs leading-relaxed text-coffee/65">
                            Ya recibiste el pedido. Cuéntanos tu experiencia con los productos.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {uniqueOrderProducts(order.items).map((item) => (
                          <Link
                            className="rounded-full bg-terracotta px-4 py-2 font-body text-[10px] font-semibold text-white transition hover:bg-terracotta/90"
                            key={item.product_id}
                            to={"/productos/" + item.product_slug + "#resenas"}
                          >
                            Reseñar {item.product_name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.tracking_number && (
                    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-terracotta/15 bg-terracotta/[0.05] p-4 font-body text-xs text-coffee">
                      <Truck className="text-terracotta" size={18} />
                      <span>{order.shipping_carrier || "Transportadora"}</span>
                      <strong className="rounded-full bg-white/70 px-3 py-1 text-charcoal">{order.tracking_number}</strong>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Orders;
