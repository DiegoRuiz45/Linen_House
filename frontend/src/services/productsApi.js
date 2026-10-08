const API_URL = (
  import.meta.env.VITE_API_URL
  ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

const API_ORIGIN = API_URL.replace(
  /\/api\/v1$/,
  "",
);

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

export function resolveProductImageUrl(imageUrl) {
  if (!imageUrl) {
    return null;
  }

  if (
    imageUrl.startsWith("http://")
    || imageUrl.startsWith("https://")
  ) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl}`;
}

function normalizeImage(image) {
  return {
    ...image,
    image_url: resolveProductImageUrl(
      image?.image_url,
    ),
  };
}

function normalizeVariant(
  variant,
  basePrice,
  basePreviousPrice,
) {
  const stock = toNumber(variant?.stock);
  const active = Boolean(variant?.active);

  return {
    ...variant,
    id: toNumber(variant?.id),
    product_id: toNumber(variant?.product_id),
    price: toNumber(
      variant?.price,
      basePrice,
    ),
    oldPrice: variant?.previous_price == null
      ? basePreviousPrice
      : toNumber(variant.previous_price),
    stock,
    active,
    available: active && stock > 0,
  };
}

export function normalizeCatalogProduct(product) {
  const price = toNumber(product?.base_price);
  const oldPrice = product?.previous_price == null
    ? null
    : toNumber(product.previous_price);
  const stock = toNumber(product?.stock_total);

  return {
    ...product,
    id: toNumber(product?.id),
    categoryId: toNumber(product?.category_id),
    category: product?.category_slug ?? "",
    categoryName: product?.category_name ?? "",
    price,
    oldPrice,
    image: resolveProductImageUrl(
      product?.primary_image_url,
    ),
    sizes: Array.isArray(product?.sizes)
      ? product.sizes
      : [],
    colors: Array.isArray(product?.colors)
      ? product.colors
      : [],
    stock,
    available: Boolean(
      product?.active
      && product?.in_stock
      && stock > 0,
    ),
  };
}

export function normalizeProductDetail(product) {
  const catalogProduct = normalizeCatalogProduct({
    ...product,
    category_name: product?.category_name,
    category_slug: product?.category_slug,
    primary_image_url: (
      product?.images?.find(
        (image) => image.is_primary,
      )?.image_url
      ?? product?.images?.[0]?.image_url
      ?? null
    ),
  });

  const variants = Array.isArray(product?.variants)
    ? product.variants.map(
        (variant) => normalizeVariant(
          variant,
          catalogProduct.price,
          catalogProduct.oldPrice,
        ),
      )
    : [];

  const images = Array.isArray(product?.images)
    ? product.images
        .map(normalizeImage)
        .sort(
          (first, second) =>
            first.position - second.position,
        )
    : [];

  const activeVariants = variants.filter(
    (variant) => variant.active,
  );
  const availableVariants = activeVariants.filter(
    (variant) => variant.available,
  );

  return {
    ...catalogProduct,
    images,
    variants,
    image: (
      images.find((image) => image.is_primary)
        ?.image_url
      ?? images[0]?.image_url
      ?? catalogProduct.image
    ),
    sizes: [
      ...new Set(
        activeVariants.map(
          (variant) => variant.size,
        ),
      ),
    ],
    colors: [
      ...new Set(
        activeVariants.map(
          (variant) => variant.color,
        ),
      ),
    ],
    stock: availableVariants.reduce(
      (total, variant) => total + variant.stock,
      0,
    ),
    available: Boolean(
      product?.active
      && availableVariants.length > 0,
    ),
  };
}

async function getApiError(response, fallbackMessage) {
  try {
    const data = await response.json();

    if (typeof data?.detail === "string") {
      return data.detail;
    }
  } catch {
    // La respuesta no contenía JSON utilizable.
  }

  return fallbackMessage;
}

export async function getProducts(options = {}) {
  const response = await fetch(
    `${API_URL}/products`,
    {
      method: "GET",
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      await getApiError(
        response,
        "No fue posible cargar los productos.",
      ),
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data.map(normalizeCatalogProduct)
    : [];
}

export async function getCategories(options = {}) {
  const response = await fetch(
    `${API_URL}/categories`,
    {
      method: "GET",
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      await getApiError(
        response,
        "No fue posible cargar las categorías.",
      ),
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data.map((category) => ({
        ...category,
        id: toNumber(category?.id),
        name: category?.name ?? "Categoría",
        slug: category?.slug ?? "",
      }))
    : [];
}

export async function getProductBySlug(
  slug,
  options = {},
) {
  const response = await fetch(
    `${API_URL}/products/${encodeURIComponent(slug)}`,
    {
      method: "GET",
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      await getApiError(
        response,
        "No fue posible cargar el producto.",
      ),
    );
  }

  return normalizeProductDetail(
    await response.json(),
  );
}
