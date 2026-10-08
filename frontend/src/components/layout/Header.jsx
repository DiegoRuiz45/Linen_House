import {
  ShoppingCart,
  UserRound,
  LogOut,
  ChevronDown,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
  NavLink,
} from "react-router-dom";

import { useCart } from "../../context/useCart";

import CartDrawer from "../cart/CartDrawer";

import { useState } from "react";

import { useAuth } from "../../context/useAuth";

import LoginModal from "../auth/LoginModal";


function Header() {

  const [
    cartOpen,
    setCartOpen,
  ] = useState(false);


  const {
    totalItems,
  } = useCart();

  const {
  user,
  loading,
  logout,
} = useAuth();


const [loginOpen, setLoginOpen] =
  useState(false);


const [
  accountOpen,
  setAccountOpen,
] = useState(false);


  const navigation = [
    {
      name: "Inicio",
      path: "/",
    },

      {
        name: "Productos",
        path: "/productos",
      },
  ];


  return (
    <>
      <header
        className="
          sticky
          top-0
          z-[80]

          w-full

          h-[82px]

          bg-linen-header/95

          backdrop-blur-xl

          border-b
          border-black/[0.05]

          shadow-[0_8px_30px_rgba(58,43,31,0.04)]
        "
      >

        <div
          className="
            w-full
            h-full

            px-[clamp(24px,5vw,96px)]

            grid

            grid-cols-[1fr_auto_1fr]

            items-center
          "
        >

          {/* LOGO */}

          <Link
            to="/"

            className="
              justify-self-start

              group

              flex
              items-center

              gap-3
            "
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-terracotta/25 bg-terracotta/[0.07] font-display text-[17px] text-terracotta transition-all duration-300 group-hover:border-terracotta/50 group-hover:bg-terracotta group-hover:text-white">
              LH
            </span>

            <span className="flex flex-col whitespace-nowrap">
              <span className="font-display text-[25px] leading-none tracking-[-0.025em] text-charcoal transition-colors group-hover:text-terracotta sm:text-[27px]">
                Linen House
              </span>
              <span className="mt-1 hidden font-body text-[7px] font-semibold uppercase tracking-[.28em] text-coffee/45 sm:block">
                Ropa de hogar
              </span>
            </span>
          </Link>


          {/* NAVEGACIÓN */}

          <nav
            className="
              hidden

              lg:flex

              items-center

              gap-1

              rounded-full

              border
              border-black/[0.07]

              bg-white/35

              p-1

              shadow-[0_6px_20px_rgba(58,43,31,0.04)]
            "
          >

            {navigation.map(
              (item) => (

                <NavLink
                  key={item.name}

                  to={item.path}

                  className={({
                    isActive,
                  }) => `
                    flex
                    items-center

                    justify-center

                    h-10

                    min-w-[108px]

                    px-5

                    rounded-full

                    font-body

                    text-[11px]

                    font-semibold

                    transition-all

                    duration-200

                    ${
                      isActive
                        ? "bg-terracotta text-white shadow-[0_7px_18px_rgba(176,92,66,.2)]"
                        : "text-charcoal hover:bg-linen-dark/55 hover:text-terracotta"
                    }
                  `}
                >
                  {item.name}
                </NavLink>

              )
            )}

          </nav>


          {/* ICONOS */}

          <div
            className="
              justify-self-end

              flex
              items-center

              gap-3
            "
          >

              {!loading && user?.role === "customer" && (
                <Link
                  to="/mis-pedidos"
                  className="hidden h-10 items-center gap-2 rounded-full border border-terracotta/25 bg-terracotta/[0.06] px-4 font-body text-[10px] font-semibold text-terracotta transition-all hover:-translate-y-0.5 hover:border-terracotta hover:bg-terracotta hover:text-white md:flex"
                >
                  <PackageSearch size={16} />
                  Mis pedidos
                </Link>
              )}


            <div
              className="
          relative
        "
                  >

                    {loading ? (

                      <div
                        className="
              w-[35px]
              h-[35px]

              rounded-full

              bg-black/[0.05]

              animate-pulse
            "
                      />

                    ) : user ? (

                      <button
                        type="button"

                        onClick={() =>
                          setAccountOpen(
                            (current) => !current
                          )
                        }

                        className="
              flex

              items-center

              gap-[8px]

              h-11

              rounded-full

              border
              border-transparent

              bg-white/20

              pl-1.5
              pr-3

              text-charcoal

              transition-all

              hover:border-black/[0.07]
              hover:bg-white/55
            "
                      >

                        {user.avatar_url ? (

                          <img
                            src={user.avatar_url}

                            alt={user.first_name}

                            referrerPolicy="no-referrer"

                            className="
                  w-[34px]
                  h-[34px]

                  rounded-full

                  object-cover
                "
                          />

                        ) : (

                          <div
                            className="
                  w-[34px]
                  h-[34px]

                  flex
                  items-center
                  justify-center

                  rounded-full

                  bg-linen-dark
                "
                          >

                            <UserRound
                              size={17}
                            />

                          </div>

                        )}


                        <span
                          className="
                hidden

                xl:block

                font-body

                text-[12px]

                font-medium
              "
                        >
                          {user.first_name}
                        </span>


                        <ChevronDown
                          size={13}

                          className="
                hidden
                xl:block
              "
                        />

                      </button>

                    ) : (

                      <button
                        type="button"

                        onClick={() =>
                          setLoginOpen(true)
                        }

                        aria-label="Iniciar sesión"

                        className="
              flex
              items-center
              justify-center

              h-10
              w-10

              rounded-full

              border
              border-black/[0.07]

              bg-white/30

              text-charcoal

              transition-all

              hover:bg-terracotta
              hover:text-white
            "
                      >

                        <UserRound
                          size={20}
                        />

                      </button>

                    )}


                    {/* MENÚ DE USUARIO */}

                    {user && accountOpen && (

                      <div
                        className="
              absolute

              top-[calc(100%+14px)]
              right-0

              z-[150]

              w-[245px]

              overflow-hidden

              rounded-[14px]

              border
              border-black/[0.07]

              bg-linen

              shadow-xl
            "
                      >

                        <div
                          className="
                px-[18px]
                py-[16px]

                border-b

                border-black/[0.07]
              "
                        >

                          <p
                            className="
                  font-body

                  text-[12px]

                  font-semibold

                  text-charcoal
                "
                          >
                            {user.first_name}
                            {" "}
                            {user.last_name || ""}
                          </p>


                          <p
                            className="
                  mt-[3px]

                  truncate

                  font-body

                  text-[10px]

                  text-coffee/55
                "
                          >
                            {user.email}
                          </p>


                          {user.role === "admin" && (

                            <span
                              className="
                    inline-block

                    mt-[9px]

                    rounded-full

                    bg-terracotta/10

                    px-[9px]
                    py-[4px]

                    font-body

                    text-[9px]

                    font-semibold

                    uppercase

                    tracking-[0.1em]

                    text-terracotta
                  "
                            >
                              Administrador
                            </span>

                          )}

                        </div>

                        <Link
                          to="/cuenta"
                          onClick={() => setAccountOpen(false)}
                          className="w-full flex items-center gap-[9px] px-[18px] py-[13px] border-b border-black/[0.07] font-body text-[12px] text-coffee transition-colors hover:bg-black/[0.03] hover:text-terracotta"
                          >
                            <UserRound size={15} />
                            Mi perfil
                          </Link>

                          {user.role === "customer" && (
                            <Link
                              to="/mis-pedidos"
                              onClick={() => setAccountOpen(false)}
                              className="w-full flex items-center gap-[9px] px-[18px] py-[13px] border-b border-black/[0.07] font-body text-[12px] text-coffee transition-colors hover:bg-black/[0.03] hover:text-terracotta"
                            >
                              <PackageSearch size={15} />
                              Estado de mis pedidos
                            </Link>
                          )}

                          {user.role === "admin" && (
                          <a
                            href={import.meta.env.VITE_ADMIN_URL ?? "http://localhost:5174"}
                            className="w-full flex items-center gap-[9px] px-[18px] py-[13px] border-b border-black/[0.07] font-body text-[12px] text-coffee transition-colors hover:bg-black/[0.03] hover:text-terracotta"
                          >
                            <ShieldCheck size={15} />
                            Panel administrativo
                          </a>
                        )}


                        <button
                          type="button"

                          onClick={async () => {

                            await logout();

                            setAccountOpen(false);

                          }}

                          className="
                w-full

                flex

                items-center

                gap-[9px]

                px-[18px]
                py-[13px]

                font-body

                text-[12px]

                text-coffee

                transition-colors

                hover:bg-black/[0.03]

                hover:text-terracotta
              "
                        >

                          <LogOut
                            size={15}
                          />

                          Cerrar sesión

                        </button>

                      </div>

                    )}

            </div>


            <button
              type="button"

              aria-label="Carrito"

              onClick={() =>
                setCartOpen(true)
              }

              className="
                relative

                flex

                h-11
                w-11

                items-center
                justify-center

                rounded-full

                border
                border-black/[0.07]

                bg-white/30

                text-charcoal

                transition-all

                hover:border-terracotta/30
                hover:bg-terracotta/[0.07]
                hover:text-terracotta
              "
            >

              <ShoppingCart
                size={25}
                strokeWidth={1.65}
              />


              <span
                className="
                  absolute

                  -top-1
                  -right-1

                  min-w-[20px]

                  h-[20px]

                  px-[5px]

                  flex
                  items-center
                  justify-center

                  rounded-full

                  bg-terracotta

                  font-body

                  text-[10px]

                  font-semibold

                  text-white
                "
              >
                {totalItems}
              </span>

            </button>

          </div>

        </div>

      </header>


      <CartDrawer
        open={cartOpen}

        onClose={() =>
          setCartOpen(false)
        }
      />
      <LoginModal
        open={loginOpen}

        onClose={() =>
          setLoginOpen(false)
        }
      />
    </>
  );
}


export default Header;
