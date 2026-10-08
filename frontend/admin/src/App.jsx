import {
  BadgePercent,
  Bell,
  Boxes,
  ChartNoAxesCombined,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  CircleUserRound,
  Clock3,
  FolderTree,
  FileDown,
  LogOut,
  Menu,
  MessageSquareText,
  PackageOpen,
  PackageX,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest, downloadFile } from "./api";
import { useAdminAuth } from "./AuthContext";
import GoogleSignIn from "./GoogleSignIn";
import Modal from "./Modal";
import ProductsWorkspace from "./ProductsWorkspace";
import TablePagination from "./TablePagination";
import usePagination from "./usePagination";


const NAVIGATION = [
  ["dashboard", "Resumen", ChartNoAxesCombined],
  ["orders", "Pedidos", ShoppingBag],
  ["products", "Productos", PackageOpen],
  ["inventory", "Inventario", Boxes],
  ["categories", "Categorías", FolderTree],
  ["customers", "Clientes", Users],
  ["coupons", "Cupones", BadgePercent],
  ["reviews", "Reseñas", MessageSquareText],
  ["reports", "Reportes y auditoría", ScrollText],
];

const ORDER_LABELS = {
  pending_payment: "Pendiente de pago",
  paid: "Aprobado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const ORDER_TRANSITIONS = {
  pending_payment: import.meta.env.DEV ? ["paid", "cancelled"] : ["cancelled"],
  paid: ["preparing", "cancelled", "refunded"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};


function money(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}


function shortDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function useRemote(loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    // Los recursos remotos se sincronizan al montar cada vista.
    // oxlint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  return { data, setData, loading, error, setError, load };
}


function LoadingScreen() {
  return (
    <div className="center-screen">
      <div className="spinner" />
      <p>Validando sesión segura…</p>
    </div>
  );
}


function LoginScreen({ denied = false }) {
  const { logout } = useAdminAuth();
  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand-mark">LH</div>
        <p className="eyebrow">Linen House</p>
        <h1>Administración</h1>
        <p className="login-copy">
          {denied
            ? "La cuenta autenticada no tiene permisos administrativos."
            : "Acceso exclusivo para personal autorizado."}
        </p>
        {denied ? (
          <button className="secondary-button" type="button" onClick={logout}>
            Usar otra cuenta
          </button>
        ) : <GoogleSignIn />}
        <div className="security-note">
          <ShieldCheck size={17} />
          <span>Sesión HttpOnly, autorización por rol y operaciones auditadas.</span>
        </div>
      </section>
    </main>
  );
}


function Notice({ error, success }) {
  if (!error && !success) return null;
  return <div className={error ? "notice error" : "notice success"}>{error || success}</div>;
}


function SectionTitle({ eyebrow, title, description, onRefresh, actions }) {
  return (
    <header className="section-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="title-actions">
        {actions}
        {onRefresh && (
          <button className="icon-button" type="button" onClick={onRefresh} title="Actualizar">
            <RefreshCw size={17} />
          </button>
        )}
      </div>
    </header>
  );
}


function EmptyState({ children = "No hay datos para mostrar." }) {
  return <div className="empty-state">{children}</div>;
}


