import {
  Headphones,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";

const BENEFITS = [
  {
    icon: Truck,
    title: "Envíos nacionales",
    text: "Llevamos tu descanso hasta la puerta de tu hogar.",
  },
  {
    icon: ShieldCheck,
    title: "Compra segura",
    text: "Tu información y cada paso de la compra están protegidos.",
  },
  {
    icon: PackageCheck,
    title: "Calidad seleccionada",
    text: "Elegimos textiles pensados para disfrutarse todos los días.",
  },
  {
    icon: Headphones,
    title: "Atención cercana",
    text: "Te acompañamos para elegir la opción ideal para tu espacio.",
  },
];

export function HomeBenefits() {
  return (
    <section className="border-y border-black/[0.06] bg-linen-soft/70 px-[clamp(24px,6vw,96px)]">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 divide-y divide-black/[0.06] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <article className="flex gap-4 px-1 py-7 sm:px-6 lg:py-9" key={title}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-terracotta/[0.09] text-terracotta">
              <Icon size={18} />
            </span>
            <div>
              <h3 className="font-body text-[11px] font-semibold text-charcoal">{title}</h3>
              <p className="mt-1.5 font-body text-[9px] leading-[1.65] text-coffee/55">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomeFooter() {
  return (
    <footer className="border-t border-black/[0.06] bg-linen-soft px-[clamp(24px,6vw,96px)] py-10">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[26px] text-charcoal">Linen House</p>
          <p className="mt-2 font-body text-[9px] uppercase tracking-[.18em] text-coffee/45">Confort para habitar mejor</p>
        </div>
        <div className="flex items-center gap-6 font-body text-[10px] text-coffee/60">
          <Link className="transition-colors hover:text-terracotta" to="/">Inicio</Link>
          <Link className="transition-colors hover:text-terracotta" to="/productos">Productos</Link>
          <span className="text-coffee/35">© {new Date().getFullYear()} Linen House</span>
        </div>
      </div>
    </footer>
  );
}
