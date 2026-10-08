import {
  ArrowUpRight,
  Eye,
  ImageOff,
} from "lucide-react";

function formatPrice(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function ProductCard({ product, onSelect }) {
  const hasDiscount = Boolean(
    product.oldPrice
    && product.oldPrice > product.price,
  );
  const discount = hasDiscount
    ? Math.round(
        ((product.oldPrice - product.price) / product.oldPrice) * 100,
      )
    : 0;

  return (
    <article className="group min-w-0">
      <button
        type="button"
        onClick={() => onSelect(product)}
        className="block w-full text-left focus:outline-none"
        aria-label={`Ver ${product.name}`}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] border border-black/[0.06] bg-linen-dark shadow-[0_14px_38px_rgba(58,43,31,0.08)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_22px_50px_rgba(58,43,31,0.15)] group-focus-visible:ring-2 group-focus-visible:ring-terracotta group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-linen">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-coffee/50">
              <ImageOff size={24} strokeWidth={1.5} />
              <span className="font-body text-xs">Imagen no disponible</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/35 via-transparent to-black/[0.04] opacity-70 transition-opacity group-hover:opacity-90" />

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {!product.available && (
              <span className="rounded-full bg-charcoal px-3 py-1.5 font-body text-[9px] font-semibold uppercase tracking-[.12em] text-white shadow-sm">
                Agotado
              </span>
            )}
            {hasDiscount && (
              <span className="rounded-full bg-terracotta px-3 py-1.5 font-body text-[9px] font-semibold uppercase tracking-[.12em] text-white shadow-sm">
                -{discount}%
              </span>
            )}
          </div>

          <span className="absolute bottom-4 left-4 right-4 flex translate-y-3 items-center justify-between rounded-full bg-linen/95 px-4 py-3 font-body text-[11px] font-semibold text-charcoal opacity-0 shadow-lg backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            <span className="flex items-center gap-2">
              <Eye size={15} />
              Vista rápida
            </span>
            <ArrowUpRight size={15} />
          </span>
        </div>

        <div className="px-1 pb-2 pt-5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-body text-[9px] font-semibold uppercase tracking-[.18em] text-terracotta">
              {product.categoryName || "Linen House"}
            </p>
            <span className="font-body text-[9px] text-coffee/50">
              {product.available ? "Disponible" : "Sin existencias"}
            </span>
          </div>

          <h3 className="mt-2 line-clamp-2 font-display text-[23px] leading-[1.15] text-charcoal transition-colors group-hover:text-terracotta">
            {product.name}
          </h3>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-body">
            <strong className="text-[15px] font-semibold text-charcoal">
              {formatPrice(product.price)}
            </strong>
            {hasDiscount && (
              <span className="text-[11px] text-coffee/45 line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </div>
        </div>
      </button>
    </article>
  );
}

export default ProductCard;
