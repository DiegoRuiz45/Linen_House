import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AuthContext } from "./auth-context";

const API_URL = (
  import.meta.env.VITE_API_URL
  ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");


export function AuthProvider({
  children,
}) {

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  // ========================================================
  // CONSULTAR SESIÓN ACTUAL
  // ========================================================

  const refreshUser =
    useCallback(async () => {

      try {

        const response = await fetch(
          `${API_URL}/auth/me`,
          {
            method: "GET",
            credentials: "include",
          }
        );


        if (response.status === 401) {

          setUser(null);

          return null;
        }


        if (!response.ok) {

          throw new Error(
            "No fue posible consultar la sesión."
          );
        }


        const data =
          await response.json();


        setUser(data);

        return data;

      } catch {

        return null;

      }

    }, []);


  // ========================================================
  // COMPROBAR SESIÓN AL ABRIR LA PÁGINA
  // ========================================================

  useEffect(() => {

    const initializeAuth =
      async () => {

        await refreshUser();

        setLoading(false);

      };


    initializeAuth();

  }, [refreshUser]);


  // ========================================================
  // LOGIN COMPLETADO
  // ========================================================

  const completeLogin = (
    userData
  ) => {

    setUser(userData);

  };


  // ========================================================
  // LOGOUT
  // ========================================================

  const logout = async () => {

    try {

      await fetch(
        `${API_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );

    } catch {

    } finally {

      setUser(null);

    }

  };


  // ========================================================
  // DATOS DERIVADOS
  // ========================================================

  const value = useMemo(
    () => ({
      user,
      loading,

      isAuthenticated:
        Boolean(user),

      isAdmin:
        user?.role === "admin",

      completeLogin,
      refreshUser,
      logout,
    }),
    [
      user,
      loading,
      refreshUser,
    ]
  );


  return (

    <AuthContext.Provider
      value={value}
    >

      {children}

    </AuthContext.Provider>

  );

}


