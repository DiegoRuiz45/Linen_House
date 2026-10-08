import { X } from "lucide-react";

import GoogleLoginButton from "./GoogleLoginButton";


function LoginModal({
  open,
  onClose,
}) {

  if (!open) {
    return null;
  }


  return (

    <div
      onClick={onClose}

      className="
        fixed
        inset-0
        z-[300]

        flex
        items-center
        justify-center

        bg-black/40

        px-[20px]
      "
    >

      <div
        onClick={(event) =>
          event.stopPropagation()
        }

        className="
          relative

          w-full
          max-w-[430px]

          rounded-[18px]

          bg-linen

          px-[32px]
          py-[38px]

          shadow-2xl
        "
      >

        <button
          type="button"

          onClick={onClose}

          aria-label="Cerrar"

          className="
            absolute

            top-[18px]
            right-[18px]

            text-coffee/60

            transition-colors

            hover:text-charcoal
          "
        >

          <X size={20} />

        </button>


        <div
          className="
            text-center
          "
        >

          <p
            className="
              mb-[8px]

              font-body

              text-[10px]

              uppercase

              tracking-[0.2em]

              text-terracotta
            "
          >
            Linen House
          </p>


          <h2
            className="
              font-display

              text-[32px]

              text-charcoal
            "
          >
            Inicia sesión
          </h2>


          <p
            className="
              mt-[10px]

              font-body

              text-[13px]

              leading-[1.6]

              text-coffee/65
            "
          >
            Accede a tus pedidos,
            direcciones y compras
            utilizando tu cuenta de Google.
          </p>

        </div>


        <div
          className="
            mt-[30px]

            flex
            justify-center
          "
        >

          <GoogleLoginButton
            onSuccess={() =>
              onClose()
            }
          />

        </div>


        <p
          className="
            mt-[25px]

            text-center

            font-body

            text-[10px]

            leading-[1.5]

            text-coffee/45
          "
        >
          Linen House no recibe ni
          almacena tu contraseña de Google.
        </p>

      </div>

    </div>

  );

}


export default LoginModal;