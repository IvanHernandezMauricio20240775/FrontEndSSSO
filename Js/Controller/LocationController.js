// LocationControl.js
import { getAllZone } from "../Service/ZoneService.js";
import {
    getAllLocation,
    GetAllLocationCategory,
    getLocationByZone,
    UploadImage,
    InsertNewLocation,
    UpdatedLocation,
    DeleteLocation
} from "../Service/LocationService.js";
import { AuthStatus } from "../Service/AuthService.js";

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);

const swalOK = msg => Swal.fire({ icon: 'success', title: 'Éxito', text: msg, timer: 1400, showConfirmButton: false });
const swalErr = msg => Swal.fire({ icon: 'error', title: 'Ups...', text: msg });
const swalAsk = (t = '¿Eliminar?', d = 'Esta acción no se puede deshacer.') =>
    Swal.fire({ icon: 'warning', title: t, text: d, showCancelButton: true, confirmButtonColor: '#d33', cancelButtonText: 'Cancelar', confirmButtonText: 'Eliminar' });

/* ---------- estado ---------- */
let AUTH = null;
let CAN_WRITE = false;
let ALL_ZONES = [];
let ALL_CATEGORIES = [];
let ALL_LOCATIONS = [];      // solo para calcular el ID secuencial
let CURRENT_ZONE = "";       // zona seleccionada
let ZONE_LOCATIONS = [];     // cache de ubicaciones de la zona actual
let FILE_SELECTED = null;
let EDITING_ID = null;

/* ---------- elementos ---------- */
const zonaSelect = $("#zonaSelect");
const searchInput = $("#Search");
const btnManageZones = $("#btnManageZones");
const btnNewLocation = $("#openFormLocationBtn");
const cardsContainer = $("#cards-container");

/* Modal */
const modalEl = $("#LocationModal");
const modal = new bootstrap.Modal(modalEl);
const form = $("#LocationForm");

const idLocationInput = $("#ID_Location");
const nameInput = $("#Name_Location");
const catSelect = $("#TypeLocation_CMB");
const zoneSelectModal = $("#ZoneLocation_CMB");
const imgInput = $("#LocationIMG");
const imgPreview = $("#LocationImagePreview");
const actionText = $("#actionText");
const modalTitle = $("#LocationModalLabel");

/* =========================================================
   Auth / permisos
   ========================================================= */
async function loadAuth() {
    try {
        const resp = await AuthStatus();          // { ok, status, data: { role, committeeRole, ... } } ó a veces directos
        // soporta ambos formatos
        const payload = resp?.data ?? resp ?? {};

        const rawRole = String(payload?.role ?? "");
        const rawCommittee = String(payload?.committeeRole ?? "");

        const isAdmin = /(administrador|admin|administrator)/i.test(rawRole);
        const isUser = /(usuario|user)/i.test(rawRole);
        const hasCommitteePower = /(presidente|vicepresidente|secretario)/i.test(rawCommittee);

        // Regla: admin SIEMPRE puede escribir; user solo si pertenece al comité permitido
        CAN_WRITE = isAdmin || (isUser && hasCommitteePower);

        console.table({
            rawRole,
            rawCommittee,
            isAdmin,
            isUser,
            hasCommitteePower,
            CAN_WRITE
        });

        toggleWriteUI(CAN_WRITE);
        AUTH = payload;
    } catch (e) {
        CAN_WRITE = false;
        toggleWriteUI(false);
        console.warn("AuthStatus falló:", e);
    }
}

function toggleWriteUI(can) {
    // Botones de la vista principal
    const btnManageZones = document.querySelector("#btnManageZones");
    const btnNewLocation = document.querySelector("#openFormLocationBtn");

    [btnManageZones, btnNewLocation].forEach(el => {
        if (!el) return;
        if (can) el.classList.remove("d-none");
        else el.classList.add("d-none");
    });

    // Menú de 3 puntos dentro de las cards (si ya fue renderizado)
    document.querySelectorAll(".card-dots").forEach(el => {
        if (can) el.classList.remove("d-none");
        else el.classList.add("d-none");
    });
}
/* =========================================================
   Carga de catálogos
   ========================================================= */
async function loadZones() {
    ALL_ZONES = await getAllZone().catch(() => []);
    zonaSelect.innerHTML = `<option value="" selected disabled>Selecciona una Zona...</option>` +
        ALL_ZONES.map(z => `<option value="${z.id_zone}">${z.name_zone}</option>`).join("");

    // también llenamos el select del modal (aunque lo fijaremos/disabled)
    zoneSelectModal.innerHTML = `<option value="" selected disabled>Seleccionar zona...</option>` +
        ALL_ZONES.map(z => `<option value="${z.id_zone}">${z.name_zone}</option>`).join("");
}

