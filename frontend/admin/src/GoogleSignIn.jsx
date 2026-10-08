import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "./api";
import { useAdminAuth } from "./AuthContext";


const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";


export default function GoogleSignIn() {
  const buttonRef = useRef(null);
  const { setUser } = useAdminAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [error, setError] = useState(
    clientId ? "" : "Google Login no está configurado.",
  );

  const onCredential = useCallback(async (googleResponse) => {
    try {
      setError("");
      const data = await apiRequest("/auth/google", {
        method: "POST",
        body: { credential: googleResponse.credential },
      });
      setUser(data.user);
    } catch (requestError) {
      setError(requestError.message || "No fue posible iniciar sesión.");
    }
  }, [setUser]);

  useEffect(() => {
    if (!clientId) return undefined;

    const initialize = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: onCredential,
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 280,
      });
    };
    const failed = () => setError("No fue posible cargar Google Login.");
    let script = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
    let created = false;
    if (!script) {
      script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      created = true;
    }
    if (window.google) initialize();
    else {
      script.addEventListener("load", initialize);
      script.addEventListener("error", failed);
    }
    return () => {
      script.removeEventListener("load", initialize);
      script.removeEventListener("error", failed);
      if (created && script.parentNode) script.remove();
    };
  }, [clientId, onCredential]);

  return (
    <div className="google-sign-in">
      <div ref={buttonRef} />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
