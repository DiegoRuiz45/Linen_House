import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "../../context/useAuth";
import { useCart } from "../../context/useCart";


const GOOGLE_SCRIPT_URL = (
  "https://accounts.google.com/gsi/client"
);

const API_URL = (
  import.meta.env.VITE_API_URL
  ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");


function GoogleLoginButton({
  onSuccess,
}) {

  const { completeLogin } = useAuth();
  const { syncGuestCart } = useCart();
  const buttonRef = useRef(null);

  const googleClientId = (
    import.meta.env.VITE_GOOGLE_CLIENT_ID
  );

  const [error, setError] = useState(
    googleClientId
      ? ""
      : "Google Login no está configurado.",
  );


  const handleCredentialResponse = useCallback(
    async (googleResponse) => {

      try {
        setError("");

        const response = await fetch(
          `${API_URL}/auth/google`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              credential: googleResponse.credential,
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail
            || "No fue posible iniciar sesión.",
          );
        }

        await syncGuestCart();
        completeLogin(data.user);
        onSuccess?.(data.user);

      } catch (requestError) {
        setError(
          requestError.message
          || "No fue posible iniciar sesión.",
        );
      }
    },
    [
      completeLogin,
      onSuccess,
      syncGuestCart,
    ],
  );


  useEffect(() => {

    if (!googleClientId) {
      return undefined;
    }

    const initializeGoogle = () => {
      if (
        !window.google
        || !buttonRef.current
      ) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
      });

      buttonRef.current.replaceChildren();

      window.google.accounts.id.renderButton(
        buttonRef.current,
        {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 260,
        },
      );
    };

    const handleScriptError = () => {
      setError(
        "No fue posible cargar Google Login.",
      );
    };

    const existingScript = document.querySelector(
      `script[src="${GOOGLE_SCRIPT_URL}"]`,
    );

    if (existingScript) {
      if (window.google) {
        initializeGoogle();
      } else {
        existingScript.addEventListener(
          "load",
          initializeGoogle,
        );
        existingScript.addEventListener(
          "error",
          handleScriptError,
        );
      }

      return () => {
        existingScript.removeEventListener(
          "load",
          initializeGoogle,
        );
        existingScript.removeEventListener(
          "error",
          handleScriptError,
        );
      };
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener(
      "load",
      initializeGoogle,
    );
    script.addEventListener(
      "error",
      handleScriptError,
    );
    document.head.appendChild(script);

    return () => {
      script.removeEventListener(
        "load",
        initializeGoogle,
      );
      script.removeEventListener(
        "error",
        handleScriptError,
      );
    };

  }, [
    googleClientId,
    handleCredentialResponse,
  ]);


  return (
    <div>
      <div ref={buttonRef} />

      {error && (
        <p className="mt-[8px] font-body text-[12px] text-terracotta">
          {error}
        </p>
      )}
    </div>
  );
}


export default GoogleLoginButton;
