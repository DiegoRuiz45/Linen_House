import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Check,
  ChevronDown,
  Layers3,
  PackageSearch,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import Header from "../components/layout/Header";
import ProductCard from "../components/product/ProductCard";
import ProductModal from "../components/product/ProductModal";
import {
  getCategories,
  getProducts,
} from "../services/productsApi";

const DEFAULT_CATEGORIES = [
  { id: "default-cubrelechos", name: "Cubrelechos", slug: "cubrelechos" },
  { id: "default-sabanas", name: "Sábanas", slug: "sabanas" },
  { id: "default-cobijas", name: "Cobijas", slug: "cobijas" },
  { id: "default-colchas", name: "Colchas", slug: "colchas" },
];

const PRICE_LIMIT = 1_000_000;

function formatPrice(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function Products() {
  const [searchParams] = useSearchParams();
  const requestedCategory = (
    searchParams.get("categoria")
    ?? "cubrelechos"
  ).trim().toLowerCase();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(requestedCategory);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [reloadCatalog, setReloadCatalog] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState(PRICE_LIMIT);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError("");

      try {
        const [catalogProducts, catalogCategories] = await Promise.all([
          getProducts({ signal: controller.signal }),
          getCategories({ signal: controller.signal }),
        ]);

        const categorySlugs = new Set([
          ...DEFAULT_CATEGORIES.map((category) => category.slug),
          ...catalogCategories.map((category) => category.slug),
          ...catalogProducts.map((product) => product.category),
        ]);
        const initialCategory = categorySlugs.has(requestedCategory)
          ? requestedCategory
          : "cubrelechos";
        setProducts(catalogProducts);
        setCategories(catalogCategories);
        setSelectedCategory(initialCategory);
        setMaxPrice(PRICE_LIMIT);
      } catch (error) {
        if (error.name !== "AbortError") {
          setCatalogError(
            error.message || "No fue posible cargar los productos.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setCatalogLoading(false);
      }
    };

    loadCatalog();
    return () => controller.abort();
  }, [reloadCatalog, requestedCategory]);

  const categoryOptions = useMemo(() => {
    const options = new Map();
    DEFAULT_CATEGORIES.forEach((category) => {
      options.set(category.slug, category);
    });
    categories.forEach((category) => {
      if (category.slug) options.set(category.slug, category);
    });
    products.forEach((product) => {
      if (product.category && !options.has(product.category)) {
        options.set(product.category, {
          id: `product-${product.category}`,
          name: product.categoryName || product.category,
          slug: product.category,
        });
      }
    });

    return [...options.values()].sort((first, second) => {
      if (first.slug === "cubrelechos") return -1;
      if (second.slug === "cubrelechos") return 1;
      return first.name.localeCompare(second.name, "es");
    });
  }, [categories, products]);

  const selectedCategoryName = categoryOptions.find(
    (category) => category.slug === selectedCategory,
  )?.name ?? "Productos";

  const collectionProducts = useMemo(
    () => products.filter(
      (product) => product.category === selectedCategory,
    ),
    [products, selectedCategory],
  );

  const sizes = useMemo(
    () => [
      ...new Set(
        collectionProducts.flatMap((product) => product.sizes ?? []),
      ),
    ],
    [collectionProducts],
  );

  const colors = useMemo(
    () => [
      ...new Set(
        collectionProducts.flatMap((product) => product.colors ?? []),
      ),
    ],
    [collectionProducts],
  );

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase("es");
    const result = collectionProducts.filter((product) => {
      const searchable = [
        product.name,
        product.categoryName,
        ...(product.colors ?? []),
        ...(product.sizes ?? []),
      ].join(" ").toLocaleLowerCase("es");

      return (
        (!search || searchable.includes(search))
        && (
          selectedSizes.length === 0
          || selectedSizes.some((size) => product.sizes?.includes(size))
        )
        && (
          selectedColors.length === 0
          || selectedColors.some((color) => product.colors?.includes(color))
        )
        && (!onlyAvailable || product.available)
        && product.price <= maxPrice
      );
    });

    switch (sort) {
      case "price-low":
        result.sort((first, second) => first.price - second.price);
        break;
      case "price-high":
        result.sort((first, second) => second.price - first.price);
        break;
      case "name":
        result.sort((first, second) => first.name.localeCompare(second.name, "es"));
        break;
      default:
        result.sort(
          (first, second) => Number(second.featured) - Number(first.featured),
        );
    }

    return result;
  }, [
    collectionProducts,
    maxPrice,
    onlyAvailable,
    searchTerm,
    selectedColors,
    selectedSizes,
    sort,
  ]);

  const activeFilterCount = (
    selectedSizes.length
    + selectedColors.length
    + Number(onlyAvailable)
    + Number(maxPrice < PRICE_LIMIT)
  );

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSizes([]);
    setSelectedColors([]);
    setOnlyAvailable(false);
    setMaxPrice(PRICE_LIMIT);
    setSort("featured");
  };

  const changeCategory = (slug) => {
    if (slug === selectedCategory) return;
    setSelectedCategory(slug);
    setSearchTerm("");
    setSelectedSizes([]);
    setSelectedColors([]);
    setOnlyAvailable(false);
    setMaxPrice(PRICE_LIMIT);
    setSort("featured");
    setFiltersOpen(false);
  };

  const toggleFilter = (value, selectedValues, setSelectedValues) => {
    setSelectedValues(
      selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value],
    );
  };

  return (
    <div className="min-h-screen w-full bg-linen">
      <Header />

      <main>
        <section className="border-b border-black/[0.06] bg-linen-soft/45 px-[clamp(20px,6vw,96px)] py-5" aria-label="Categorías">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-terracotta/[0.08] text-terracotta">
                <Layers3 size={17} />
              </span>
              <div>
                <p className="font-body text-[9px] font-semibold uppercase tracking-[.16em] text-coffee/50">Colección actual</p>
                <h1 className="font-display text-[25px] leading-tight text-charcoal">{selectedCategoryName}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              {categoryOptions.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => changeCategory(category.slug)}
                  aria-pressed={selectedCategory === category.slug}
                  className={`h-10 shrink-0 rounded-full border px-5 font-body text-[10px] font-semibold transition-all ${
                    selectedCategory === category.slug
                      ? "border-terracotta bg-terracotta text-white shadow-[0_7px_18px_rgba(176,92,66,.18)]"
                      : "border-black/10 bg-linen text-charcoal hover:border-terracotta/40 hover:text-terracotta"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-[clamp(20px,6vw,96px)] py-8 sm:py-10">
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-8 flex flex-col gap-4 border-b border-black/[0.08] pb-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-[460px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-coffee/50" size={18} />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={`Buscar en ${selectedCategoryName.toLocaleLowerCase("es")}…`}
                  className="h-[50px] w-full rounded-full border border-black/10 bg-white/35 pl-12 pr-11 font-body text-xs text-charcoal outline-none transition-all placeholder:text-coffee/40 focus:border-terracotta/60 focus:bg-white/60 focus:shadow-[0_8px_25px_rgba(58,43,31,.06)]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-coffee/50 hover:text-terracotta"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((current) => !current)}
                  className="flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white/35 px-4 font-body text-[11px] font-semibold text-charcoal lg:hidden"
                >
                  <SlidersHorizontal size={16} />
                  Filtros
                  {activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-terracotta px-1 text-[9px] text-white">{activeFilterCount}</span>}
                </button>

                <p className="font-body text-[11px] text-coffee/60">
                  <strong className="font-semibold text-charcoal">{filteredProducts.length}</strong> resultados
                </p>

                <div className="relative">
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    aria-label="Ordenar productos"
                    className="h-11 appearance-none rounded-full border border-black/10 bg-linen pl-4 pr-10 font-body text-[11px] font-semibold text-charcoal outline-none focus:border-terracotta/60"
                  >
                    <option value="featured">Destacados</option>
                    <option value="price-low">Menor precio</option>
                    <option value="price-high">Mayor precio</option>
                    <option value="name">Nombre A–Z</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={14} />
                </div>
              </div>
            </div>

            <div className="grid gap-9 lg:grid-cols-[280px_minmax(0,1fr)] xl:gap-12">
              <aside className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
                <div className="overflow-hidden rounded-[26px] border border-black/[0.07] bg-linen-soft/70 shadow-[0_14px_40px_rgba(58,43,31,.06)] lg:sticky lg:top-[92px]">
                  <div className="flex items-center justify-between border-b border-black/[0.07] bg-white/35 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-terracotta/[0.09] text-terracotta">
                        <SlidersHorizontal size={16} />
                      </span>
                      <div>
                        <h2 className="font-body text-xs font-semibold text-charcoal">Filtros</h2>
                        <p className="mt-0.5 font-body text-[9px] text-coffee/45">Personaliza la búsqueda</p>
                      </div>
                    </div>
                    {activeFilterCount > 0 && (
                      <button type="button" onClick={clearFilters} className="rounded-full border border-terracotta/20 px-3 py-1.5 font-body text-[9px] font-semibold text-terracotta transition-colors hover:bg-terracotta hover:text-white">
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="px-6 pb-6">
                    <FilterGroup title="Tamaño">
                      {sizes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {sizes.map((size) => (
                            <FilterChip
                              key={size}
                              label={size}
                              active={selectedSizes.includes(size)}
                              onClick={() => toggleFilter(size, selectedSizes, setSelectedSizes)}
                            />
                          ))}
                        </div>
                      ) : <EmptyFilterText />}
                    </FilterGroup>

                    <FilterGroup title="Color">
                      {colors.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {colors.map((color) => (
                            <FilterChip
                              key={color}
                              label={color}
                              active={selectedColors.includes(color)}
                              onClick={() => toggleFilter(color, selectedColors, setSelectedColors)}
                            />
                          ))}
                        </div>
                      ) : <EmptyFilterText />}
                    </FilterGroup>

                    <FilterGroup title="Precio máximo">
                      <div className="rounded-2xl border border-black/[0.06] bg-white/40 p-4">
                        <div className="mb-4 flex items-end justify-between gap-3">
                          <span className="font-body text-[9px] uppercase tracking-[.12em] text-coffee/45">Hasta</span>
                          <strong className="font-body text-sm font-semibold text-charcoal">{formatPrice(maxPrice)}</strong>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={PRICE_LIMIT}
                          step={10000}
                          value={maxPrice}
                          onChange={(event) => setMaxPrice(Number(event.target.value))}
                          className="catalog-price-range w-full cursor-pointer"
                        />
                        <div className="mt-3 flex justify-between font-body text-[9px] text-coffee/45">
                          <span>$0</span>
                          <span>$1.000.000</span>
                        </div>
                      </div>
                    </FilterGroup>

                    <button
                      type="button"
                      onClick={() => setOnlyAvailable((current) => !current)}
                      aria-pressed={onlyAvailable}
                      className="mt-5 flex w-full items-center justify-between rounded-2xl border border-black/[0.07] bg-white/35 px-4 py-3.5 text-left transition-all hover:border-terracotta/30"
                    >
                      <span>
                        <strong className="block font-body text-[11px] font-semibold text-charcoal">Solo disponibles</strong>
                        <small className="mt-1 block font-body text-[9px] text-coffee/45">Oculta productos agotados</small>
                      </span>
                      <span className={`relative h-6 w-11 rounded-full transition-colors ${onlyAvailable ? "bg-terracotta" : "bg-black/10"}`}>
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${onlyAvailable ? "translate-x-6" : "translate-x-1"}`} />
                      </span>
                    </button>

                    {filtersOpen && (
                      <button type="button" onClick={() => setFiltersOpen(false)} className="mt-5 h-11 w-full rounded-full bg-charcoal font-body text-[11px] font-semibold text-white lg:hidden">
                        Ver {filteredProducts.length} productos
                      </button>
                    )}
                  </div>
                </div>
              </aside>

              <div className="min-w-0">
                {catalogLoading ? (
                  <CatalogMessage
                    icon={<Sparkles size={24} />}
                    title="Preparando la colección"
                    message="Estamos organizando los productos para ti."
                  />
                ) : catalogError ? (
                  <CatalogMessage
                    icon={<PackageSearch size={24} />}
                    title="No pudimos cargar el catálogo"
                    message={catalogError}
                    actionLabel="Intentar nuevamente"
                    onAction={() => setReloadCatalog((current) => current + 1)}
                  />
                ) : filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSelect={setSelectedProduct}
                      />
                    ))}
                  </div>
                ) : (
                  <CatalogMessage
                    icon={<PackageSearch size={26} />}
                    title={
                      collectionProducts.length === 0
                        ? `Próximamente en ${selectedCategoryName}`
                        : "No encontramos coincidencias"
                    }
                    message={
                      collectionProducts.length === 0
                        ? "Esta colección está preparada y pronto tendrá productos disponibles."
                        : "Prueba con otra búsqueda o elimina algunos filtros."
                    }
                    actionLabel={
                      collectionProducts.length === 0
                        ? "Ver Cubrelechos"
                        : "Limpiar filtros"
                    }
                    onAction={
                      collectionProducts.length === 0
                        ? () => changeCategory("cubrelechos")
                        : clearFilters
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {selectedProduct && (
        <ProductModal
          key={selectedProduct.id}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div className="border-b border-black/[0.07] py-5 last:border-b-0">
      <h3 className="mb-3 font-body text-[10px] font-semibold uppercase tracking-[.14em] text-coffee/65">{title}</h3>
      {children}
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 font-body text-[10px] font-semibold transition-all ${
        active
          ? "border-terracotta bg-terracotta text-white shadow-[0_5px_14px_rgba(176,92,66,.16)]"
          : "border-black/10 bg-white/35 text-coffee hover:border-terracotta/35 hover:text-terracotta"
      }`}
    >
      {active && <Check size={11} />}
      {label}
    </button>
  );
}

function EmptyFilterText() {
  return <p className="font-body text-[10px] leading-relaxed text-coffee/45">Sin opciones en esta colección.</p>;
}

function CatalogMessage({ icon, title, message, actionLabel, onAction }) {
  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center rounded-[26px] border border-dashed border-black/10 bg-white/20 px-7 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-terracotta/[0.08] text-terracotta">{icon}</span>
      <h2 className="mt-5 font-display text-[32px] leading-tight text-charcoal">{title}</h2>
      <p className="mt-3 max-w-[410px] font-body text-xs leading-[1.75] text-coffee/65">{message}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-6 h-11 rounded-full bg-terracotta px-6 font-body text-[11px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-dark">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default Products;