function OrderNotifications({ onOpenOrders, userId }) {
  const storageKey = `linen-house:admin:${userId}:last-seen-order`;
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [lastSeenId, setLastSeenId] = useState(() => (
    Number(window.localStorage.getItem(storageKey) ?? 0)
  ));

  const refresh = useCallback(async () => {
    try {
      const data = await apiRequest("/admin/orders?limit=12");
      setOrders(data);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    // Mantiene la campana sincronizada sin necesidad de recargar el panel.
    // oxlint-disable-next-line react/set-state-in-effect
    refresh();
    const intervalId = window.setInterval(refresh, 30000);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  const unreadCount = useMemo(
    () => orders.filter((order) => order.id > lastSeenId).length,
    [lastSeenId, orders],
  );

  const markAllRead = () => {
    const newestId = Math.max(lastSeenId, ...orders.map((order) => order.id));
    window.localStorage.setItem(storageKey, String(newestId));
    setLastSeenId(newestId);
  };

  const goToOrders = () => {
    markAllRead();
    setOpen(false);
    onOpenOrders();
  };

  return (
    <div className="order-notifications">
      <button
        aria-expanded={open}
        aria-label={`Notificaciones de pedidos${unreadCount ? `, ${unreadCount} nuevas` : ""}`}
        className={`notification-button ${unreadCount ? "has-unread" : ""}`}
        onClick={() => setOpen((current) => !current)}
        title="Notificaciones de pedidos"
        type="button"
      >
        <Bell size={17} />
        {unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-popover">
          <header>
            <div><strong>Pedidos</strong><span>{unreadCount ? `${unreadCount} sin leer` : "Todo al día"}</span></div>
            {unreadCount > 0 && <button type="button" onClick={markAllRead}><CheckCheck size={14} /> Marcar leídas</button>}
          </header>
          <div className="notification-list">
            {error ? <p className="notification-message error">{error}</p> : !orders.length ? <p className="notification-message">Aún no hay pedidos.</p> : orders.map((order) => (
              <button className={order.id > lastSeenId ? "unread" : ""} key={order.id} onClick={goToOrders} type="button">
                <span className="notification-order-icon"><ShoppingBag size={15} /></span>
                <span><strong>{order.number}</strong><small>{order.customer_first_name} {order.customer_last_name} · {shortDate(order.created_at)}</small></span>
                <span><strong>{money(order.total)}</strong><small>{ORDER_LABELS[order.status]}</small></span>
              </button>
            ))}
          </div>
          <footer><button type="button" onClick={goToOrders}>Ver todos los pedidos <ChevronRight size={14} /></button></footer>
        </div>
      )}
    </div>
  );
}


function DashboardView() {
  const loader = useCallback(async () => {
    const [summary, sales] = await Promise.all([
      apiRequest("/admin/dashboard"),
      apiRequest("/admin/dashboard/sales?days=30"),
    ]);
    return { summary, sales };
  }, []);
  const remote = useRemote(loader);

  if (remote.loading) return <LoadingScreen />;
  const summary = remote.data?.summary;
  const maximum = Math.max(...(remote.data?.sales ?? []).map((item) => Number(item.revenue)), 1);
  const cards = summary ? [
    ["Ventas hoy", money(summary.revenue_today), CircleDollarSign, "tone-green"],
    ["Ventas del mes", money(summary.revenue_month), TrendingUp, "tone-clay"],
    ["Pedidos hoy", summary.orders_today, ShoppingBag, "tone-blue"],
    ["Pedidos por atender", summary.pending_orders, Clock3, "tone-gold"],
    ["Stock bajo", summary.low_stock_variants, Boxes, "tone-gold"],
    ["Agotados", summary.out_of_stock_variants, PackageX, "tone-red"],
    ["Clientes", summary.customers, Users, "tone-green"],
    ["Productos activos", summary.active_products, PackageOpen, "tone-clay"],
  ] : [];

  return (
    <>
      <SectionTitle eyebrow="Operación" title="Resumen de la tienda" description="Información calculada directamente desde pedidos e inventario." onRefresh={remote.load} />
      <Notice error={remote.error} />
      <div className="metrics-grid">
        {cards.map(([label, value, Icon, tone]) => (
          <article className="metric-card" key={label}>
            <div className="metric-card-head"><span className={`overview-icon ${tone}`}><Icon size={18} /></span><span>{label}</span></div><strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="panel chart-panel">
        <div className="panel-heading"><div><h3>Ventas pagadas</h3><p>Últimos 30 días</p></div></div>
        <div className="bar-chart" aria-label="Ventas pagadas de los últimos 30 días">
          {(remote.data?.sales ?? []).map((point) => (
            <div className="bar-column" key={point.date} title={`${point.date}: ${money(point.revenue)}`}>
              <div className="bar" style={{ height: `${Math.max((Number(point.revenue) / maximum) * 100, 2)}%` }} />
              <span>{point.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}


function OrdersView() {
  const loader = useCallback(() => apiRequest("/admin/orders?limit=250"), []);
  const remote = useRemote(loader);
  const pagination = usePagination(remote.data);
  const [selectedId, setSelectedId] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const selected = remote.data?.find((order) => order.id === selectedId) ?? null;

  const selectOrder = (order) => {
    setSelectedId(order.id);
    setNextStatus(ORDER_TRANSITIONS[order.status]?.[0] ?? "");
    setCarrier(order.shipping_carrier ?? "");
    setTracking(order.tracking_number ?? "");
    setNote("");
    setSuccess("");
  };

  const updateOrder = async (event) => {
    event.preventDefault();
    if (!selected || !nextStatus) return;
    setSaving(true);
    remote.setError("");
    try {
      const updated = await apiRequest(`/admin/orders/${selected.id}`, {
        method: "PATCH",
        body: {
          status: nextStatus,
          shipping_carrier: nextStatus === "shipped" ? carrier : null,
          tracking_number: nextStatus === "shipped" ? tracking : null,
          note: note || null,
        },
      });
      remote.setData((orders) => orders.map((item) => item.id === updated.id ? updated : item));
      setNextStatus(ORDER_TRANSITIONS[updated.status]?.[0] ?? "");
      setSuccess("Estado actualizado y registrado en el historial.");
    } catch (requestError) {
      remote.setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle eyebrow="Ventas" title="Pedidos" description="Gestión de pago, preparación, envío y entrega." onRefresh={remote.load} />
      <Notice error={remote.error} success={success} />
      <div className="split-layout">
        <section className="panel table-panel">
          {remote.loading ? <LoadingScreen /> : !remote.data?.length ? <EmptyState>Aún no existen pedidos.</EmptyState> : (
            <><div className="table-scroll"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Estado</th><th>Total</th><th /></tr></thead><tbody>
              {pagination.items.map((order) => (
                <tr key={order.id} className={selectedId === order.id ? "selected-row" : ""}>
                  <td><div className="entity-cell"><span className="table-icon tone-blue"><ShoppingBag size={18} /></span><span><strong>{order.number}</strong><small>{shortDate(order.created_at)}</small></span></div></td>
                  <td>{order.customer_first_name} {order.customer_last_name}<small>{order.customer_email}</small></td>
                  <td><span className={`status status-${order.status}`}>{ORDER_LABELS[order.status]}</span></td>
                  <td>{money(order.total)}</td>
                  <td><button className="row-button" type="button" onClick={() => selectOrder(order)}><ChevronRight size={17} /></button></td>
                </tr>
              ))}
            </tbody></table></div><TablePagination pagination={pagination} /></>
          )}
        </section>
        <aside className="panel detail-panel">
          {!selected ? <EmptyState>Selecciona un pedido para ver su detalle.</EmptyState> : (
            <>
              <div className="panel-heading"><div><p className="eyebrow">{selected.number}</p><h3>{selected.customer_first_name} {selected.customer_last_name}</h3></div><span className={`status status-${selected.status}`}>{ORDER_LABELS[selected.status]}</span></div>
              <dl className="detail-list"><div><dt>Contacto</dt><dd>{selected.customer_email}<br />{selected.customer_phone}</dd></div><div><dt>Entrega</dt><dd>{selected.address}{selected.address_extra ? `, ${selected.address_extra}` : ""}<br />{selected.city}, {selected.department}</dd></div></dl>
              <div className="line-items">{selected.items.map((item) => <div key={item.id}><span>{item.quantity} × {item.product_name}<small>{item.size} · {item.color} · {item.sku}</small></span><strong>{money(item.subtotal)}</strong></div>)}</div>
              <dl className="totals"><div><dt>Subtotal</dt><dd>{money(selected.subtotal)}</dd></div><div><dt>Descuento</dt><dd>− {money(selected.discount_total)}</dd></div><div className="grand-total"><dt>Total</dt><dd>{money(selected.total)}</dd></div></dl>
              {ORDER_TRANSITIONS[selected.status]?.length > 0 && (
                <form className="stack-form" onSubmit={updateOrder}>
                  <label>Siguiente estado<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{ORDER_TRANSITIONS[selected.status].map((item) => <option value={item} key={item}>{ORDER_LABELS[item]}</option>)}</select></label>
                  {nextStatus === "shipped" && <div className="form-grid"><label>Transportadora<input required value={carrier} onChange={(event) => setCarrier(event.target.value)} /></label><label>Número de guía<input required value={tracking} onChange={(event) => setTracking(event.target.value)} /></label></div>}
                  <label>Nota de auditoría<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} required={["paid", "cancelled", "refunded"].includes(nextStatus)} /></label>
                  <button className="primary-button" disabled={saving} type="submit">{saving ? "Guardando…" : "Actualizar estado"}</button>
                </form>
              )}
              <div className="history"><h4>Historial</h4>{selected.history.map((entry) => <div key={entry.id}><span className="history-dot" /><p><strong>{ORDER_LABELS[entry.to_status]}</strong><small>{shortDate(entry.created_at)}{entry.note ? ` · ${entry.note}` : ""}</small></p></div>)}</div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}


function InventoryView() {
  const loader = useCallback(() => apiRequest("/admin/inventory"), []);
  const remote = useRemote(loader);
  const pagination = usePagination(remote.data);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("stock-in");
  const [success, setSuccess] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest(`/admin/inventory/${selected.variant_id}/${action}`, {
        method: "POST",
        body: action === "adjust"
          ? { stock: Number(form.get("quantity")), reason: form.get("reason") }
          : { quantity: Number(form.get("quantity")), reason: form.get("reason") || null },
      });
      setSuccess("Movimiento registrado correctamente.");
      setSelected(null);
      await remote.load();
    } catch (requestError) { remote.setError(requestError.message); }
  };

  return <><SectionTitle eyebrow="Operación" title="Inventario" description="Cada cambio genera un movimiento auditable." onRefresh={remote.load} /><Notice error={remote.error} success={success} /><section className="panel table-panel">{remote.loading ? <LoadingScreen /> : <><div className="table-scroll"><table className="professional-table"><thead><tr><th>Producto</th><th>Variante</th><th>SKU</th><th>Stock</th><th>Alerta</th><th /></tr></thead><tbody>{pagination.items.map((item) => <tr key={item.variant_id}><td><div className="entity-cell"><span className="table-icon tone-blue"><Boxes size={18} /></span><span><strong>{item.product_name}</strong><small>Variante #{item.variant_id}</small></span></div></td><td><strong>{item.size} · {item.color}</strong></td><td><code className="table-code">{item.sku}</code></td><td><strong>{item.stock}</strong><small>Mínimo {item.minimum_stock}</small></td><td>{item.out_of_stock ? <span className="status status-cancelled"><span className="status-dot" />Agotado</span> : item.low_stock ? <span className="status status-pending_payment"><span className="status-dot" />Stock bajo</span> : <span className="status status-active"><span className="status-dot" />Normal</span>}</td><td><button className="secondary-button compact" type="button" onClick={() => setSelected(item)}>Registrar movimiento</button></td></tr>)}</tbody></table></div><TablePagination pagination={pagination} /></>}</section>{selected && <Modal eyebrow="Movimiento de inventario" title={selected.product_name} description={`${selected.size} · ${selected.color} · Stock actual: ${selected.stock}`} onClose={() => setSelected(null)} size="small"><form className="stack-form" onSubmit={submit}><label>Tipo de movimiento<select value={action} onChange={(event) => setAction(event.target.value)}><option value="stock-in">Entrada de unidades</option><option value="stock-out">Salida de unidades</option><option value="adjust">Ajuste absoluto</option></select></label><label>{action === "adjust" ? "Nuevo stock" : "Cantidad"}<input name="quantity" type="number" min={action === "adjust" ? 0 : 1} required /></label><label>Motivo<textarea name="reason" required={action === "adjust"} minLength={3} maxLength={1000} rows={3} placeholder="Explica el origen del movimiento…" /></label><footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setSelected(null)}>Cancelar</button><button className="primary-button" type="submit">Registrar movimiento</button></footer></form></Modal>}</>;
}


function CategoriesView() {
  const loader = useCallback(() => apiRequest("/admin/categories"), []);
  const remote = useRemote(loader);
  const pagination = usePagination(remote.data);
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const create = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { await apiRequest("/admin/categories", { method: "POST", body: { name: form.get("name"), description: form.get("description") || null } }); setShowCreate(false); setSuccess("Categoría creada."); await remote.load(); }
    catch (requestError) { remote.setError(requestError.message); }
  };
  const toggle = async (category) => {
    try { await apiRequest(`/admin/categories/${category.id}`, { method: "PUT", body: { active: !category.active } }); await remote.load(); }
    catch (requestError) { remote.setError(requestError.message); }
  };
  return <><SectionTitle eyebrow="Catálogo" title="Categorías" description="Organiza la navegación y presentación pública de tus productos." onRefresh={remote.load} actions={<button className="primary-button compact with-icon" type="button" onClick={() => setShowCreate(true)}><FolderTree size={15} /> Nueva categoría</button>} /><Notice error={remote.error} success={success} /><section className="panel table-panel">{remote.loading ? <LoadingScreen /> : <><div className="table-scroll"><table className="professional-table"><thead><tr><th>Categoría</th><th>Identificador</th><th>Estado</th><th /></tr></thead><tbody>{pagination.items.map((category) => <tr key={category.id}><td><div className="entity-cell"><span className="table-icon tone-clay"><FolderTree size={18} /></span><span><strong>{category.name}</strong><small>{category.description || "Sin descripción"}</small></span></div></td><td><code className="table-code">{category.slug}</code></td><td><span className={`status ${category.active ? "status-active" : "status-cancelled"}`}><span className="status-dot" />{category.active ? "Activa" : "Inactiva"}</span></td><td><button className="secondary-button compact" type="button" onClick={() => toggle(category)}>{category.active ? "Desactivar" : "Activar"}</button></td></tr>)}</tbody></table></div><TablePagination pagination={pagination} /></>}</section>{showCreate && <Modal eyebrow="Catálogo" title="Nueva categoría" description="Crea una agrupación clara para que los clientes encuentren tus productos." onClose={() => setShowCreate(false)} size="small"><form className="stack-form" onSubmit={create}><label>Nombre<input name="name" required minLength={2} maxLength={100} placeholder="Ej. Cubrelechos" /></label><label>Descripción<textarea name="description" rows={4} maxLength={1000} placeholder="Describe qué productos pertenecen aquí…" /></label><footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setShowCreate(false)}>Cancelar</button><button className="primary-button" type="submit">Crear categoría</button></footer></form></Modal>}</>;
}


function CustomersView() {
  const loader = useCallback(() => apiRequest("/admin/customers?limit=250"), []);
  const remote = useRemote(loader);
  const pagination = usePagination(remote.data);
  return <><SectionTitle eyebrow="Relaciones" title="Clientes" description="Información mínima necesaria para atención y pedidos." onRefresh={remote.load} /><Notice error={remote.error} /><section className="panel table-panel">{remote.loading ? <LoadingScreen /> : !remote.data?.length ? <EmptyState>No hay clientes registrados.</EmptyState> : <><div className="table-scroll"><table className="professional-table"><thead><tr><th>Cliente</th><th>Correo</th><th>Pedidos</th><th>Total comprado</th><th>Último acceso</th><th>Estado</th></tr></thead><tbody>{pagination.items.map((customer) => <tr key={customer.id}><td><div className="entity-cell"><span className="table-icon tone-green"><CircleUserRound size={18} /></span><span><strong>{customer.first_name} {customer.last_name ?? ""}</strong><small>{customer.phone || "Sin teléfono"}</small></span></div></td><td>{customer.email}</td><td><strong>{customer.orders_count}</strong></td><td><strong>{money(customer.total_spent)}</strong></td><td>{shortDate(customer.last_login_at)}</td><td><span className={`status ${customer.is_active ? "status-active" : "status-cancelled"}`}><span className="status-dot" />{customer.is_active ? "Activo" : "Bloqueado"}</span></td></tr>)}</tbody></table></div><TablePagination pagination={pagination} /></>}</section></>;
}


function CouponsView() {
  const loader = useCallback(() => apiRequest("/admin/coupons"), []);
  const remote = useRemote(loader);
  const pagination = usePagination(remote.data);
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const create = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      await apiRequest("/admin/coupons", { method: "POST", body: { code: form.get("code"), description: form.get("description") || null, discount_type: form.get("discount_type"), value: Number(form.get("value")), minimum_subtotal: Number(form.get("minimum_subtotal") || 0), maximum_discount: form.get("maximum_discount") ? Number(form.get("maximum_discount")) : null, starts_at: form.get("starts_at") || null, ends_at: form.get("ends_at") || null, usage_limit: form.get("usage_limit") ? Number(form.get("usage_limit")) : null, per_user_limit: Number(form.get("per_user_limit") || 1), active: form.get("active") === "on" } });
      setShowCreate(false); setSuccess("Cupón creado."); await remote.load();
    } catch (requestError) { remote.setError(requestError.message); }
  };
  const toggle = async (coupon) => {
    try { await apiRequest(`/admin/coupons/${coupon.id}`, { method: "PATCH", body: { active: !coupon.active } }); await remote.load(); }
    catch (requestError) { remote.setError(requestError.message); }
  };
  return <><SectionTitle eyebrow="Promociones" title="Cupones" description="Configura reglas, vigencias y límites con validación del servidor." onRefresh={remote.load} actions={<button className="primary-button compact with-icon" type="button" onClick={() => setShowCreate(true)}><BadgePercent size={15} /> Nuevo cupón</button>} /><Notice error={remote.error} success={success} /><section className="panel table-panel">{remote.loading ? <LoadingScreen /> : !remote.data?.length ? <EmptyState>No hay cupones.</EmptyState> : <><div className="table-scroll"><table className="professional-table"><thead><tr><th>Cupón</th><th>Descuento</th><th>Vigencia</th><th>Usos</th><th>Estado</th><th /></tr></thead><tbody>{pagination.items.map((coupon) => <tr key={coupon.id}><td><div className="entity-cell"><span className="table-icon tone-gold"><BadgePercent size={18} /></span><span><strong>{coupon.code}</strong><small>{coupon.description || "Sin descripción"}</small></span></div></td><td><strong>{coupon.discount_type === "percent" ? `${coupon.value}%` : money(coupon.value)}</strong><small>Compra mín. {money(coupon.minimum_subtotal)}</small></td><td>{coupon.starts_at ? shortDate(coupon.starts_at) : "Desde ahora"}<small>{coupon.ends_at ? `Hasta ${shortDate(coupon.ends_at)}` : "Sin vencimiento"}</small></td><td><strong>{coupon.used_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""}</strong><small>{coupon.per_user_limit} por cliente</small></td><td><span className={`status ${coupon.active ? "status-active" : "status-cancelled"}`}><span className="status-dot" />{coupon.active ? "Activo" : "Inactivo"}</span></td><td><button className="secondary-button compact" type="button" onClick={() => toggle(coupon)}>{coupon.active ? "Desactivar" : "Activar"}</button></td></tr>)}</tbody></table></div><TablePagination pagination={pagination} /></>}</section>{showCreate && <Modal eyebrow="Promociones" title="Nuevo cupón" description="Define el beneficio y sus límites operativos." onClose={() => setShowCreate(false)} size="medium"><form className="stack-form" onSubmit={create}><div className="form-grid"><label>Código<input name="code" required minLength={3} maxLength={50} pattern="[A-Za-z0-9_-]+" placeholder="BIENVENIDA15" /></label><label>Tipo<select name="discount_type"><option value="percent">Porcentaje</option><option value="fixed">Valor fijo</option></select></label><label>Valor<input name="value" type="number" min="1" step="1" required /></label><label>Compra mínima<input name="minimum_subtotal" type="number" min="0" step="100" defaultValue="0" /></label><label>Descuento máximo<input name="maximum_discount" type="number" min="1" step="100" /></label><label>Límite total<input name="usage_limit" type="number" min="1" /></label><label>Usos por cliente<input name="per_user_limit" type="number" min="1" defaultValue="1" /></label><label>Inicio<input name="starts_at" type="datetime-local" /></label><label>Finalización<input name="ends_at" type="datetime-local" /></label></div><label>Descripción<input name="description" maxLength={255} placeholder="Beneficio para primera compra" /></label><label className="switch-label"><input name="active" type="checkbox" defaultChecked /><span className="switch" /><span><strong>Cupón activo</strong><small>Podrá aplicarse dentro de su vigencia.</small></span></label><footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setShowCreate(false)}>Cancelar</button><button className="primary-button" type="submit">Crear cupón</button></footer></form></Modal>}</>;
}


function ReviewsView() {
  const loader = useCallback(() => apiRequest("/admin/reviews"), []);
  const remote = useRemote(loader);
  const pagination = usePagination(remote.data);
  const moderate = async (review, status) => {
    try {
      const updated = await apiRequest(`/admin/reviews/${review.id}`, {
        method: "PATCH",
        body: { status },
      });
      remote.setData((reviews) => reviews.map((item) => (
        item.id === updated.id ? updated : item
      )));
    } catch (requestError) {
      remote.setError(requestError.message);
    }
  };
  return <><SectionTitle eyebrow="Comunidad" title="Reseñas" description="Moderación de opiniones asociadas únicamente a compras entregadas." onRefresh={remote.load} /><Notice error={remote.error} /><section className="panel table-panel">{remote.loading ? <LoadingScreen /> : !remote.data?.length ? <EmptyState>No hay reseñas pendientes.</EmptyState> : <><div className="table-scroll"><table className="professional-table"><thead><tr><th>Cliente</th><th>Calificación</th><th>Reseña</th><th>Estado</th><th /></tr></thead><tbody>{pagination.items.map((review) => <tr key={review.id}><td><div className="entity-cell"><span className="table-icon tone-gold"><MessageSquareText size={18} /></span><span><strong>{review.customer_name}</strong><small>{shortDate(review.created_at)}</small></span></div></td><td><span className="rating-stars">{"★".repeat(review.rating)}<i>{"★".repeat(5 - review.rating)}</i></span></td><td><strong>{review.title || "Sin título"}</strong><small>{review.body}</small></td><td><span className={`status ${review.status === "approved" ? "status-active" : review.status === "rejected" ? "status-cancelled" : "status-pending_payment"}`}><span className="status-dot" />{review.status}</span></td><td><div className="title-actions"><button className="text-button" type="button" onClick={() => moderate(review, "approved")}>Aprobar</button><button className="text-button danger-text" type="button" onClick={() => moderate(review, "rejected")}>Rechazar</button></div></td></tr>)}</tbody></table></div><TablePagination pagination={pagination} /></>}</section></>;
}


function ReportsView() {
  const loader = useCallback(() => apiRequest("/admin/audit-logs?limit=200"), []);
  const remote = useRemote(loader);
  const pagination = usePagination(remote.data);
  const [downloadError, setDownloadError] = useState("");
  const download = async (path, filename) => {
    setDownloadError("");
    try { await downloadFile(path, filename); }
    catch (requestError) { setDownloadError(requestError.message); }
  };
  return <><SectionTitle eyebrow="Control" title="Reportes y auditoría" description="Exportaciones operativas y registro inmutable de mutaciones administrativas." onRefresh={remote.load} /><Notice error={remote.error || downloadError} /><div className="metrics-grid report-actions"><button className="metric-card report-card" type="button" onClick={() => download("/admin/reports/sales.csv", "linen-house-ventas.csv")}><span className="overview-icon tone-green"><FileDown size={20} /></span><span>Descargar CSV</span><strong>Ventas</strong></button><button className="metric-card report-card" type="button" onClick={() => download("/admin/reports/inventory.csv", "linen-house-inventario.csv")}><span className="overview-icon tone-blue"><FileDown size={20} /></span><span>Descargar CSV</span><strong>Inventario</strong></button></div><section className="panel table-panel audit-table">{remote.loading ? <LoadingScreen /> : !remote.data?.length ? <EmptyState>Aún no hay operaciones registradas.</EmptyState> : <><div className="table-scroll"><table className="professional-table"><thead><tr><th>Operación</th><th>Usuario</th><th>Método</th><th>Ruta</th><th>Resultado</th><th>Request ID</th></tr></thead><tbody>{pagination.items.map((entry) => <tr key={entry.id}><td><div className="entity-cell"><span className="table-icon tone-slate"><ScrollText size={18} /></span><span><strong>{shortDate(entry.created_at)}</strong><small>Registro #{entry.id}</small></span></div></td><td>{entry.user_id ?? "No autenticado"}</td><td><code className="method-code">{entry.method}</code></td><td><small>{entry.path}</small></td><td><span className={`status ${entry.status_code < 400 ? "status-active" : "status-cancelled"}`}><span className="status-dot" />{entry.status_code}</span></td><td><code className="table-code">{entry.request_id}</code></td></tr>)}</tbody></table></div><TablePagination pagination={pagination} /></>}</section></>;
}


function AdminShell() {
  const { user, logout } = useAdminAuth();
  const [active, setActive] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentLabel = NAVIGATION.find(([id]) => id === active)?.[1];
  const view = useMemo(() => ({
    dashboard: <DashboardView />,
    orders: <OrdersView />,
    products: <ProductsWorkspace />,
    inventory: <InventoryView />,
    categories: <CategoriesView />,
    customers: <CustomersView />,
    coupons: <CouponsView />,
    reviews: <ReviewsView />,
    reports: <ReportsView />,
  })[active], [active]);

  return (
    <div className="admin-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark small">LH</div>
          <div><strong>Linen House</strong><span>Operations studio</span></div>
          <button className="mobile-close" type="button" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        <p className="nav-label">Espacio de trabajo</p>
        <nav>{NAVIGATION.map(([id, label, Icon]) => <button className={active === id ? "active" : ""} type="button" key={id} onClick={() => { setActive(id); setMobileOpen(false); }}><span className="nav-icon"><Icon size={17} /></span><span>{label}</span>{active === id && <ChevronRight className="nav-arrow" size={14} />}</button>)}</nav>
        <div className="sidebar-security"><ShieldCheck size={17} /><div><strong>Entorno protegido</strong><span>Acceso y acciones auditadas</span></div></div>
        <div className="sidebar-user">
          <span className="user-avatar" aria-hidden="true">
            {user.first_name?.slice(0, 1)}{user.last_name?.slice(0, 1)}
          </span>
          <div className="sidebar-user-copy">
            <strong>{user.first_name} {user.last_name ?? ""}</strong>
            <span>{user.email}</span>
          </div>
          <button className="sidebar-logout" type="button" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <div className="workspace">
        <header className="topbar">
          <button className="menu-button" type="button" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="topbar-breadcrumb"><span>Administración</span><ChevronRight size={13} /><strong>{currentLabel}</strong></div>
          <div className="topbar-actions">
            <OrderNotifications userId={user.id} onOpenOrders={() => setActive("orders")} />
            <div className="secure-session"><span className="online-dot" /><ShieldCheck size={15} /> Sesión protegida</div>
          </div>
        </header>
        <main className="workspace-content">{view}</main>
      </div>
    </div>
  );
}


export default function App() {
  const { user, loading } = useAdminAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (user.role !== "admin") return <LoginScreen denied />;
  return <AdminShell />;
}
