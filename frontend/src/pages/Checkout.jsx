import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CreditCard,
  LockKeyhole,
  MapPin,
  Minus,
  NotebookPen,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";

import Header from "../components/layout/Header";
import { useAuth } from "../context/useAuth";
import { useCart } from "../context/useCart";
import "./Checkout.css";

const API_URL = (
  import.meta.env.VITE_API_URL
  ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");
const PAYMENT_TEST_MODE = import.meta.env.DEV;

const DELIVERY_DAYS = [
  { value: "weekday", title: "Entre semana", detail: "Lunes a viernes", short: "L–V" },
  { value: "saturday", title: "Sábado", detail: "Entrega en fin de semana", short: "SÁB" },
  { value: "sunday", title: "Domingo", detail: "Entrega dominical", short: "DOM" },
];

const DELIVERY_WINDOWS = [
  { value: "morning", title: "En la mañana", detail: "8:00 a. m. – 12:00 p. m." },
  { value: "afternoon", title: "En la tarde", detail: "12:00 p. m. – 6:00 p. m." },
  { value: "all_day", title: "Todo el día", detail: "8:00 a. m. – 6:00 p. m." },
];

const EMPTY_FORM = {
  firstName: null,
  lastName: null,
  email: null,
  phone: null,
  department: "",
  city: "",
  address: "",
  addressExtra: "",
  postalCode: "",
  deliveryDay: "",
  deliveryWindow: "",
  couponCode: "",
  notes: "",
};

function formatPrice(price) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
}

const CHECKOUT_FIELD_LABELS = {
  idempotency_key: "Identificador del intento",
  first_name: "Nombre",
  last_name: "Apellido",
  email: "Correo electrónico",
  phone: "Teléfono",
  department: "Departamento",
  city: "Ciudad",
  address: "Dirección",
  address_extra: "Complemento de dirección",
  postal_code: "Código postal",
  notes: "Notas",
  coupon_code: "Cupón",
};

function getCheckoutErrorMessage(data, status) {
  if (typeof data?.detail === "string") return data.detail;

  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => {
      const field = item?.loc?.at(-1);
      const label = CHECKOUT_FIELD_LABELS[field] ?? "Dato enviado";
      if (item?.type === "string_too_short") {
        return `${label}: usa al menos ${item.ctx?.min_length ?? "más"} caracteres.`;
      }
      if (item?.type === "string_too_long") {
        return `${label}: usa máximo ${item.ctx?.max_length ?? "menos"} caracteres.`;
      }
      if (field === "email") return `${label}: ingresa un correo válido.`;
      return `${label}: ${String(item?.msg ?? "valor inválido").replace(/^Value error,\s*/i, "")}.`;
    }).join(" ");
  }

  return status === 422
    ? "Revisa los datos de contacto, entrega o el cupón e inténtalo de nuevo."
    : "No fue posible crear el pedido de prueba.";
}


async function createTestOrder(payload) {
  const response = await fetch(`${API_URL}/orders`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getCheckoutErrorMessage(data, response.status));
  }
  return data;
}

