import { showError, showSuccess } from "./alerts";


const API_URL = (
  import.meta.env.VITE_API_URL
  ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");


export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}


export async function apiRequest(path, options = {}) {
  const {
    alert: alertOption,
    body,
    headers,
    successMessage,
    ...requestOptions
  } = options;
  const method = (requestOptions.method ?? "GET").toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const showMutationAlert = alertOption ?? (isMutation && path.startsWith("/admin/"));
  const isFormData = body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...requestOptions,
      headers: {
        Accept: "application/json",
        ...(!isFormData && body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body: body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
    });
  } catch {
    const message = "No fue posible conectar con el servidor.";
    if (showMutationAlert) void showError(message);
    throw new ApiError(message, 0);
  }

  if (response.status === 204) {
    if (showMutationAlert) {
      void showSuccess(successMessage ?? "Acción realizada correctamente.");
    }
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const detail = typeof data?.detail === "string"
      ? data.detail
      : Array.isArray(data?.detail)
        ? data.detail.map((item) => item.msg).join(" ")
        : "No fue posible completar la operación.";
    if (showMutationAlert) void showError(detail);
    throw new ApiError(detail, response.status);
  }

  if (showMutationAlert) {
    const defaultMessage = method === "POST"
      ? "Registro creado correctamente."
      : method === "DELETE"
        ? "Registro eliminado correctamente."
        : "Cambios guardados correctamente.";
    void showSuccess(successMessage ?? defaultMessage);
  }

  return data;
}


export async function downloadFile(path, filename) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "text/csv" },
  });
  if (!response.ok) {
    throw new ApiError("No fue posible descargar el reporte.", response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}


export { API_URL };