async function loadCategories() {
    ALL_CATEGORIES = await GetAllLocationCategory().catch(() => []);
    catSelect.innerHTML = `<option value="" selected disabled>Seleccionar categoría...</option>` +
        ALL_CATEGORIES.map(c => `<option value="${c.id_category}">${c.name_category}</option>`).join("");
}

// Solo para calcular ID secuencial global
async function loadAllLocations() { ALL_LOCATIONS = await getAllLocation().catch(() => []); }

/* =========================================================
   Datos por zona
   ========================================================= */
async function fetchLocationsOfCurrentZone() {
    if (!CURRENT_ZONE) { ZONE_LOCATIONS = []; return; }
    const resp = await getLocationByZone(CURRENT_ZONE);
    if (!resp || resp.success === false) {
        throw new Error(resp?.message || "Error al obtener ubicaciones por zona");
    }
    ZONE_LOCATIONS = resp.data || [];
}

/* =========================================================
   Render
   ========================================================= */
function renderCardsFromZone() {
    const q = searchInput.value.trim().toLowerCase();

    const list = ZONE_LOCATIONS.filter(l =>
        !q || (l.name_location || "").toLowerCase().includes(q)
    );

    if (!CURRENT_ZONE) {
        cardsContainer.innerHTML = `
      <div class="col-12"><div class="text-secondary py-5 text-center">
        Selecciona una zona para ver sus ubicaciones.
      </div></div>`;
        return;
    }

    if (!list.length) {
        cardsContainer.innerHTML = `
      <div class="col-12"><div class="text-secondary py-5 text-center">
        No hay ubicaciones para esta zona.
      </div></div>`;
        return;
    }

    cardsContainer.innerHTML = list.map(l => {
        const menu = CAN_WRITE ? `
      <div class="dropdown card-dots">
        <button class="btn p-0" data-bs-toggle="dropdown"><i class="bi bi-three-dots"></i></button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item act-edit" data-id="${l.id_location}">
            <i class="bi bi-pencil-square me-2"></i>Editar</a></li>
          <li><a class="dropdown-item text-danger act-del" data-id="${l.id_location}">
            <i class="bi bi-trash3 me-2"></i>Eliminar</a></li>
        </ul>
      </div>` : "";

        return `
      <div class="col">
        <div class="location-card" data-id="${l.id_location}">
          ${menu}
          <img class="location-thumb" src="${l.img_location || 'https://placehold.co/640x400?text=Sin+Imagen'}" alt="thumb">
          <div class="location-title">${l.name_location}</div>
        </div>
      </div>`;
    }).join("");
}

/* =========================================================
   Utilidades
   ========================================================= */
const pad = (n, w = 3) => (n.toString().length >= w ? n.toString() : "0".repeat(w - n.toString().length) + n);

/** Siguiente UBI-XXX rellenando huecos (global, usando ALL_LOCATIONS) */
function nextLocationId() {
    const ids = (ALL_LOCATIONS || []).map(x => x.id_location);
    const nums = []; let maxDigits = 3;
    ids.forEach(id => {
        const m = /^UBI-(\d+)$/.exec(id || "");
        if (m) { nums.push(parseInt(m[1], 10)); maxDigits = Math.max(maxDigits, m[1].length); }
    });
    if (!nums.length) return `UBI-${pad(1, maxDigits)}`;
    nums.sort((a, b) => a - b);
    let next = 1; for (const n of nums) { if (n === next) next++; else if (n > next) break; }
    return `UBI-${pad(next, maxDigits)}`;
}

function setPreview(file) {
    if (!file) { imgPreview.src = "https://placehold.co/600x350?text=Imagen+de+Ubicaci%C3%B3n"; return; }
    const reader = new FileReader();
    reader.onload = () => (imgPreview.src = reader.result);
    reader.readAsDataURL(file);
}

/* =========================================================
   Eventos
   ========================================================= */
zonaSelect.addEventListener("change", async () => {
    CURRENT_ZONE = zonaSelect.value || "";
    await refreshZoneView();
});

searchInput.addEventListener("input", () => renderCardsFromZone());

btnNewLocation.addEventListener("click", async () => {
    if (!CAN_WRITE) return;

    EDITING_ID = null;
    modalTitle.textContent = "Nueva Ubicación";
    actionText.textContent = "Registrar Ubicación";

    // ID secuencial GLOBAL (llenando huecos)
    idLocationInput.value = nextLocationId();
    idLocationInput.readOnly = true;

    nameInput.value = "";
    FILE_SELECTED = null;
    setPreview(null);

    await loadCategories();
    await loadZones();

    // ✅ fijamos la zona seleccionada y deshabilitamos el select del modal
    zoneSelectModal.value = CURRENT_ZONE || "";
    zoneSelectModal.setAttribute("disabled", "disabled");

    modal.show();
});

