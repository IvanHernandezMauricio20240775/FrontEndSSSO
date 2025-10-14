// Js/Controller/DashboardController.js
import {
    AuthStatus,
    logout
} from "../Service/AuthService.js"; // asegúrate del .js según tu bundler

document.addEventListener("DOMContentLoaded", () => {
    initDashboard().catch(() => redirectToLogin());

    const BtnLogOut = document.getElementById("BtnLogOut");
    if (BtnLogOut) BtnLogOut.addEventListener("click", handleLogoutClick);
});

async function handleLogoutClick() {
    // Confirmación
    if (window.Swal) {
        const { isConfirmed } = await Swal.fire({
            title: "¿Estás seguro de cerrar sesión?",
            text: "Se cerrará tu sesión actual.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, cerrar sesión",
            cancelButtonText: "Cancelar"
        });
        if (!isConfirmed) return;

        // Loading
        Swal.fire({
            title: "Cerrando sesión...",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });
    } else {
        const ok = confirm("¿Estás seguro de cerrar sesión?");
        if (!ok) return;
    }

    try {
        // 1) Llama al endpoint de logout (borra la cookie en el servidor)
        const ok = await logout();

        // 2) Verifica que ya no hay sesión (debería devolver 401)
        const status = await AuthStatus();

        if (ok && !status.ok) {
            if (window.Swal) {
                await Swal.fire({
                    icon: "success",
                    title: "Sesión cerrada",
                    timer: 800,
                    showConfirmButton: false
                });
            }
            window.location.href = "Login.html";
        } else {
            if (window.Swal) {
                await Swal.fire({
                    icon: "warning",
                    title: "No se pudo cerrar sesión",
                    text: "Vuelve a intentarlo."
                });
            } else {
                alert("No se pudo cerrar sesión. Vuelve a intentarlo.");
            }
        }
    } catch (err) {
        console.error("logout error:", err);
        if (window.Swal) {
            await Swal.fire({
                icon: "error",
                title: "Error al cerrar sesión",
                text: String(err)
            });
        } else {
            alert("Error al cerrar sesión");
        }
    }
}

async function initDashboard() {
    const session = await AuthStatus();
    if (!session?.ok || !session.data) {
        redirectToLogin();
        return;
    }

    console.log("sesion iniciada", session)

    const role = (session.data.role || "").toLowerCase();
    const roleCommiteMemeber = (session.data.committeeRole || "").toLowerCase();
    console.log(roleCommiteMemeber);

    if (isAdmin(role)) {
        applyAdminSidebar();
        allowAllRoutes();
    } 
    // NUEVA LÓGICA: Acceso por rol de Comité (Presidente o Inspector)
    else if (isPresidentCommite(roleCommiteMemeber) || isVicePresidentCommite(roleCommiteMemeber)|| isMaintenanceCommite(roleCommiteMemeber)) {
        applyCommiteSidebar(roleCommiteMemeber); // Nueva función para manejar el acceso del comité
        enforceUserMaintenanceRouteGuard(true); // Pasar un flag para incluir 'Maintenance.html'
    }else if(isPresidentCommite(roleCommiteMemeber)|| isVicePresidentCommite(roleCommiteMemeber) || isInspectorCommite(roleCommiteMemeber)){
        applyCommiteSidebar(roleCommiteMemeber); // Nueva función para manejar el acceso del comité
        enforceUserRouteGuard(true); // Pasa
    }
    else {
        applyUserSidebar();
        enforceUserRouteGuard(false);
    }
}

/* -------------------- Helpers de sesión/rol -------------------- */
function isAdmin(role) {
    return role === "administrador" || role === "admin";
}

/*-------------------ROLES DE COMMITEE---------------------*/
function isInspectorCommite(roleCommiteMemeber) {
    // Corregido: Usar 'roleCommiteMemeber' que se pasa como argumento
    return roleCommiteMemeber === "inspector";
}


function isMaintenanceCommite(roleCommiteMemeber){
    return roleCommiteMemeber === "mantenimiento";
}

function isPresidentCommite(roleCommiteMemeber) {
    // Corregido: Usar 'roleCommiteMemeber' que se pasa como argumento
    return roleCommiteMemeber === "presidente";
}

function isVicePresidentCommite(roleCommiteMemeber) {
    // Corregido: Usar 'roleCommiteMemeber' que se pasa como argumento
    return roleCommiteMemeber === "vicepresidente";
}



function redirectToLogin() {
    window.location.href = "Login.html";
}

/* -------------------- Visibilidad del sidebar -------------------- */
function applyAdminSidebar() {
    // Muestra todo
    document.querySelectorAll(".sidebar .nav-link, .sidebar .collapse")
        .forEach(el => (el.style.display = ""));
}

