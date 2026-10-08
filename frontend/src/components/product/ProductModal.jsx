import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Check,
  ImageOff,
  Minus,
  PackageCheck,
  Palette,
  Plus,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";

import { useCart } from "../../context/useCart";
import { getProductBySlug } from "../../services/productsApi";

function formatPrice(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function ProductModal({ product, onClose }) {
  const { addToCart } = useCart();
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [selectedImage, setSelectedImage] = useState(product?.image ?? "");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (!product?.slug) return undefined;

    const controller = new AbortController();

    getProductBySlug(product.slug, { signal: controller.signal })
      .then((productDetail) => {
        setDetail(productDetail);
        setSelectedImage(productDetail.image ?? "");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setDetailError(
            requestError.message
            || "No fue posible cargar el producto.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });

    return () => controller.abort();
  }, [product]);

  const displayProduct = detail ?? product;
  const availableVariants = useMemo(
    () => detail?.variants?.filter((variant) => variant.available) ?? [],
    [detail],
  );
  const availableSizes = useMemo(
    () => [...new Set(availableVariants.map((variant) => variant.size))],
    [availableVariants],
  );
  const availableColors = useMemo(
    () => [
      ...new Set(
        availableVariants
          .filter(
            (variant) => !selectedSize || variant.size === selectedSize,
          )
          .map((variant) => variant.color),
      ),
    ],
    [availableVariants, selectedSize],
  );
  const selectedVariant = useMemo(
    () => availableVariants.find(
      (variant) => (
        variant.size === selectedSize
        && variant.color === selectedColor
      ),
    ) ?? null,
    [availableVariants, selectedColor, selectedSize],
  );
  const selectedSizeVariant = useMemo(
    () => availableVariants.find(
      (variant) => variant.size === selectedSize,
    ) ?? null,
    [availableVariants, selectedSize],
  );

  if (!product || !displayProduct) return null;

  const galleryImages = detail?.images?.length
    ? detail.images
    : selectedImage
      ? [{ id: "cover", image_url: selectedImage, alt_text: product.name }]
      : [];
  const currentPrice = selectedSizeVariant?.price ?? displayProduct.price;
  const currentOldPrice = selectedSizeVariant?.oldPrice ?? displayProduct.oldPrice;
  const hasDiscount = Boolean(
    currentOldPrice
    && currentOldPrice > currentPrice,
  );
  const productAvailable = Boolean(
    detail?.available
    && availableVariants.length > 0,
  );

  const handleSizeChange = (size) => {
    setSelectedSize(size);
    setQuantity(1);
    setError("");

    if (!availableVariants.some(
      (variant) => (
        variant.size === size
        && variant.color === selectedColor
      ),
    )) {
      setSelectedColor("");
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    setQuantity(1);
    setError("");
  };

  const handleAddToCart = async () => {
    if (!selectedSize) {
      setError("Selecciona un tamaño para continuar.");
      return;
    }
    if (!selectedColor) {
      setError("Selecciona un color para continuar.");
      return;
    }
    if (!selectedVariant) {
      setError("Esta combinación no se encuentra disponible.");
      return;
    }

    setAdding(true);
    setError("");
    const added = await addToCart(
      displayProduct,
      selectedSize,
      selectedColor,
      quantity,
    );
    setAdding(false);

    if (added) {
      onClose();
    } else {
      setError("No fue posible agregar el producto al carrito.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/60 p-3 backdrop-blur-[5px] sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative max-h-[92vh] w-full max-w-[1100px] overflow-y-auto rounded-[24px] border border-white/20 bg-linen shadow-[0_30px_90px_rgba(28,21,16,0.35)] lg:h-[min(720px,88vh)] lg:overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <button
          type="button"
          aria-label="Cerrar detalle del producto"
          onClick={onClose}
          className="absolute right-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-black/[0.06] bg-linen/95 text-charcoal shadow-lg backdrop-blur transition-all hover:rotate-90 hover:bg-terracotta hover:text-white sm:right-5 sm:top-5"
        >
          <X size={19} />
        </button>

        <div className="grid min-h-full lg:h-full lg:grid-cols-[.88fr_1.12fr]">
          <section className="relative min-h-[320px] overflow-hidden bg-linen-dark sm:min-h-[420px] lg:min-h-0" aria-label="Galería del producto">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={displayProduct.name}
                className="absolute inset-0 h-full w-full object-cover object-center"
                onError={() => setSelectedImage("")}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-coffee/50">
                <ImageOff size={30} strokeWidth={1.4} />
                <span className="font-body text-xs">Imagen no disponible</span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/45 via-transparent to-black/10" />

            <div className="absolute left-5 top-5 z-10 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/30 bg-linen/90 px-4 py-2 font-body text-[9px] font-semibold uppercase tracking-[.18em] text-terracotta shadow-sm backdrop-blur">
                {displayProduct.categoryName || "Linen House"}
              </span>
              {!detailLoading && !productAvailable && (
                <span className="rounded-full bg-charcoal px-4 py-2 font-body text-[9px] font-semibold uppercase tracking-[.16em] text-white shadow-sm">
                  Agotado
                </span>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="absolute bottom-5 left-5 right-5 z-10 flex gap-2 overflow-x-auto rounded-2xl border border-white/20 bg-charcoal/25 p-2 backdrop-blur-md">
                {galleryImages.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedImage(image.image_url)}
                    aria-label={`Ver imagen ${index + 1}`}
                    className={`h-[68px] w-[58px] shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      selectedImage === image.image_url
                        ? "border-linen shadow-md"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.alt_text || displayProduct.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="min-h-0 bg-linen px-6 py-8 sm:px-10 sm:py-11 lg:overflow-y-auto lg:px-12" aria-label="Información del producto">
            <div className="pr-12">
              <p className="font-body text-[10px] font-semibold uppercase tracking-[.22em] text-terracotta">
                Colección {displayProduct.categoryName || "Linen House"}
              </p>
              <h2 id="product-modal-title" className="mt-3 font-display text-[clamp(38px,4vw,56px)] font-normal leading-[.98] text-charcoal">
                {displayProduct.name}
              </h2>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-black/[0.08] pb-6 font-body">
              <strong className="text-[22px] font-semibold text-charcoal">
                {formatPrice(currentPrice)}
              </strong>
              {hasDiscount && (
                <>
                  <span className="text-[13px] text-coffee/45 line-through">
                    {formatPrice(currentOldPrice)}
                  </span>
                  <span className="rounded-full bg-terracotta/10 px-3 py-1 text-[10px] font-semibold text-terracotta">
                    Precio especial
                  </span>
                </>
              )}
            </div>

            <p className="mt-6 font-body text-[13px] leading-[1.85] text-coffee/75">
              {displayProduct.description
                || "Diseñado para transformar tu habitación en un espacio cómodo, elegante y acogedor."}
            </p>

            {detailLoading && (
              <div className="mt-7 rounded-2xl border border-black/[0.07] bg-white/35 p-5 font-body text-xs text-coffee/65">
                Consultando opciones y disponibilidad…
              </div>
            )}

            {detailError && (
              <div className="mt-7 rounded-2xl border border-terracotta/20 bg-terracotta/[0.06] p-5 font-body text-xs text-terracotta">
                {detailError}
              </div>
            )}

            {!detailLoading && !detailError && (
              <div className="mt-8 space-y-7">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <h3 className="flex items-center gap-2 font-body text-xs font-semibold text-charcoal">
                      <Ruler size={16} className="text-terracotta" />
                      Elige el tamaño
                    </h3>
                    {selectedSize && <span className="font-body text-[10px] text-coffee/55">Seleccionado: {selectedSize}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {availableSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSizeChange(size)}
                        className={`flex h-12 items-center justify-between rounded-xl border px-4 font-body text-xs font-semibold transition-all ${
                          selectedSize === size
                            ? "border-terracotta bg-terracotta text-white shadow-[0_7px_20px_rgba(176,92,66,.18)]"
                            : "border-black/10 bg-white/35 text-charcoal hover:border-terracotta/50"
                        }`}
                      >
                        {size}
                        {selectedSize === size && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <h3 className="flex items-center gap-2 font-body text-xs font-semibold text-charcoal">
                      <Palette size={16} className="text-terracotta" />
                      Elige el color
                    </h3>
                    {!selectedSize && <span className="font-body text-[10px] text-coffee/50">Primero selecciona el tamaño</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorChange(color)}
                        disabled={!selectedSize}
                        className={`flex h-11 min-w-[100px] items-center justify-center gap-2 rounded-xl border px-4 font-body text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                          selectedColor === color
                            ? "border-charcoal bg-charcoal text-white"
                            : "border-black/10 bg-white/35 text-charcoal hover:border-charcoal/40"
                        }`}
                      >
                        {selectedColor === color && <Check size={13} />}
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-4 border-y border-black/[0.08] py-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-body text-xs font-semibold text-charcoal">Cantidad</h3>
                    <p className="mt-1 font-body text-[10px] text-coffee/55">
                      {selectedVariant
                        ? `${selectedVariant.stock} unidades disponibles`
                        : "Selecciona tamaño y color"}
                    </p>
                  </div>
                  <div className="flex h-11 w-[132px] items-center justify-between rounded-full border border-black/10 bg-white/40 px-2">
                    <button
                      type="button"
                      aria-label="Disminuir cantidad"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      disabled={quantity <= 1}
                      className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-black/5 disabled:opacity-30"
                    >
                      <Minus size={14} />
                    </button>
                    <strong className="font-body text-xs text-charcoal">{quantity}</strong>
                    <button
                      type="button"
                      aria-label="Aumentar cantidad"
                      onClick={() => setQuantity((current) => Math.min(current + 1, selectedVariant?.stock ?? current))}
                      disabled={!selectedVariant || quantity >= selectedVariant.stock}
                      className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-black/5 disabled:opacity-30"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-xl bg-terracotta/[0.07] px-4 py-3 font-body text-[11px] text-terracotta">{error}</p>
            )}

            <button
              type="button"
              disabled={detailLoading || Boolean(detailError) || !productAvailable || !selectedVariant || adding}
              onClick={handleAddToCart}
              className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-terracotta px-6 font-body text-xs font-semibold text-white shadow-[0_12px_30px_rgba(176,92,66,.22)] transition-all hover:-translate-y-0.5 hover:bg-terracotta-dark disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/40 disabled:shadow-none"
            >
              <ShoppingBag size={18} />
              {detailLoading
                ? "Consultando disponibilidad…"
                : adding
                  ? "Agregando…"
                  : productAvailable
                    ? "Agregar al carrito"
                    : "Producto agotado"}
            </button>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-black/[0.07] pt-5">
              <div className="text-center"><Truck className="mx-auto text-terracotta" size={17} /><span className="mt-2 block font-body text-[9px] text-coffee/60">Envíos nacionales</span></div>
              <div className="text-center"><ShieldCheck className="mx-auto text-terracotta" size={17} /><span className="mt-2 block font-body text-[9px] text-coffee/60">Compra segura</span></div>
              <div className="text-center"><PackageCheck className="mx-auto text-terracotta" size={17} /><span className="mt-2 block font-body text-[9px] text-coffee/60">Calidad verificada</span></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ProductModal;
