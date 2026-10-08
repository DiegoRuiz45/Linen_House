import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

function CategoryCard({
  title,
  description,
  image,
  route,
  className = "",
  featured = false,
}) {
  return (
    <Link
      to={route}
      className={`group relative block min-h-[320px] overflow-hidden rounded-[24px] border border-black/[0.06] bg-linen-dark shadow-[0_18px_50px_rgba(58,43,31,.09)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_26px_65px_rgba(58,43,31,.16)] ${className}`}
    >
      <img
        src={image}
        alt={title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        <p className="font-body text-[8px] font-semibold uppercase tracking-[.22em] text-white/65">
          Colección Linen House
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h3 className={`font-display leading-none text-white ${featured ? "text-[38px] sm:text-[46px]" : "text-[30px]"}`}>
              {title}
            </h3>
            <p className="mt-3 max-w-[360px] font-body text-[10px] leading-relaxed text-white/70 sm:text-[11px]">
              {description}
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md transition-all group-hover:rotate-6 group-hover:bg-terracotta">
            <ArrowUpRight size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default CategoryCard;