imgInput.addEventListener("change", e => {
    FILE_SELECTED = e.target.files?.[0] || null;
    setPreview(FILE_SELECTED);
});

cardsContainer.addEventListener("click", async (e) => {
    const btnEdit = e.target.closest(".act-edit");
    const btnDel = e.target.closest(".act-del");

    if (btnEdit) {
        if (!CAN_WRITE) return;
        const id = btnEdit.dataset.id;
        const item = ZONE_LOCATIONS.find(x => x.id_location === id);
        if (!item) return;

        EDITING_ID = id;
        modalTitle.textContent = "Editar Ubicación";
        actionText.textContent = "Guardar Cambios";

        idLocationInput.value = item.id_location;
        idLocationInput.readOnly = true;
        nameInput.value = item.name_location || "";

        await loadCategories();
        await loadZones();
        catSelect.value = item.id_category ?? "";
        zoneSelectModal.value = CURRENT_ZONE;
        zoneSelectModal.setAttribute("disabled", "disabled");

        FILE_SELECTED = null;
        imgPreview.src = item.img_location || "https://placehold.co/600x350?text=Imagen+de+Ubicaci%C3%B3n";

        modal.show();
    }

    if (btnDel) {
        if (!CAN_WRITE) return;
        const id = btnDel.dataset.id;
        const ok = await swalAsk("¿Eliminar ubicación?", "Esta acción no se puede deshacer.");
        if (!ok.isConfirmed) return;

        try {
            const resp = await DeleteLocation(id);
            if (!resp || resp.success === false) throw new Error(resp?.message || "Error al eliminar");
            await swalOK("Ubicación eliminada.");
            await hardReload(); // recarga catálogos + zona
        } catch (err) { swalErr(err.message || "No se pudo eliminar"); }
    }
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!CAN_WRITE) return;

    const id_location = idLocationInput.value.trim();
    const name_location = nameInput.value.trim();
    const id_category = catSelect.value;
    const id_zone = CURRENT_ZONE;              // ✅ siempre la zona seleccionada arriba
    console.log(id_zone)
    if (!id_zone || id_zone == 0) { swalErr("Selecciona una zona antes de crear/editar."); return; }
    if (!name_location || !id_category) { swalErr("Completa todos los campos requeridos."); return; }

    try {
        let imgUrl;
        if (FILE_SELECTED) {
            const up = await UploadImage(FILE_SELECTED, { type: "location" });
            if (!up || up.success === false) throw new Error(up?.message || "Error al subir imagen");
            imgUrl = up.data;
        }

        if (EDITING_ID) {
            const payload = {
                id_location,
                name_location,
                img_location: imgUrl ?? undefined,
                id_category: Number(id_category),
                id_zone
            };
            const resp = await UpdatedLocation(id_location, payload);
            if (!resp || resp.success === false) throw new Error(resp?.message || "Error al actualizar");
            swalOK("Ubicación actualizada.");
        } else {
            const payload = {
                id_location,
                name_location,
                img_location: imgUrl ?? null,
                id_category: Number(id_category),
                id_zone
            };
            const resp = await InsertNewLocation(payload);
            if (!resp || resp.success === false) throw new Error(resp?.message || "Error al registrar");
            swalOK("Ubicación registrada.");
        }
        imgUrl = null;
        modal.hide();
        await hardReload(); // recarga catálogos + zona
    } catch (err) {
        swalErr(err.message || "Ocurrió un error");
    }
});

/* =========================================================
   Recarga de vista
   ========================================================= */
async function refreshZoneView() {
    // solo mostramos ubicaciones de la zona
    try {
        await fetchLocationsOfCurrentZone();
        renderCardsFromZone();
    } catch (e) {
        swalErr(e.message || "No se pudieron cargar las ubicaciones de la zona");
        ZONE_LOCATIONS = [];
        renderCardsFromZone();
    }
}

// Recarga todo (incluye ALL_LOCATIONS para ID secuencial)
async function hardReload() {
    await loadAllLocations();
    await refreshZoneView();
}

/* =========================================================
   Arranque
   ========================================================= */
(async function boot() {
    await loadAuth();          // permisos primero (pinta botones)
    await loadZones();         // llena selects
    await loadCategories();    // categorías del modal
    await loadAllLocations();  // base para UBI-XXX

    // No mostramos nada hasta que el usuario elija zona.
    CURRENT_ZONE = "";
    renderCardsFromZone();

    // Si ya había una zona preseleccionada en el DOM (por cache del navegador)
    if (zonaSelect.value) {
        CURRENT_ZONE = zonaSelect.value;
        await refreshZoneView();
    }

    // ESC cierra modal
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalEl.classList.contains("show")) modal.hide();
    });
})();
