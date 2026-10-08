import {
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

function Hero() {
  return (
    <section id="inicio" className="relative min-h-[calc(100vh-82px)] overflow-hidden bg-charcoal">
      <img
        src="/images/Inicio/hero-bedroom.jpeg"
        alt="Habitación Linen House con ropa de cama en tonos cálidos"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/45 to-charcoal/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/35 via-transparent to-black/5" />

      <div className="relative mx-auto flex min-h-[calc(100vh-82px)] w-full max-w-[1440px] items-center px-[clamp(24px,7vw,110px)] py-20">
        <div className="max-w-[700px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.08] px-4 py-2 font-body text-[9px] font-semibold uppercase tracking-[.22em] text-white backdrop-blur-md">
            <Sparkles size={13} />
            Confort diseñado para tu hogar
          </span>

          <h1 className="mt-6 font-display text-[clamp(52px,7vw,94px)] font-normal leading-[.9] tracking-[-.035em] text-white">
            Descansa bonito.
            <span className="mt-2 block font-normal italic text-white/90">Vive mejor.</span>
          </h1>

          <p className="mt-7 max-w-[540px] font-body text-[14px] leading-[1.85] text-white/80 sm:text-[15px]">
            Textiles que convierten cada habitación en un refugio.
            Descubre colecciones pensadas para acompañar tus mejores momentos de descanso.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/productos"
              className="inline-flex h-13 items-center gap-3 rounded-full bg-terracotta px-7 font-body text-[11px] font-semibold text-white shadow-[0_14px_35px_rgba(0,0,0,.2)] transition-all hover:-translate-y-1 hover:bg-terracotta-dark"
            >
              Explorar productos
              <ArrowRight size={16} />
            </Link>
            <a
              href="#categorias"
              className="inline-flex h-13 items-center rounded-full border border-white/35 bg-white/[0.08] px-7 font-body text-[11px] font-semibold text-white backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white/[0.16]"
            >
              Ver colecciones
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/20 pt-5 text-white/75">
            <span className="flex items-center gap-2 font-body text-[10px]"><ShieldCheck size={15} /> Compra segura</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span className="font-body text-[10px]">Envíos nacionales</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span className="font-body text-[10px]">Calidad seleccionada</span>
          </div>
        </div>
      </div>

      <a
        href="#categorias"
        aria-label="Ir a las categorías"
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-white/65 transition-colors hover:text-white md:flex"
      >
        <span className="font-body text-[8px] font-semibold uppercase tracking-[.24em]">Descubrir</span>
        <ChevronDown size={17} />
      </a>
    </section>
  );
}

export default Hero;
