import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "./useAuth";
import { CartContext } from "./cart-context";

const API_URL = (
  import.meta.env.VITE_API_URL
  ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");


const API_ORIGIN = API_URL.replace(
  /\/api\/v1$/,
  ""
);


const LOCAL_STORAGE_KEY = "linen-house-cart";


// ==========================================================
// LOCAL STORAGE
// ==========================================================

function readGuestCart() {
  try {

    const stored = localStorage.getItem(
      LOCAL_STORAGE_KEY
    );

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(
      stored
    );

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch {

    return [];

  }
}


function saveGuestCart(items) {

  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(items),
  );

}


// ==========================================================
// IMÁGENES DEL BACKEND
// ==========================================================

function resolveImageUrl(imageUrl) {

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

function normalizeProductForCart(product) {

  const primaryImage = (
    product?.images?.find(
      (image) => image.is_primary
    )
    ?? product?.images?.[0]
    ?? null
  );


  const rawImage = (
    product?.image
    ?? product?.image_url
    ?? primaryImage?.image_url
    ?? null
  );


  const rawPrice = (
    product?.price
    ?? product?.base_price
    ?? product?.unit_price
    ?? 0
  );


  return {
    ...product,

    id: product?.id,

    slug: product?.slug,

    name: (
      product?.name
      ?? product?.title
      ?? "Producto"
    ),

    price: Number(
      rawPrice
    ),

    image: resolveImageUrl(
      rawImage
    ),
  };
}




// ==========================================================
// ID LOCAL DEL ITEM
// ==========================================================

function buildCartId(
  productId,
  size,
  color,
) {

  return [
    productId,
    size,
    color,
  ].join("-");

}


// ==========================================================
// CONVERTIR CARRITO BACKEND AL FORMATO QUE YA USA REACT
// ==========================================================

function mapServerCart(serverCart) {

  if (!serverCart?.items) {
    return [];
  }

  return serverCart.items.map(
    (item) => ({
      cartId: buildCartId(
        item.product_id,
        item.size,
        item.color,
      ),

      // ID real de cart_items en MySQL.
      serverItemId: item.id,

      // ID real de la variante.
      variantId: item.variant_id,

      product: {
        id: item.product_id,
        slug: item.product_slug,
        name: item.product_name,

        price: Number(
          item.unit_price
        ),

        image: resolveImageUrl(
          item.image_url
        ),

        available: item.available,
      },

      size: item.size,
      color: item.color,

      quantity: item.quantity,

      stockAvailable: (
        item.stock_available
      ),

      available: item.available,
    })
  );

}


// ==========================================================
// CLAVE PARA SINCRONIZACIÓN
// ==========================================================

function buildSyncKey(
  productSlug,
  size,
  color,
) {

  return [
    String(productSlug)
      .trim()
      .toLowerCase(),

    String(size)
      .trim()
      .toLowerCase(),

    String(color)
      .trim()
      .toLowerCase(),
  ].join("|");

}


// ==========================================================
// LEER MENSAJE DE ERROR FASTAPI
// ==========================================================

async function getApiError(
  response,
  fallbackMessage,
) {

  try {

    const data = await response.json();

    if (
      typeof data?.detail === "string"
    ) {
      return data.detail;
    }

  } catch {
    // No hacemos nada.
  }

  return fallbackMessage;
}


// ==========================================================
// PROVIDER
// ==========================================================

export function CartProvider({
  children,
}) {

  const {
    user,
    loading: authLoading,
  } = useAuth();


  const [
    cartItems,
    setCartItems,
  ] = useState(
    () => readGuestCart()
  );


  const [
    cartLoading,
    setCartLoading,
  ] = useState(false);


  const [
    cartError,
    setCartError,
  ] = useState(null);


  const [
    syncIssues,
    setSyncIssues,
  ] = useState([]);


  // ========================================================
  // ACTUALIZAR CARRITO INVITADO
  // ========================================================

  const updateGuestCart = (
    updater
  ) => {

    setCartItems(
      (currentItems) => {

        const newItems = (
          typeof updater === "function"
            ? updater(currentItems)
            : updater
        );

        saveGuestCart(
          newItems
        );

        return newItems;
      }
    );

  };


  // ========================================================
  // CARGAR CARRITO DEL SERVIDOR
  // ========================================================

  const refreshServerCart =
    async () => {

      setCartLoading(true);
      setCartError(null);

      try {

        const response = await fetch(
          `${API_URL}/cart`,
          {
            method: "GET",
            credentials: "include",
          }
        );


        if (!response.ok) {

          const message = (
            await getApiError(
              response,
              "No fue posible cargar el carrito.",
            )
          );

          setCartError(
            message
          );

          return false;
        }


        const data = (
          await response.json()
        );


        setCartItems(
          mapServerCart(data)
        );


        return true;

      } catch {

        setCartError(
          "No fue posible conectar con el carrito."
        );

        return false;

      } finally {

        setCartLoading(false);

      }

    };


  // ========================================================
  // SINCRONIZAR CARRITO INVITADO DESPUÉS DEL LOGIN
  // ========================================================

  const syncGuestCart =
    async () => {

      const guestItems = (
        readGuestCart()
      );


      setCartLoading(true);
      setCartError(null);
      setSyncIssues([]);


      try {

        // Si no había carrito de invitado,
        // simplemente cargamos el carrito
        // que el usuario ya tenía en su cuenta.

        if (guestItems.length === 0) {

          const response = await fetch(
            `${API_URL}/cart`,
            {
              method: "GET",
              credentials: "include",
            }
          );


          if (!response.ok) {

            const message = (
              await getApiError(
                response,
                "No fue posible cargar el carrito.",
              )
            );

            setCartError(
              message
            );

            return false;
          }


          const serverCart = (
            await response.json()
          );


          setCartItems(
            mapServerCart(
              serverCart
            )
          );


          return true;
        }


        // ================================================
        // PREPARAR CARRITO LOCAL PARA FASTAPI
        // ================================================

        const payload = {

          items: guestItems.map(
            (item) => ({

              product_slug:
                item.product.slug,

              size:
                item.size,

              color:
                item.color,

              quantity:
                item.quantity,

            })
          ),

        };


        // ================================================
        // SINCRONIZAR
        // ================================================

        const response = await fetch(
          `${API_URL}/cart/sync`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
          }
        );


        if (!response.ok) {

          const message = (
            await getApiError(
              response,
              "No fue posible sincronizar el carrito.",
            )
          );

          setCartError(
            message
          );

          return false;
        }


        const data = (
          await response.json()
        );


        // ================================================
        // CARRITO SERVIDOR PASA A SER LA FUENTE PRINCIPAL
        // ================================================

        setCartItems(
          mapServerCart(
            data.cart
          )
        );


        setSyncIssues(
          data.issues ?? []
        );


        // ================================================
        // NO BORRAR ARTÍCULOS QUE FALLARON
        // ================================================

        const failedKeys = new Set(
          (data.issues ?? []).map(
            (issue) =>
              buildSyncKey(
                issue.product_slug,
                issue.size,
                issue.color,
              )
          )
        );


        const unsyncedItems = (
          guestItems.filter(
            (item) =>
              failedKeys.has(
                buildSyncKey(
                  item.product.slug,
                  item.size,
                  item.color,
                )
              )
          )
        );


        if (
          unsyncedItems.length > 0
        ) {

          saveGuestCart(
            unsyncedItems
          );

        } else {

          localStorage.removeItem(
            LOCAL_STORAGE_KEY
          );

        }


        return true;

      } catch {

        setCartError(
          "No fue posible sincronizar el carrito."
        );

        return false;

      } finally {

        setCartLoading(false);

      }

    };


  // ========================================================
  // CAMBIO DE SESIÓN
  // ========================================================

  useEffect(
    () => {

      if (authLoading) {
        return;
      }


      if (user) {

        // Al recargar una página donde
        // ya existía sesión, obtenemos
        // directamente el carrito backend.

        // oxlint-disable-next-line react/set-state-in-effect
        refreshServerCart();

      } else {

        // Si no existe sesión usamos
        // nuevamente el carrito invitado.

        // La sesión es una fuente externa; al cerrar sesión
        // restauramos deliberadamente el carrito persistido.
        // oxlint-disable-next-line react/set-state-in-effect
        setCartItems(
          readGuestCart()
        );

        setSyncIssues([]);
      }

    },
    [
      authLoading,
      user,
    ]
  );


  // ========================================================
  // AGREGAR AL CARRITO
  // ========================================================

  const addToCart =
    async (
      product,
      size,
      color,
      quantity = 1,
    ) => {

      setCartError(null);

      const normalizedProduct = (
        normalizeProductForCart(
          product
        )
      );

      const selectedVariant = (
        product?.variants?.find(
          (variant) =>
            variant.size === size
            && variant.color === color
            && variant.active !== false
            && Number(variant.stock) > 0,
        )
        ?? null
      );

      const normalizedQuantity = Number(
        quantity
      );

      if (
        !selectedVariant?.id
        || !Number.isInteger(normalizedQuantity)
        || normalizedQuantity < 1
      ) {
        setCartError(
          "Selecciona una variante disponible."
        );

        return false;
      }

      const variantStock = Number(
        selectedVariant.stock
      );

      const selectedProduct = {
        ...normalizedProduct,
        price: Number(
          selectedVariant.price
          ?? normalizedProduct.price
        ),
        variantId: selectedVariant.id,
      };

      // ====================================================
      // USUARIO INVITADO
      // ====================================================

      if (!user) {

        const cartId = buildCartId(
          selectedProduct.id,
          size,
          color,
        );

        const currentQuantity = (
          cartItems.find(
            (item) => item.cartId === cartId
          )?.quantity
          ?? 0
        );

        if (
          currentQuantity + normalizedQuantity
          > variantStock
        ) {
          setCartError(
            "La cantidad supera el stock disponible."
          );

          return false;
        }


        updateGuestCart(
          (currentItems) => {

            const existingItem = (
              currentItems.find(
                (item) =>
                  item.cartId
                  === cartId
              )
            );


            if (existingItem) {

              return currentItems.map(
                (item) => {

                  if (
                    item.cartId
                    !== cartId
                  ) {
                    return item;
                  }

                  return {
                    ...item,

                    quantity:
                      item.quantity
                      + normalizedQuantity,
                  };

                }
              );

            }


            return [
              ...currentItems,

              {
                cartId,
                variantId: selectedVariant.id,
                product: selectedProduct,
                size,
                color,
                quantity: normalizedQuantity,
                stockAvailable: variantStock,
                available: true,
              },
            ];

          }
        );


        return true;
      }


      // ====================================================
      // USUARIO AUTENTICADO
      // ====================================================

      try {

        const response = await fetch(
          `${API_URL}/cart/items`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              variant_id: selectedVariant.id,
              quantity: normalizedQuantity,
            }),
          }
        );


        if (!response.ok) {

          const message = (
            await getApiError(
              response,
              "No fue posible agregar el producto.",
            )
          );

          setCartError(
            message
          );

          return false;
        }


        const data = (
          await response.json()
        );


        setCartItems(
          mapServerCart(data)
        );


        return true;

      } catch {

        setCartError(
          "No fue posible agregar el producto."
        );

        return false;

      }

    };


  // ========================================================
  // ACTUALIZAR CANTIDAD
  // ========================================================

  const updateQuantity =
    async (
      cartId,
      quantity,
    ) => {

      if (quantity < 1) {
        return false;
      }


      setCartError(null);


      // ====================================================
      // INVITADO
      // ====================================================

      if (!user) {

        const item = cartItems.find(
          (cartItem) => cartItem.cartId === cartId
        );

        if (
          item?.stockAvailable != null
          && quantity > item.stockAvailable
        ) {
          setCartError(
            "La cantidad supera el stock disponible."
          );

          return false;
        }

        updateGuestCart(
          (currentItems) =>
            currentItems.map(
              (item) =>
                item.cartId
                === cartId

                  ? {
                      ...item,
                      quantity,
                    }

                  : item
            )
        );


        return true;
      }


      // ====================================================
      // AUTENTICADO
      // ====================================================

      const item = (
        cartItems.find(
          (cartItem) =>
            cartItem.cartId
            === cartId
        )
      );


      if (!item?.serverItemId) {

        setCartError(
          "No fue posible identificar el producto del carrito."
        );

        return false;
      }


      try {

        const response = await fetch(
          `${API_URL}/cart/items/${item.serverItemId}`,
          {
            method: "PUT",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              quantity,
            }),
          }
        );


        if (!response.ok) {

          const message = (
            await getApiError(
              response,
              "No fue posible cambiar la cantidad.",
            )
          );

          setCartError(
            message
          );

          return false;
        }


        const data = (
          await response.json()
        );


        setCartItems(
          mapServerCart(data)
        );


        return true;

      } catch {

        setCartError(
          "No fue posible cambiar la cantidad."
        );

        return false;

      }

    };


  // ========================================================
  // ELIMINAR PRODUCTO
  // ========================================================

  const removeFromCart =
    async (
      cartId
    ) => {

      setCartError(null);


      if (!user) {

        updateGuestCart(
          (currentItems) =>
            currentItems.filter(
              (item) =>
                item.cartId
                !== cartId
            )
        );

        return true;
      }


      const item = (
        cartItems.find(
          (cartItem) =>
            cartItem.cartId
            === cartId
        )
      );


      if (!item?.serverItemId) {

        setCartError(
          "No fue posible identificar el producto del carrito."
        );

        return false;
      }


      try {

        const response = await fetch(
          `${API_URL}/cart/items/${item.serverItemId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );


        if (!response.ok) {

          const message = (
            await getApiError(
              response,
              "No fue posible eliminar el producto.",
            )
          );

          setCartError(
            message
          );

          return false;
        }


        await refreshServerCart();


        return true;

      } catch {

        setCartError(
          "No fue posible eliminar el producto."
        );

        return false;

      }

    };


  // ========================================================
  // VACIAR CARRITO
  // ========================================================

  const clearCart =
    async () => {

      setCartError(null);


      if (!user) {

        updateGuestCart([]);

        return true;
      }


      try {

        const response = await fetch(
          `${API_URL}/cart`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );


        if (!response.ok) {

          const message = (
            await getApiError(
              response,
              "No fue posible vaciar el carrito.",
            )
          );

          setCartError(
            message
          );

          return false;
        }


        setCartItems([]);


        return true;

      } catch {

        setCartError(
          "No fue posible vaciar el carrito."
        );

        return false;

      }

    };


  // ========================================================
  // TOTALES
  // ========================================================

  const totalItems = useMemo(
    () =>
      cartItems.reduce(
        (
          total,
          item,
        ) =>
          total
          + item.quantity,
        0
      ),
    [cartItems]
  );


  const subtotal = useMemo(
  () =>
    cartItems.reduce(
      (
        total,
        item,
      ) => {

        const price = Number(
          item?.product?.price
          ?? item?.product?.base_price
          ?? 0
        );


        const quantity = Number(
          item?.quantity
          ?? 0
        );


        return (
          total
          + (
            Number.isFinite(price)
              ? price * quantity
              : 0
          )
        );
      },
      0
    ),
  [cartItems]
);

  // ========================================================
  // CONTEXT
  // ========================================================

  const value = {

    cartItems,

    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,

    totalItems,
    subtotal,

    cartLoading,
    cartError,

    syncIssues,

    syncGuestCart,
    refreshCart:
      refreshServerCart,

  };


  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
}


// ==========================================================
// HOOK
// ==========================================================

