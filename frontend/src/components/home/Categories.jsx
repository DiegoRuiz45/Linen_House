import { ArrowRight, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";

import CategoryCard from "./CategoryCard";

const CATEGORIES = [
  {
    title: "Cubrelechos",
    description: "Capas suaves y envolventes para una habitación que invita a quedarse.",
    image: "/images/Inicio/cubrelechos.jpeg",
    route: "/productos?categoria=cubrelechos",
    className: "lg:col-span-6 lg:row-span-2 lg:min-h-[650px]",
    featured: true,
  },
  {
    title: "Sábanas",
    description: "Frescura, suavidad y un acabado impecable cada noche.",
    image: "/images/Inicio/sabanas.jpeg",
    route: "/productos?categoria=sabanas",
    className: "lg:col-span-6 lg:min-h-[312px]",
  },
  {
    title: "Cobijas",
    description: "Abrigo ligero para disfrutar el descanso.",
    image: "/images/Inicio/cobijas.jpeg",
    route: "/productos?categoria=cobijas",
    className: "lg:col-span-3 lg:min-h-[312px]",
  },
  {
    title: "Colchas",
    description: "Textura y carácter para renovar tu espacio.",
    image: "/images/Inicio/colchas.jpeg",
    route: "/productos?categoria=colchas",
    className: "lg:col-span-3 lg:min-h-[312px]",
  },
];

function Categories() {
  return (
    <section id="categorias" className="bg-linen px-[clamp(24px,6vw,96px)] py-20 sm:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-[680px]">
            <p className="flex items-center gap-2 font-body text-[9px] font-semibold uppercase tracking-[.22em] text-terracotta">
              <Layers3 size={14} />
              Colecciones para cada momento
            </p>
            <h2 className="mt-4 font-display text-[clamp(40px,5vw,64px)] font-normal leading-[.98] text-charcoal">
              Viste tu descanso,
              <span className="block italic text-coffee/75">habita tu estilo.</span>
            </h2>
          </div>
          <div className="max-w-[360px] md:text-right">
            <p className="font-body text-[12px] leading-[1.75] text-coffee/65">
              Explora textiles seleccionados para combinar comodidad, textura y diseño.
            </p>
            <Link to="/productos" className="mt-4 inline-flex items-center gap-2 font-body text-[10px] font-semibold text-terracotta transition-all hover:gap-3">
              Ver todo el catálogo <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.title} {...category} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Categories;
