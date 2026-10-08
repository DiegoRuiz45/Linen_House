import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Minus,
  Plus,
  ShoppingBag,
  Star,
} from "lucide-react";

import Header from "../components/layout/Header";
import { useCart } from "../context/useCart";
import { useAuth } from "../context/useAuth";
import { getProductBySlug } from "../services/productsApi";

const API_URL = (
  import.meta.env.VITE_API_URL
  ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

function ProductDetail() {
  const { slug } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [adding, setAdding] = useState(false);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    getProductBySlug(
      slug,
      { signal: controller.signal },
    )
      .then(setProduct)
      .catch((error) => {
        if (error.name !== "AbortError") {
          setLoadError(
            error.message
            || "No fue posible cargar el producto.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug]);

  const selectedVariant = useMemo(
    () => product?.variants?.find(
      (variant) =>
        variant.size === selectedSize
        && variant.color === selectedColor
        && variant.available,
    ) ?? null,
    [product, selectedColor, selectedSize],
  );

  const availableVariants = useMemo(
    () => product?.variants?.filter(
      (variant) => variant.available,
    ) ?? [],
    [product],
  );

  const selectedSizeVariant = useMemo(
    () => availableVariants.find(
      (variant) => variant.size === selectedSize,
    ) ?? null,
    [availableVariants, selectedSize],
  );

  const availableSizes = useMemo(
    () => [
      ...new Set(
        availableVariants.map(
          (variant) => variant.size,
        ),
      ),
    ],
    [availableVariants],
  );

  const availableColors = useMemo(
    () => [
      ...new Set(
        availableVariants
          .filter(
            (variant) =>
              !selectedSize
              || variant.size === selectedSize,
          )
          .map(
            (variant) => variant.color,
          ),
      ),
    ],
    [availableVariants, selectedSize],
  );

  if (loading) {
    return (
      <ProductPageMessage
        title="Cargando producto"
        message="Estamos consultando su disponibilidad."
      />
    );
  }

  if (!product) {
    return (
      <ProductPageMessage
        title="Producto no encontrado"
        message={
          loadError
          || "El producto que estás buscando no existe."
        }
      />
    );
  }

  const formattedPrice = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(
    selectedSizeVariant?.price
    ?? product.price,
  );

  const increaseQuantity = () => {
    setQuantity((current) => Math.min(
      current + 1,
      selectedVariant?.stock ?? current,
    ));
  };

  const decreaseQuantity = () => {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  };

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) {
      setActionError(
        "Selecciona un tamaño y un color.",
      );
      return;
    }

    if (!selectedVariant) {
      setActionError(
        "Esta combinación no tiene stock disponible.",
      );
      return;
    }

    setAdding(true);
    setActionError("");

    const added = await addToCart(
      product,
      selectedSize,
      selectedColor,
      quantity,
    );

    setAdding(false);

    if (!added) {
      setActionError(
        "No fue posible agregar el producto al carrito.",
      );
    }
  };

  return (
    <div
      className="
        w-full
        min-h-screen

        bg-linen
      "
    >
      <Header />

      <main
        className="
          w-full

          px-[clamp(24px,5vw,96px)]

          pt-[32px]
          pb-[100px]
        "
      >
        {/* BREADCRUMB */}

        <div
          className="
            flex
            items-center

            gap-[8px]

            mb-[35px]

            font-body
            text-[12px]

            text-coffee/60
          "
        >
          <Link
            to="/"
            className="
              transition-colors
              hover:text-terracotta
            "
          >
            Inicio
          </Link>

          <span>/</span>

          <Link
            to="/productos"
            className="
              transition-colors
              hover:text-terracotta
            "
          >
            {product.categoryName || "Productos"}
          </Link>

          <span>/</span>

          <span className="text-charcoal">
            {product.name}
          </span>
        </div>

        {/* PRODUCTO */}

        <section
          className="
            grid

            grid-cols-1

            lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]

            gap-[45px]

            xl:gap-[80px]
          "
        >
          {/* ==================================
              IMAGEN
          ================================== */}

          <div>
            <div
              className="
                relative

                w-full

                aspect-[4/5]

                overflow-hidden

                rounded-[14px]

                bg-linen-dark
              "
            >
              <img
                src={product.image}
                alt={product.name}
                className="
                  w-full
                  h-full

                  object-cover
                "
              />

              {!product.available && (
                <span
                  className="
                    absolute

                    top-[20px]
                    left-[20px]

                    px-[14px]
                    py-[7px]

                    rounded-full

                    bg-charcoal

                    font-body
                    text-[11px]
                    text-white
                  "
                >
                  Agotado
                </span>
              )}
            </div>
          </div>

          {/* ==================================
              INFORMACIÓN
          ================================== */}

          <div
            className="
              lg:pt-[18px]
            "
          >
            <Link
              to="/productos"
              className="
                inline-flex
                items-center

                gap-[6px]

                mb-[30px]

                font-body
                text-[12px]

                text-coffee/65

                transition-colors

                hover:text-terracotta
              "
            >
              <ChevronLeft
                size={15}
                strokeWidth={1.7}
              />

              Volver a la colección
            </Link>

            <p
              className="
                mb-[10px]

                font-body

                text-[11px]
                font-medium

                uppercase

                tracking-[0.2em]

                text-terracotta
              "
            >
              Linen House
            </p>

            <h1
              className="
                font-display

                text-[clamp(38px,4vw,58px)]

                leading-[1.08]

                font-normal

                text-charcoal
              "
            >
              {product.name}
            </h1>

            <p
              className="
                mt-[18px]

                font-body

                text-[20px]
                font-medium

                text-charcoal
              "
            >
              {formattedPrice}
            </p>

            {/* DESCRIPCIÓN */}

            <p
              className="
                max-w-[530px]

                mt-[25px]

                pb-[28px]

                border-b
                border-black/10

                font-body

                text-[14px]
                leading-[1.8]

                text-coffee/75
              "
            >
              Diseñado para transformar tu espacio y
              ofrecer una sensación de comodidad,
              suavidad y elegancia en cada detalle.
            </p>

            {/* ==================================
                TAMAÑOS
            ================================== */}

            <div
              className="
                py-[27px]

                border-b
                border-black/10
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between

                  mb-[14px]
                "
              >
                <h2
                  className="
                    font-body

                    text-[13px]
                    font-semibold

                    text-charcoal
                  "
                >
                  Tamaño
                </h2>

                {selectedSize && (
                  <span
                    className="
                      font-body
                      text-[11px]

                      text-coffee/65
                    "
                  >
                    {selectedSize}
                  </span>
                )}
              </div>

              <div
                className="
                  flex
                  flex-wrap

                  gap-[10px]
                "
              >
                {availableSizes.map((size) => (
                  <button
                    key={size}

                    type="button"

                    onClick={() => {
                      setSelectedSize(size);
                      setSelectedColor("");
                      setQuantity(1);
                      setActionError("");
                    }}

                    className={`
                      min-w-[78px]

                      h-[42px]

                      px-[16px]

                      rounded-full

                      border

                      font-body

                      text-[12px]
                      font-medium

                      transition-all

                      ${
                        selectedSize === size
                          ? `
                            border-terracotta
                            bg-terracotta
                            text-white
                          `
                          : `
                            border-black/15
                            text-charcoal
                            hover:border-terracotta
                          `
                      }
                    `}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* ==================================
                COLORES
            ================================== */}

            <div
              className="
                py-[27px]

                border-b
                border-black/10
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between

                  mb-[14px]
                "
              >
                <h2
                  className="
                    font-body

                    text-[13px]
                    font-semibold
                  "
                >
                  Color
                </h2>

                {selectedColor && (
                  <span
                    className="
                      font-body
                      text-[11px]

                      text-coffee/65
                    "
                  >
                    {selectedColor}
                  </span>
                )}
              </div>

              <div
                className="
                  flex
                  flex-wrap

                  gap-[10px]
                "
              >
                {availableColors.map((color) => (
                  <button
                    key={color}

                    type="button"

                    onClick={() => {
                      setSelectedColor(color);
                      setQuantity(1);
                      setActionError("");
                    }}

                    className={`
                      h-[40px]

                      px-[17px]

                      rounded-full

                      border

                      font-body

                      text-[12px]

                      transition-all

                      ${
                        selectedColor === color
                          ? `
                            border-charcoal
                            bg-charcoal
                            text-white
                          `
                          : `
                            border-black/15
                            text-charcoal
                            hover:border-charcoal
                          `
                      }
                    `}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* ==================================
                CANTIDAD
            ================================== */}

            <div
              className="
                py-[27px]
              "
            >
              <h2
                className="
                  mb-[14px]

                  font-body

                  text-[13px]
                  font-semibold
                "
              >
                Cantidad
              </h2>

              <div
                className="
                  w-[130px]

                  h-[44px]

                  flex
                  items-center
                  justify-between

                  px-[10px]

                  rounded-full

                  border
                  border-black/15
                "
              >
                <button
                  type="button"

                  aria-label="Disminuir cantidad"

                  onClick={decreaseQuantity}

                  className="
                    w-[30px]
                    h-[30px]

                    flex
                    items-center
                    justify-center

                    rounded-full

                    transition-colors

                    hover:bg-black/5
                  "
                >
                  <Minus
                    size={15}
                  />
                </button>

                <span
                  className="
                    font-body
                    text-[13px]
                    font-medium
                  "
                >
                  {quantity}
                </span>

                <button
                  type="button"

                  aria-label="Aumentar cantidad"

                  onClick={increaseQuantity}

                  disabled={
                    !selectedVariant
                    || quantity >= selectedVariant.stock
                  }

                  className="
                    w-[30px]
                    h-[30px]

                    flex
                    items-center
                    justify-center

                    rounded-full

                    transition-colors

                    hover:bg-black/5

                    disabled:opacity-30
                  "
                >
                  <Plus
                    size={15}
                  />
                </button>
              </div>
            </div>

            {/* ==================================
                AGREGAR
            ================================== */}

            {actionError && (
              <p className="mb-[12px] font-body text-[12px] text-terracotta">
                {actionError}
              </p>
            )}

            <button
              type="button"

              disabled={!selectedVariant || adding}

              onClick={handleAddToCart}

              className="
                w-full

                h-[54px]

                flex
                items-center
                justify-center

                gap-[10px]

                rounded-full

                bg-terracotta

                font-body

                text-[13px]
                font-semibold

                text-white

                transition-all

                hover:bg-terracotta-dark

                disabled:bg-black/15
                disabled:text-black/40
                disabled:cursor-not-allowed
              "
            >
              <ShoppingBag
                size={18}
                strokeWidth={1.7}
              />

              {adding
                ? "Agregando..."
                : product.available
                  ? "Agregar al carrito"
                  : "Producto agotado"}
            </button>
          </div>
        </section>

        <ReviewsSection productId={product.id} />
      </main>
    </div>
  );
}


function ReviewsSection({ productId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/products/${productId}/reviews`, {
      signal: controller.signal,
      credentials: "include",
    })
      .then((response) => response.ok ? response.json() : [])
      .then(setReviews)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setReviews([]);
      });
    return () => controller.abort();
  }, [productId]);

  const submitReview = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/products/${productId}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          title: form.get("title") || null,
          body: form.get("body"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.detail === "string" ? data.detail : "No fue posible enviar la reseña.");
      }
      event.currentTarget.reset();
      setRating(5);
      setMessage("Tu reseña fue recibida y está pendiente de moderación.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section id="resenas" className="mt-20 scroll-mt-28 border-t border-black/10 pt-12">
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="font-body text-[10px] font-semibold uppercase tracking-[.2em] text-terracotta">Experiencias verificadas</p>
          <h2 className="mt-2 font-display text-4xl text-charcoal">Reseñas</h2>
          {reviews.length === 0 ? <p className="mt-6 font-body text-sm text-coffee/60">Este producto todavía no tiene reseñas publicadas.</p> : <div className="mt-7 grid gap-4 sm:grid-cols-2">{reviews.map((review) => <article className="rounded-2xl border border-black/10 bg-white/40 p-5" key={review.id}><div className="flex gap-1 text-terracotta">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill={index < review.rating ? "currentColor" : "none"} />)}</div><h3 className="mt-4 font-display text-xl text-charcoal">{review.title || "Una compra verificada"}</h3><p className="mt-2 font-body text-xs leading-relaxed text-coffee/70">{review.body}</p><p className="mt-4 font-body text-[10px] font-semibold text-charcoal">{review.customer_name}</p></article>)}</div>}
        </div>
        <aside className="rounded-2xl border border-black/10 bg-white/45 p-6">
          <h3 className="font-display text-2xl text-charcoal">Comparte tu experiencia</h3>
          <p className="mt-2 font-body text-[11px] leading-relaxed text-coffee/60">Solo se aceptan reseñas de pedidos entregados.</p>
          {!user ? <p className="mt-6 rounded-xl bg-linen-dark/50 p-4 font-body text-xs text-coffee">Inicia sesión para escribir una reseña.</p> : <form className="mt-6 grid gap-4" onSubmit={submitReview}><label className="font-body text-[11px] text-coffee">Calificación<div className="mt-2 flex gap-1">{[1,2,3,4,5].map((value) => <button aria-label={`${value} estrellas`} className="text-terracotta" type="button" key={value} onClick={() => setRating(value)}><Star size={21} fill={value <= rating ? "currentColor" : "none"} /></button>)}</div></label><label className="font-body text-[11px] text-coffee">Título<input className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-3 outline-none focus:border-terracotta" name="title" maxLength={120} /></label><label className="font-body text-[11px] text-coffee">Reseña<textarea className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-3 outline-none focus:border-terracotta" name="body" minLength={10} maxLength={2000} rows={5} required /></label>{(error || message) && <p className={`font-body text-xs ${error ? "text-red-700" : "text-emerald-700"}`}>{error || message}</p>}<button className="rounded-full bg-terracotta px-5 py-3 font-body text-xs font-semibold text-white" type="submit">Enviar reseña</button></form>}
        </aside>
      </div>
    </section>
  );
}


function ProductPageMessage({
  title,
  message,
}) {
  return (
    <div className="min-h-screen w-full bg-linen">
      <Header />

      <main className="flex min-h-[600px] flex-col items-center justify-center px-[24px] text-center">
        <h1 className="font-display text-[42px] text-charcoal">
          {title}
        </h1>

        <p className="mt-[12px] max-w-[440px] font-body text-[14px] text-coffee/70">
          {message}
        </p>

        <Link
          to="/productos"
          className="mt-[28px] flex h-[44px] items-center justify-center rounded-full bg-terracotta px-[24px] font-body text-[13px] font-medium text-white transition-colors hover:bg-terracotta-dark"
        >
          Volver a productos
        </Link>
      </main>
    </div>
  );
}

export default ProductDetail;
