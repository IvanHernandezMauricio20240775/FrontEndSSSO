import{
    AuthenticationUser,
    AuthStatus
}from "../Service/AuthService.js"

document.addEventListener("DOMContentLoaded", () => {
  const $email = document.getElementById("email");
  const $pass  = document.getElementById("pass");
  const $btn   = document.getElementById("btnLogin");

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  $btn.addEventListener("click", async () => {
    const email = ($email.value || "").trim();
    const password = $pass.value || "";

    // Validaciones básicas
    if (!email || !password) {
      Swal.fire({ icon: "warning", title: "Campos requeridos",
        text: "Ingresa tu correo y contraseña." });
      return;
    }
    if (!isEmail(email)) {
      Swal.fire({ icon: "warning", title: "Correo inválido",
        text: "Revisa el formato del email." });
      return;
    }

    // Cargando...
    Swal.fire({
      title: "Iniciando sesión...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
     

      const User ={
        "Email": email,
        "Password": password
      }
  

      const { ok, status, data } = await AuthenticationUser(User);

      if (!ok) {
        Swal.fire({
          icon: "error",
          title: "No se pudo iniciar sesión",
          text: typeof data === "string" && data ? data : `Error ${status}`
        });
        return;
      }

      // 2) Verificar cookie/token con un endpoint protegido
      const check = await AuthStatus();

      if (!check.ok) {
        Swal.fire({
          icon: "error",
          title: "Token no recibido",
          text: "No se pudo validar la sesión. Verifica CORS y cookies."
        });
        return;
      }

      // Éxito
      const nombreRol = check?.data?.role || "Usuario";
      Swal.fire({
        icon: "success",
        title: "¡Bienvenido!",
        text: `Sesión iniciada como ${nombreRol}`,
        timer: 1200,
        showConfirmButton: false
      }).then(() => {
        // Redirige sólo si la sesión está verificada
        window.location.href = "MotivationalLoading.html";
      });

    } catch (err) {
      console.error("Error en Login:", err);
      Swal.fire({ icon: "error", title: "Error inesperado", text: String(err) });
    }
  });
});