function applyCommiteSidebar(committeeRole) {
    // 1) Oculta TODO
    document.querySelectorAll(".sidebar .nav-link, .sidebar .collapse")
        .forEach(el => (el.style.display = "none"));
    
    // 2) Permisos base de usuario
    const allowedHrefs = new Set([
        "index.html",          // Inicio
        "Report.html",         // Reportes
        "Simulacrum.html",     // Simulacros
        "Zone.html",           // Zonas
        "Departamentos.html",  // Departamentos
        "Protocol.html",       // Marcos de Seguridad (hijo)
        "Lineamientos.html",    // Marcos de Seguridad (hijo)
        // Añado Inspección
    ]);

    if(committeeRole === "presidente"|| committeeRole === "vicepresidente"|| committeeRole === "inspector"){
        allowedHrefs.add("Inspection.html")
    }else if(committeeRole === "presidente"|| committeeRole === "vicepresidente"|| committeeRole === "mantenimiento"){
        allowedHrefs.add("Maintenance.html")
    }
    

    showLinksByHref(allowedHrefs);

    // 3) Muestra el toggle y contenedor de "Marcos de Seguridad" para ver sus hijos
    showToggleAndSection("#Security");

    // (Opcional) abrir el collapse de Seguridad al cargar
    const sec = document.querySelector("#Security");
    if (sec) sec.classList.add("show");
}


function applyUserSidebar() {
    // 1) Oculta TODO
    document.querySelectorAll(".sidebar .nav-link, .sidebar .collapse")
        .forEach(el => (el.style.display = "none"));

    // 2) Define lo que SÍ se puede ver (por href de los <a>)
    const allowedHrefs = new Set([
        "index.html",          // Inicio
        "Report.html",         // Reportes
        "Simulacrum.html",     // Simulacros
        "Zone.html",           // Zonas
        "Departamentos.html",  // Departamentos
        "Protocol.html",       // Marcos de Seguridad (hijo)
        "Lineamientos.html"    // Marcos de Seguridad (hijo)
    ]);

    showLinksByHref(allowedHrefs);

    // 3) Muestra el toggle y contenedor de "Marcos de Seguridad" para ver sus hijos
    showToggleAndSection("#Security");

    // (Opcional) abrir el collapse de Seguridad al cargar
    const sec = document.querySelector("#Security");
    if (sec) sec.classList.add("show");
}

function showLinksByHref(allowedSet) {
    const anchors = document.querySelectorAll('.sidebar .nav-link[href]');
    anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        const file = href.split('/').pop();
        if (allowedSet.has(file)) {
            a.style.display = "";
            const parentCollapse = a.closest(".collapse");
            if (parentCollapse) parentCollapse.style.display = "";
        }
    });
}

function showToggleAndSection(targetSelector) {
    const toggle = document.querySelector(`.sidebar .nav-link[data-bs-target="${targetSelector}"]`);
    if (toggle) toggle.style.display = "";
    const section = document.querySelector(targetSelector);
    if (section) section.style.display = "";
}

/* -------------------- Guardas de ruta (bloqueo de navegación) -------------------- */
function allowAllRoutes() {
    // No hacemos nada: admin puede ir a todos lados
}

function enforceUserMaintenanceRouteGuard(allowMaintenance = false) {
    const allowedMaintenance = new Set([
        "index.html",
        "Report.html",
        "Simulacrum.html",
        "Zone.html",
        "Departamentos.html",
        "Protocol.html",
        "Lineamientos.html"
        ]);

    if (allowMaintenance) {
        allowedMaintenance.add("Maintenance.html");
    }

    // 1) Bloquea si ya está en una ruta no permitida (acceso directo por URL)
    const current = getCurrentPage();
    if (!allowedMaintenance.has(current)) {
        notify("Acceso restringido", "No tienes permisos para acceder a esa sección.");
        window.location.replace("index.html");
        return;
    }

    // 2) Intercepta clicks en el sidebar para impedir navegar a rutas no permitidas
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    sidebar.addEventListener("click", (e) => {
        const a = e.target.closest("a.nav-link[href]");
        if (!a) return;
        const href = a.getAttribute("href");
        if (!href || href === "#") return;

        const file = href.split("/").pop();
        if (!allowedMaintenance.has(file)) {
            e.preventDefault();
            notify("Acceso restringido", "No tienes permisos para acceder a esa sección.");
        }
    }, true);
}


// Modificada para recibir un flag que indica si se debe permitir Inspection.html
function enforceUserRouteGuard(allowInspection = false) {
    const allowed = new Set([
        "index.html",
        "Report.html",
        "Simulacrum.html",
        "Zone.html",
        "Departamentos.html",
        "Protocol.html",
        "Lineamientos.html"
        ]);

    if (allowInspection) {
        allowed.add("Inspection.html");
    }

    // 1) Bloquea si ya está en una ruta no permitida (acceso directo por URL)
    const current = getCurrentPage();
    if (!allowed.has(current)) {
        notify("Acceso restringido", "No tienes permisos para acceder a esa sección.");
        window.location.replace("index.html");
        return;
    }

    // 2) Intercepta clicks en el sidebar para impedir navegar a rutas no permitidas
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    sidebar.addEventListener("click", (e) => {
        const a = e.target.closest("a.nav-link[href]");
        if (!a) return;
        const href = a.getAttribute("href");
        if (!href || href === "#") return;

        const file = href.split("/").pop();
        if (!allowed.has(file)) {
            e.preventDefault();
            notify("Acceso restringido", "No tienes permisos para acceder a esa sección.");
        }
    }, true);
}

function getCurrentPage() {
    let path = window.location.pathname || "";
    if (path.endsWith("/")) return "index.html";
    const file = path.split("/").pop();
    return file || "index.html";
}

/* -------------------- UI: notificaciones -------------------- */
function notify(title, text) {
    if (window.Swal) {
        window.Swal.fire({ icon: "warning", title, text });
    } else {
        alert(`${title}\n${text}`);
    }
}