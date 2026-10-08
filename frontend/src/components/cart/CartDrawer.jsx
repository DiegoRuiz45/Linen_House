import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import { useCart } from "../../context/useCart";
import { useNavigate } from "react-router-dom";


function CartDrawer({
  open,
  onClose,
}) {

  const navigate = useNavigate();
  const goToCheckout = () => {
  onClose();
  navigate("/checkout");
  };

  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    subtotal,
  } = useCart();


  const formatPrice = (price) =>
    new Intl.NumberFormat(
      "es-CO",
      {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }
    ).format(price);


  if (!open) {
    return null;
  }


  return (
    <div
      className="
        fixed
        inset-0

        z-[200]
      "
    >

      {/* FONDO */}

      <div
        className="
          absolute
          inset-0

          bg-black/40

          backdrop-blur-[2px]
        "
        onClick={onClose}
      />


      {/* PANEL */}

      <aside
        className="
          absolute

          top-0
          right-0

          w-full

          sm:w-[440px]

          h-full

          bg-linen

          shadow-2xl

          flex
          flex-col
        "
      >

        {/* HEADER */}

        <div
          className="
            h-[85px]

            px-[25px]

            flex
            items-center
            justify-between

            border-b
            border-black/10
          "
        >

          <div
            className="
              flex
              items-center

              gap-[10px]
            "
          >

            <ShoppingBag
              size={20}
              strokeWidth={1.7}
            />

            <h2
              className="
                font-display

                text-[24px]

                text-charcoal
              "
            >
              Tu carrito
            </h2>

          </div>


          <button
            type="button"

            onClick={onClose}

            aria-label="Cerrar carrito"

            className="
              w-[38px]
              h-[38px]

              rounded-full

              flex
              items-center
              justify-center

              transition-colors

              hover:bg-black/5
            "
          >
            <X size={19} />
          </button>

        </div>


        {/* PRODUCTOS */}

        <div
          className="
            flex-1

            overflow-y-auto

            px-[25px]

            py-[20px]
          "
        >

          {cartItems.length === 0 ? (

            <div
              className="
                h-full

                flex
                flex-col

                items-center
                justify-center

                text-center
              "
            >

              <ShoppingBag
                size={40}

                strokeWidth={1.2}

                className="
                  mb-[18px]

                  text-coffee/50
                "
              />


              <h3
                className="
                  font-display

                  text-[25px]

                  text-charcoal
                "
              >
                Tu carrito está vacío
              </h3>


              <p
                className="
                  mt-[8px]

                  font-body

                  text-[13px]

                  text-coffee/65
                "
              >
                Agrega productos para comenzar tu compra.
              </p>

            </div>

          ) : (

            <div
              className="
                flex
                flex-col

                gap-[20px]
              "
            >

              {cartItems.map(
                (item) => (

                  <div
                    key={item.cartId}

                    className="
                      grid

                      grid-cols-[95px_1fr]

                      gap-[15px]

                      pb-[20px]

                      border-b
                      border-black/10
                    "
                  >

                    {/* IMAGEN */}

                    <div
                      className="
                        aspect-[4/5]

                        overflow-hidden

                        rounded-[9px]

                        bg-linen-dark
                      "
                    >

                      <img
                        src={
                          item.product.image
                        }

                        alt={
                          item.product.name
                        }

                        className="
                          w-full
                          h-full

                          object-cover
                        "
                      />

                    </div>


                    {/* INFORMACIÓN */}

                    <div
                      className="
                        min-w-0
                      "
                    >

                      <div
                        className="
                          flex

                          items-start

                          justify-between

                          gap-[10px]
                        "
                      >

                        <div>

                          <h3
                            className="
                              font-display

                              text-[17px]

                              leading-[1.25]

                              text-charcoal
                            "
                          >
                            {item.product.name}
                          </h3>


                          <p
                            className="
                              mt-[5px]

                              font-body

                              text-[11px]

                              text-coffee/65
                            "
                          >
                            {item.size}

                            {" · "}

                            {item.color}
                          </p>

                        </div>


                        <button
                          type="button"

                          onClick={() =>
                            removeFromCart(
                              item.cartId
                            )
                          }

                          aria-label="Eliminar producto"

                          className="
                            text-coffee/50

                            transition-colors

                            hover:text-terracotta
                          "
                        >
                          <Trash2
                            size={16}
                          />
                        </button>

                      </div>


                      <p
                        className="
                          mt-[10px]

                          font-body

                          text-[13px]

                          font-medium

                          text-charcoal
                        "
                      >
                        {formatPrice(
                          item.product.price
                        )}
                      </p>


                      {/* CANTIDAD */}

                      <div
                        className="
                          mt-[14px]

                          flex

                          items-center

                          justify-between
                        "
                      >

                        <div
                          className="
                            h-[36px]

                            flex
                            items-center

                            rounded-full

                            border
                            border-black/15
                          "
                        >

                          <button
                            type="button"

                            disabled={
                              item.quantity <= 1
                            }

                            onClick={() =>
                              updateQuantity(
                                item.cartId,
                                item.quantity -
                                  1
                              )
                            }

                            className="
                              w-[34px]

                              h-full

                              flex
                              items-center
                              justify-center

                              disabled:opacity-30
                            "
                          >
                            <Minus
                              size={13}
                            />
                          </button>


                          <span
                            className="
                              w-[28px]

                              text-center

                              font-body

                              text-[12px]
                            "
                          >
                            {item.quantity}
                          </span>


                          <button
                            type="button"

                            onClick={() =>
                              updateQuantity(
                                item.cartId,
                                item.quantity +
                                  1
                              )
                            }

                            className="
                              w-[34px]

                              h-full

                              flex
                              items-center
                              justify-center
                            "
                          >
                            <Plus
                              size={13}
                            />
                          </button>

                        </div>


                        <p
                          className="
                            font-body

                            text-[13px]

                            font-semibold
                          "
                        >
                          {formatPrice(
                            item.product.price *
                              item.quantity
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>


        {/* FOOTER */}

        {cartItems.length > 0 && (

          <div
            className="
              px-[25px]

              py-[24px]

              border-t
              border-black/10

              bg-linen-header
            "
          >

            <div
              className="
                flex

                items-center

                justify-between

                mb-[18px]
              "
            >

              <span
                className="
                  font-body

                  text-[13px]

                  text-coffee
                "
              >
                Subtotal
              </span>


              <span
                className="
                  font-display

                  text-[22px]

                  text-charcoal
                "
              >
                {formatPrice(subtotal)}
              </span>

            </div>


            <button
              type="button"

              onClick={goToCheckout}

              className="
                w-full

                h-[52px]

                rounded-full

                bg-terracotta

                font-body

                text-[13px]

                font-semibold

                text-white

                transition-colors

                hover:bg-terracotta-dark
              "
            >
              Continuar compra
            </button>


            <p
              className="
                mt-[12px]

                text-center

                font-body

                text-[10px]

                text-coffee/55
              "
            >
              El envío se calculará al finalizar la compra.
            </p>

          </div>

        )}

      </aside>

    </div>
  );
}


export default CartDrawer;