function Checkout() {
  const navigate = useNavigate();
  const {
    cartItems,
    subtotal,
    removeFromCart,
    refreshCart,
    updateQuantity,
  } = useCart();
  const { user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const checkoutAttemptKey = useRef(null);

  const checkoutData = {
    ...formData,
    firstName: formData.firstName ?? user?.first_name ?? "",
    lastName: formData.lastName ?? user?.last_name ?? "",
    email: user?.email ?? formData.email ?? "",
    phone: formData.phone ?? user?.phone ?? "",
  };
  const selectedDeliveryDay = DELIVERY_DAYS.find(
    (option) => option.value === formData.deliveryDay,
  );
  const selectedDeliveryWindow = DELIVERY_WINDOWS.find(
    (option) => option.value === formData.deliveryWindow,
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: "" }));
    }
    if (submitError) setSubmitError("");
  };

  const validateCustomerData = () => {
    const nextErrors = {};

    const firstName = checkoutData.firstName.trim();
    const lastName = checkoutData.lastName.trim();
    const email = checkoutData.email.trim();
    const phone = checkoutData.phone.trim();
    const department = formData.department.trim();
    const city = formData.city.trim();
    const address = formData.address.trim();
    const couponCode = formData.couponCode.trim();

    if (!firstName) nextErrors.firstName = "Ingresa tu nombre.";
    else if (firstName.length > 100) nextErrors.firstName = "Usa máximo 100 caracteres.";
    if (!lastName) nextErrors.lastName = "Ingresa tu apellido.";
    else if (lastName.length > 100) nextErrors.lastName = "Usa máximo 100 caracteres.";
    if (!email) {
      nextErrors.email = "Ingresa tu correo.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Ingresa un correo válido.";
    }
    if (phone.replace(/\D/g, "").length < 7) {
      nextErrors.phone = "Ingresa un teléfono válido.";
    } else if (phone.length > 30) {
      nextErrors.phone = "Usa máximo 30 caracteres.";
    }
    if (department.length < 2) {
      nextErrors.department = "Ingresa al menos 2 caracteres.";
    }
    if (city.length < 2) nextErrors.city = "Ingresa al menos 2 caracteres.";
    if (address.length < 3) nextErrors.address = "Ingresa al menos 3 caracteres.";
    if (couponCode.length > 50) nextErrors.couponCode = "Usa máximo 50 caracteres.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateDeliveryAvailability = () => {
    const nextErrors = {};
    if (!formData.deliveryDay) {
      nextErrors.deliveryDay = "Selecciona un día disponible para recibir el pedido.";
    }
    if (!formData.deliveryWindow) {
      nextErrors.deliveryWindow = "Selecciona una franja horaria.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToStep = (step) => {
    setCurrentStep(step);
    setSubmitError("");
    requestAnimationFrame(() => {
      document
        .getElementById("checkout-step-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (currentStep === 1) {
      if (!validateCustomerData()) return;
      if (!user) {
        setSubmitError(
          "Inicia sesión con Google desde el encabezado para continuar.",
        );
        return;
      }
      goToStep(2);
      return;
    }

    if (currentStep === 2 && validateDeliveryAvailability()) {
      goToStep(3);
      return;
    }

    if (currentStep === 3) {
      setSubmitting(true);
      try {
        if (!checkoutAttemptKey.current) {
          checkoutAttemptKey.current = globalThis.crypto.randomUUID();
        }
        const deliveryPreference = (
          `Preferencia de entrega: ${selectedDeliveryDay?.title}, `
          + `${selectedDeliveryWindow?.title}.`
        );
        const order = await createTestOrder({
          idempotency_key: checkoutAttemptKey.current,
          first_name: checkoutData.firstName.trim(),
          last_name: checkoutData.lastName.trim(),
          email: checkoutData.email.trim(),
          phone: checkoutData.phone.trim(),
          department: formData.department.trim(),
          city: formData.city.trim(),
          address: formData.address.trim(),
          address_extra: formData.addressExtra.trim() || null,
          postal_code: formData.postalCode.trim() || null,
          notes: [formData.notes.trim(), deliveryPreference]
            .filter(Boolean)
            .join("\n")
            .slice(0, 2000),
          coupon_code: formData.couponCode.trim() || null,
        });
        await refreshCart();
        navigate(`/mis-pedidos?creado=${encodeURIComponent(order.number)}`, {
          replace: true,
        });
      } catch (requestError) {
        setSubmitError(requestError.message);
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen w-full bg-linen">
        <Header />
        <main className="grid min-h-[680px] place-items-center px-6 py-16 text-center">
          <div className="max-w-[520px]">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-terracotta/20 bg-terracotta/[0.07] text-terracotta">
              <ShoppingBag size={25} strokeWidth={1.7} />
            </span>
            <h1 className="mt-6 font-display text-[clamp(38px,5vw,54px)] leading-tight text-charcoal">
              Tu carrito está vacío
            </h1>
            <p className="mx-auto mt-4 max-w-[420px] font-body text-[14px] leading-7 text-coffee/65">
              Elige tus productos favoritos para comenzar una compra segura.
            </p>
            <Link
              to="/productos"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-terracotta px-7 font-body text-[12px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-dark"
            >
              Explorar productos
              <ChevronRight size={15} />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="checkout-page min-h-screen w-full bg-linen">
      <Header />

      <main className="checkout-shell mx-auto w-full max-w-[1360px] px-[clamp(20px,5vw,72px)] pb-24 pt-8 sm:pt-10">
        <Link
          to="/productos"
          className="checkout-back inline-flex items-center gap-2 font-body text-[11px] font-medium text-coffee/60 transition-colors hover:text-terracotta"
        >
          <ArrowLeft size={15} />
          Seguir comprando
        </Link>

        <header className="checkout-hero mt-7 flex flex-col gap-8 border-b border-black/[0.07] pb-9 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-body text-[10px] font-semibold uppercase tracking-[.22em] text-terracotta">
              Compra segura
            </p>
            <h1 className="checkout-title mt-2 font-display text-[clamp(42px,5vw,62px)] leading-none text-charcoal">
              Finaliza tu compra
            </h1>
            <p className="checkout-intro mt-4 max-w-[540px] font-body text-[13px] leading-6 text-coffee/60">
              Revisa tus productos y completa la información de entrega.
            </p>
          </div>

          <ol className="checkout-steps flex max-w-[430px] items-center gap-2" aria-label="Pasos del checkout">
            {["Datos", "Entrega", "Pago"].map((step, index) => (
              <li className={`${currentStep === index + 1 ? "is-active" : ""} ${currentStep > index + 1 ? "is-complete" : ""}`} key={step}>
                <button
                  type="button"
                  disabled={index + 1 > currentStep}
                  onClick={() => index + 1 < currentStep && goToStep(index + 1)}
                  aria-current={currentStep === index + 1 ? "step" : undefined}
                >
                  <span>{currentStep > index + 1 ? <Check size={12} /> : index + 1}</span>
                  <span>{step}</span>
                </button>
                {index < 2 && <span className="h-px w-4 bg-black/10 sm:w-7" />}
              </li>
            ))}
          </ol>
        </header>

        <div className="checkout-layout mt-9 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-12">
          <form className="checkout-form space-y-5" onSubmit={handleSubmit} noValidate>
            <section id="checkout-step-panel" className="checkout-form-card">
              {currentStep === 1 && (
                <>
                  <CheckoutFormBlock
                    number="01"
                    icon={CircleUserRound}
                    title="Información de contacto"
                    description="Datos de la persona que recibirá el pedido."
                  >
                    {!authLoading && user ? (
                      <div className="checkout-account">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt="Foto de la cuenta"
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-terracotta/10 text-terracotta">
                            <CircleUserRound size={19} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-body text-[11px] font-semibold text-charcoal">Datos completados con tu cuenta de Google</p>
                          <p className="mt-1 truncate font-body text-[10px] text-coffee/55">{user.email}</p>
                        </div>
                        <Check className="ml-auto shrink-0 text-terracotta" size={17} />
                      </div>
                    ) : !authLoading ? (
                      <div className="checkout-account checkout-account--guest">
                        <CircleUserRound className="shrink-0 text-terracotta" size={18} />
                        <p className="font-body text-[11px] leading-5 text-coffee/65">
                          Inicia sesión con Google desde el encabezado para completar automáticamente tus datos.
                        </p>
                      </div>
                    ) : null}

                    <div className="checkout-fields">
                      <InputField label="Nombre" name="firstName" value={checkoutData.firstName} onChange={handleChange} error={errors.firstName} placeholder="Tu nombre" autoComplete="given-name" required />
                      <InputField label="Apellido" name="lastName" value={checkoutData.lastName} onChange={handleChange} error={errors.lastName} placeholder="Tu apellido" autoComplete="family-name" required />
                      <InputField label="Correo electrónico" name="email" type="email" value={checkoutData.email} onChange={handleChange} error={errors.email} placeholder="correo@ejemplo.com" autoComplete="email" readOnly={Boolean(user?.email)} hint={user?.email ? "Correo verificado con Google" : undefined} required />
                      <InputField label="Teléfono" name="phone" type="tel" value={checkoutData.phone} onChange={handleChange} error={errors.phone} placeholder="300 000 0000" autoComplete="tel" inputMode="tel" required />
                    </div>
                  </CheckoutFormBlock>

                  <CheckoutFormBlock
                    number="Destino"
                    icon={MapPin}
                    title="Dirección de entrega"
                    description="Indica dónde deseas recibir tu compra en Colombia."
                  >
                    <div className="checkout-fields">
                      <InputField label="Departamento" name="department" value={formData.department} onChange={handleChange} error={errors.department} placeholder="Ej. Cundinamarca" autoComplete="address-level1" required />
                      <InputField label="Ciudad" name="city" value={formData.city} onChange={handleChange} error={errors.city} placeholder="Ej. Bogotá" autoComplete="address-level2" required />
                      <div className="checkout-field-wide">
                        <InputField label="Dirección" name="address" value={formData.address} onChange={handleChange} error={errors.address} placeholder="Calle, carrera y número" autoComplete="street-address" required />
                      </div>
                      <InputField label="Apartamento, torre o interior" name="addressExtra" value={formData.addressExtra} onChange={handleChange} placeholder="Opcional" autoComplete="address-line2" />
                      <InputField label="Código postal" name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="Opcional" autoComplete="postal-code" inputMode="numeric" />
                    </div>
                  </CheckoutFormBlock>

                  <details className="checkout-extras">
                    <summary>
                      <span className="checkout-extras__icon"><NotebookPen size={17} /></span>
                      <span><strong>Agregar cupón o notas</strong><small>Opcional</small></span>
                      <ChevronRight className="checkout-extras__chevron" size={17} />
                    </summary>
                    <div className="checkout-extras__content">
                      <div className="checkout-fields checkout-fields--details">
                        <InputField label="Código de descuento" name="couponCode" value={formData.couponCode} onChange={handleChange} error={errors.couponCode} placeholder="Ej. LINEN10" autoComplete="off" icon={Tag} maxLength={50} />
                        <label className="block">
                          <span className="mb-2 block font-body text-[11px] font-semibold text-charcoal">Notas del pedido <small className="font-normal text-coffee/45">(opcional)</small></span>
                          <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" maxLength="2000" placeholder="Indicaciones para la entrega..." className="checkout-textarea" />
                        </label>
                      </div>
                    </div>
                  </details>
                </>
              )}

              {currentStep === 2 && (
                <CheckoutFormBlock
                  number="02"
                  icon={CalendarDays}
                  title="Disponibilidad de entrega"
                  description="Selecciona cuándo habrá una persona disponible para recibir la compra."
                >
                  <fieldset className="checkout-delivery-group">
                    <legend>¿Qué día prefieres?</legend>
                    <div className="checkout-delivery-options">
                      {DELIVERY_DAYS.map((option) => (
                        <label className={`checkout-delivery-choice ${formData.deliveryDay === option.value ? "is-selected" : ""}`} key={option.value}>
                          <input type="radio" name="deliveryDay" value={option.value} checked={formData.deliveryDay === option.value} onChange={handleChange} />
                          <span className="checkout-delivery-choice__short">{option.short}</span>
                          <span><strong>{option.title}</strong><small>{option.detail}</small></span>
                          <span className="checkout-delivery-choice__check"><Check size={12} /></span>
                        </label>
                      ))}
                    </div>
                    {errors.deliveryDay && <p className="checkout-choice-error">{errors.deliveryDay}</p>}
                  </fieldset>

                  <fieldset className="checkout-delivery-group">
                    <legend>¿En qué horario?</legend>
                    <div className="checkout-window-options">
                      {DELIVERY_WINDOWS.map((option) => (
                        <label className={`checkout-window-choice ${formData.deliveryWindow === option.value ? "is-selected" : ""}`} key={option.value}>
                          <input type="radio" name="deliveryWindow" value={option.value} checked={formData.deliveryWindow === option.value} onChange={handleChange} />
                          <Clock3 size={16} />
                          <span><strong>{option.title}</strong><small>{option.detail}</small></span>
                          <span className="checkout-window-choice__radio" />
                        </label>
                      ))}
                    </div>
                    {errors.deliveryWindow && <p className="checkout-choice-error">{errors.deliveryWindow}</p>}
                  </fieldset>

                  <div className="checkout-delivery-note">
                    <CalendarDays size={18} />
                    <p><strong>Esta es una preferencia de disponibilidad.</strong> La fecha exacta se confirmará después del pago aprobado y de acuerdo con la programación del envío.</p>
                  </div>
                </CheckoutFormBlock>
              )}

              {currentStep === 3 && (
                <CheckoutFormBlock
                  number="03"
                  icon={CreditCard}
                  title={PAYMENT_TEST_MODE ? "Pedido de prueba" : "Pago seguro"}
                  description={PAYMENT_TEST_MODE
                    ? "Crea el pedido sin realizar un cobro real."
                    : "El pedido solo se confirmará cuando la pasarela apruebe el pago."}
                >
                  <div className="checkout-payment-selection">
                    <CalendarDays size={18} />
                    <div><span>Disponibilidad elegida</span><strong>{selectedDeliveryDay?.title} · {selectedDeliveryWindow?.title}</strong></div>
                    <button type="button" onClick={() => goToStep(2)}>Cambiar</button>
                  </div>

                  <div id="payment-gateway-placeholder" className="checkout-payment-placeholder">
                    <div className="checkout-payment-placeholder__head">
                      <span className="checkout-payment-placeholder__icon"><CreditCard size={22} /></span>
                      <div>
                        <span className="checkout-payment-badge">{PAYMENT_TEST_MODE ? "Modo de prueba" : "Próximamente"}</span>
                        <h3>{PAYMENT_TEST_MODE ? "Simulación sin cobro" : "Pasarela de pago"}</h3>
                        <p>{PAYMENT_TEST_MODE
                          ? "El pedido quedará pendiente de pago para probar el panel, el inventario y las notificaciones."
                          : "Aquí aparecerán los métodos de pago y el retorno de pago aprobado."}</p>
                      </div>
                    </div>
                    <div className="checkout-delivery-estimate">
                      <ShieldCheck size={18} />
                      <div>
                        <strong>{PAYMENT_TEST_MODE ? "Disponible únicamente en desarrollo" : "Esperando integración segura"}</strong>
                        <p>{PAYMENT_TEST_MODE
                          ? "No se solicitarán datos bancarios ni se realizará ningún cargo."
                          : "No se crea ni confirma el pedido hasta recibir la validación firmada de la pasarela en el servidor."}</p>
                      </div>
                    </div>
                  </div>
                </CheckoutFormBlock>
              )}

              {submitError && (
                <div role="alert" className="checkout-form-error">
                  {submitError}
                </div>
              )}

              <div className="checkout-submit">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-terracotta" size={18} />
                  <div>
                    <p className="font-body text-[11px] font-semibold text-charcoal">{currentStep === 1 ? "Información protegida" : currentStep === 2 ? "Preferencia de entrega" : PAYMENT_TEST_MODE ? "Pedido sin cobro" : "Pago antes de confirmar"}</p>
                    <p className="mt-1 font-body text-[10px] leading-5 text-coffee/50">{currentStep === 1 ? "Continúa para elegir cuándo puedes recibir la compra." : currentStep === 2 ? "Podrás revisar esta selección antes de pagar." : PAYMENT_TEST_MODE ? "Se reservará inventario y aparecerá en el panel administrativo." : "El pedido se confirma únicamente después de recibir un pago aprobado."}</p>
                  </div>
                </div>
                <div className="checkout-actions">
                  {currentStep > 1 && <button type="button" className="checkout-action-secondary" onClick={() => goToStep(currentStep - 1)}>Volver</button>}
                  <button type="submit" className="checkout-action-primary" disabled={submitting}>
                    {currentStep === 1 ? "Continuar a entrega" : currentStep === 2 ? "Continuar al pago" : PAYMENT_TEST_MODE ? submitting ? "Creando pedido…" : "Crear pedido de prueba" : "Pasarela disponible pronto"}
                    {currentStep < 3 && <ChevronRight size={16} />}
                  </button>
                </div>
              </div>
            </section>
          </form>

          <OrderSummary
            cartItems={cartItems}
            subtotal={subtotal}
            removeFromCart={removeFromCart}
            updateQuantity={updateQuantity}
          />
        </div>
      </main>
    </div>
  );
}

function CheckoutFormBlock({ number, icon: Icon, title, description, children }) {
  return (
    <section className="checkout-form-block">
      <div className="checkout-form-block__header">
        <span className="checkout-form-block__icon">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <div>
          <div className="checkout-form-block__title">
            <span>{number}</span>
            <h2>{title}</h2>
          </div>
          <p>{description}</p>
        </div>
      </div>
      <div className="checkout-form-block__content">{children}</div>
    </section>
  );
}

function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  hint,
  icon: Icon,
  required = false,
  readOnly = false,
  ...inputProps
}) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 font-body text-[11px] font-semibold text-charcoal">
        {label}
        {!required && <small className="font-normal text-coffee/40">(opcional)</small>}
      </span>
      <span className="relative block">
        {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-coffee/35" size={15} />}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={`checkout-input h-12.5 w-full rounded-[13px] border bg-linen px-4 font-body text-[13px] text-charcoal outline-none transition-all placeholder:text-coffee/35 ${Icon ? "checkout-input--icon pl-11" : ""} ${readOnly ? "checkout-input--readonly cursor-not-allowed bg-black/[0.025] text-coffee/65" : "focus:border-terracotta focus:ring-3 focus:ring-terracotta/[0.08]"} ${error ? "checkout-input--error border-terracotta" : "border-black/[0.12]"}`}
          {...inputProps}
        />
        {readOnly && <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-coffee/35" size={14} />}
      </span>
      {error ? (
        <span id={errorId} className="mt-1.5 block font-body text-[10px] text-terracotta">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block font-body text-[9px] text-coffee/45">{hint}</span>
      ) : null}
    </label>
  );
}

function OrderSummary({
  cartItems,
  subtotal,
  removeFromCart,
  updateQuantity,
}) {
  const units = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <aside className="checkout-summary overflow-hidden rounded-[22px] border border-black/[0.08] bg-linen-header shadow-[0_18px_50px_rgba(58,43,31,.06)] lg:sticky lg:top-[112px]">
      <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-5 sm:px-6">
        <div>
          <p className="font-body text-[9px] font-semibold uppercase tracking-[.18em] text-terracotta">Tu compra</p>
          <h2 className="mt-1 font-display text-[26px] text-charcoal">Resumen del pedido</h2>
        </div>
        <span className="rounded-full border border-black/[0.08] px-3 py-1.5 font-body text-[9px] text-coffee/55">
          {units} {units === 1 ? "unidad" : "unidades"}
        </span>
      </div>

      <div className="divide-y divide-black/[0.07] px-5 sm:px-6">
        {cartItems.map((item) => (
          <article className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 py-5" key={item.cartId}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-linen-dark">
              <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
              <span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-charcoal px-1 font-body text-[9px] text-white">
                {item.quantity}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-[16px] leading-tight text-charcoal">{item.product.name}</h3>
                  <p className="mt-1.5 font-body text-[9px] text-coffee/50">{item.size} · {item.color}</p>
                </div>
                <button type="button" onClick={() => removeFromCart(item.cartId)} aria-label={`Eliminar ${item.product.name}`} className="shrink-0 rounded-full p-1.5 text-coffee/40 transition-colors hover:bg-terracotta/[0.07] hover:text-terracotta">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex h-8 items-center rounded-full border border-black/[0.12] bg-linen">
                  <button type="button" disabled={item.quantity <= 1} onClick={() => updateQuantity(item.cartId, item.quantity - 1)} aria-label="Disminuir cantidad" className="grid h-full w-8 place-items-center disabled:opacity-30"><Minus size={11} /></button>
                  <span className="w-5 text-center font-body text-[10px] text-charcoal">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.cartId, item.quantity + 1)} aria-label="Aumentar cantidad" className="grid h-full w-8 place-items-center"><Plus size={11} /></button>
                </div>
                <strong className="whitespace-nowrap font-body text-[11px] font-semibold text-charcoal">
                  {formatPrice(item.product.price * item.quantity)}
                </strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="border-t border-black/[0.07] px-5 py-5 sm:px-6">
        <div className="flex justify-between font-body text-[11px] text-coffee/65">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="mt-3 flex justify-between font-body text-[11px] text-coffee/65">
          <span>Envío</span>
          <span>Por calcular</span>
        </div>
        <div className="mt-5 flex items-end justify-between border-t border-black/[0.08] pt-5 text-charcoal">
          <span className="font-body text-[12px] font-semibold">Total estimado</span>
          <strong className="font-display text-[28px] leading-none">{formatPrice(subtotal)}</strong>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-[12px] bg-linen-dark/40 px-3 py-3 text-coffee/60">
            <Truck className="shrink-0 text-terracotta" size={15} />
            <span className="font-body text-[9px] leading-4">Envío nacional</span>
          </div>
          <div className="flex items-center gap-2 rounded-[12px] bg-linen-dark/40 px-3 py-3 text-coffee/60">
            <PackageCheck className="shrink-0 text-terracotta" size={15} />
            <span className="font-body text-[9px] leading-4">Stock validado al pagar</span>
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-2 font-body text-[9px] text-coffee/45">
          <LockKeyhole size={11} />
          Compra protegida y datos privados
        </p>
      </div>
    </aside>
  );
}

export default Checkout;
