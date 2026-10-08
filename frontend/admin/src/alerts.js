function getSweetAlert() {
  return window.Swal ?? null;
}


export function showSuccess(message) {
  const sweetAlert = getSweetAlert();
  if (!sweetAlert) {
    window.alert(message);
    return Promise.resolve();
  }

  return sweetAlert.fire({
    icon: "success",
    title: message,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2600,
    timerProgressBar: true,
  });
}


export function showError(message) {
  const sweetAlert = getSweetAlert();
  if (!sweetAlert) {
    window.alert(message);
    return Promise.resolve();
  }

  return sweetAlert.fire({
    icon: "error",
    title: "No fue posible completar la acción",
    text: message,
    confirmButtonText: "Entendido",
    confirmButtonColor: "#a95f49",
  });
}


export function showWarning(message, title = "Acción completada con novedades") {
  const sweetAlert = getSweetAlert();
  if (!sweetAlert) {
    window.alert(`${title}\n\n${message}`);
    return Promise.resolve();
  }

  return sweetAlert.fire({
    icon: "warning",
    title,
    text: message,
    confirmButtonText: "Revisar resultado",
    confirmButtonColor: "#a95f49",
  });
}


export async function confirmAction({
  title,
  text,
  confirmText = "Confirmar",
  icon = "warning",
}) {
  const sweetAlert = getSweetAlert();
  if (!sweetAlert) return window.confirm(`${title}\n\n${text}`);

  const result = await sweetAlert.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#a9473d",
    cancelButtonColor: "#66736d",
    reverseButtons: true,
    focusCancel: true,
  });

  return result.isConfirmed;
}
