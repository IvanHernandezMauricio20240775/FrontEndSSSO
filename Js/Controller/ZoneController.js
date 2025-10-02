// ZoneController.js
import {
    getAllZone,
    getPageZone,
    InsertNewZone,
    UpdatedZone,
    UploadImage,
    DeleteZone,
} from "../Service/ZoneService.js";

import { AuthStatus } from "../Service/AuthService.js";

/* -------------------- helpers -------------------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const swalOK = (msg) => Swal.fire({ icon: 'success', title: 'Éxito', text: msg, timer: 1400, showConfirmButton: false });
const swalErr = (msg) => Swal.fire({ icon: 'error', title: 'Ups...', text: msg });
const swalAsk = (t = '¿Eliminar?', d = 'Esta acción no se puede deshacer.') =>
    Swal.fire({ icon: 'warning', title: t, text: d, showCancelButton: true, confirmButtonColor: '#d33', cancelButtonText: 'Cancelar', confirmButtonText: 'Eliminar' });

/* -------------------- estado -------------------- */
let AUTH = null;
let CAN_SEE = false;   // puede ver la página
let CAN_WRITE = false; // puede crear/editar/eliminar
let currentPage = 0;
let totalPages = 0;
let ALL_ZONES_CACHE = []; // para ID secuencial y búsqueda global
let FILE_SELECTED = null; // file imagen en modal

/* -------------------- elementos -------------------- */
const btnAddZone = $("#OpenModalZone");
const modalEl = $("#ZoneModal");
const modal = new bootstrap.Modal(modalEl);
const form = $("#ZoneForm");

const Input_ID = $("#ID_Zone");
const Name_Zone = $("#Name_Zone");
const ImgInput = $("#ZoneIMG");
const ImgPreview = $("#ZoneImagePreview");
const SaveBtn = $("#saveButton");
const SaveText = $("#saveActionText");

const tableBody = $("#extintoresTableBody");
const TableAnim = $("#TableDiv");
const TableWrapper = $("#TableWrapper");
const NoAccessMsg = $("#NoAccessMsg");
const OptionsZone = $("#OptionsZone");

const SearchZone = $("#SearchZone");
const prevPageBtn = $("#prevPageBtn");
const nextPageBtn = $("#nextPageBtn");
const pager = $("#Pager");
const paginationNumbersContainer = $("#paginationNumbers");

/* =========================================================
   Permisos con AuthStatus
   ========================================================= */
async function loadAuthAndGate() {
    try {
        const resp = await AuthStatus();           // puede ser { data: {...}, ok, status } o directamente {...}
        console.log("AuthStatus raw:", resp);

        // Normaliza el payload para que siempre sea el objeto con role/committeeRole
        const payload = (resp && typeof resp === "object" && "data" in resp) ? resp.data : resp;
        AUTH = payload || {};

        const norm = (s) => (s ?? "").toString().trim().toLowerCase();
        const role = norm(AUTH.role);            // "administrador" | "usuario" | ...
        const committee = norm(AUTH.committeeRole);   // "presidente" | ...

        const isAdmin = ["administrador", "admin", "administrator"].includes(role);
        const isUser = ["usuario", "user"].includes(role);
        const hasCommitteePower = ["presidente", "vicepresidente", "secretario"].includes(committee);

        // En esta vista: o se ve todo (y con o sin escritura) o no se ve nada
        CAN_WRITE = isAdmin || (isUser && hasCommitteePower);
        CAN_SEE = isAdmin || (isUser && hasCommitteePower);

        // Toggle UI principal
        if (!CAN_SEE) {
            OptionsZone.classList.add("d-none");
            TableWrapper.classList.add("d-none");
            pager?.classList.add("d-none");
            NoAccessMsg.classList.remove("d-none");
        } else {
            OptionsZone.classList.remove("d-none");
            TableWrapper.classList.remove("d-none");
            NoAccessMsg.classList.add("d-none");
            // El botón "Nueva Zona" solo si puede escribir
            btnAddZone.classList.toggle("d-none", !CAN_WRITE);
        }

        console.log({ role, committee, isAdmin, CAN_SEE, CAN_WRITE });
    } catch (e) {
        CAN_WRITE = false;
        CAN_SEE = false;
        OptionsZone.classList.add("d-none");
        TableWrapper.classList.add("d-none");
        pager?.classList.add("d-none");
        NoAccessMsg.classList.remove("d-none");
        console.warn("AuthStatus falló:", e);
    }
}

/* =========================================================
   Utilidades
   ========================================================= */
function applyFadeInAnimation() {
    TableAnim?.classList.remove("animate__fadeIn");
    setTimeout(() => TableAnim?.classList.add("animate__fadeIn"), 10);
}
function pad(n, w = 3) {
    const s = `${n}`; return s.length >= w ? s : "0".repeat(w - s.length) + s;
}
/** Calcula el siguiente ZON-### rellenando huecos */
function nextZoneId(existingIds) {
    const nums = [];
    let maxDigits = 3;
    (existingIds || []).forEach(id => {
        const m = /^ZON-(\d+)$/.exec(id || "");
        if (m) { nums.push(parseInt(m[1], 10)); maxDigits = Math.max(maxDigits, m[1].length); }
    });
    if (!nums.length) return `ZON-${pad(1, maxDigits)}`;
    nums.sort((a, b) => a - b);
    let next = 1;
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] === next) next++;
        else if (nums[i] > next) break;
    }
    return `ZON-${pad(next, maxDigits)}`;
}
/** pinta preview desde file o borra */
function setPreview(fileOrUrl) {
    if (!fileOrUrl) {
        ImgPreview.src = "https://placehold.co/120x120?text=IMG";
        return;
    }
    if (typeof fileOrUrl === "string") {
        ImgPreview.src = fileOrUrl;
        return;
    }
    const reader = new FileReader();
    reader.onload = () => ImgPreview.src = reader.result;
    reader.readAsDataURL(fileOrUrl);
}

/* =========================================================
   Búsqueda y paginado
   ========================================================= */
function renderPageNumbers() {
    paginationNumbersContainer.innerHTML = "";
    if (totalPages <= 1) return;

    const maxPagesToShow = 3;
    let start = Math.max(0, currentPage - Math.floor(maxPagesToShow / 2));
    let end = Math.min(totalPages - 1, start + maxPagesToShow - 1);
    if (end - start + 1 < maxPagesToShow) start = Math.max(0, end - maxPagesToShow + 1);

    if (totalPages > maxPagesToShow && start > 0) {
        const li = document.createElement("li");
        li.className = "page-item disabled";
        li.innerHTML = `<a class="page-link" href="#">...</a>`;
        paginationNumbersContainer.appendChild(li);
    }
    for (let i = start; i <= end; i++) {
        const li = document.createElement("li");
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i + 1}</a>`;
        paginationNumbersContainer.appendChild(li);
    }
    if (totalPages > maxPagesToShow && end < totalPages - 1) {
        const li = document.createElement("li");
        li.className = "page-item disabled";
        li.innerHTML = `<a class="page-link" href="#">...</a>`;
        paginationNumbersContainer.appendChild(li);
    }
}

function renderRows(zones) {
    tableBody.innerHTML = "";
    if (!zones?.length) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No hay Zonas registradas.</td></tr>`;
        return;
    }

    zones.forEach(z => {
        const tr = document.createElement("tr");
        tr.dataset.id = z.id_zone;
        tr.dataset.name = z.name_zone;
        tr.dataset.img = z.img_zone || "";

        const actions = CAN_WRITE
            ? `<a href="#" class="action-btn me-2 btn-edit-zone" title="Editar"><i class="fa-solid fa-pen-to-square"></i></a>
         <a href="#" class="action-btn text-danger btn-delete-zone" title="Eliminar"><i class="fa-solid fa-trash-can"></i></a>`
            : `<span class="text-muted small">—</span>`;

        tr.innerHTML = `
      <td class="px-3 text-center extintor-image-cell">
        <img src="${z.img_zone || 'https://placehold.co/80x52'}" alt="Imagen_Zona" class="extintor-image">
      </td>
      <td class="px-3 fw-bold text-muted">#${z.id_zone}</td>
      <td class="px-3">${z.name_zone}</td>
      <td class="px-3">${actions}</td>
    `;
        tableBody.appendChild(tr);
    });
}

/** carga página con backend (sin filtro) */
async function loadPage(pageIndex = 0, size = 8) {
    applyFadeInAnimation();
    tableBody.innerHTML = "";
    const resp = await getPageZone(pageIndex, size);
    const page = resp?.data;
    const zones = page?.content || [];
    totalPages = page?.totalPages ?? 0;

    renderRows(zones);

    prevPageBtn.classList.toggle("disabled", currentPage === 0);
    nextPageBtn.classList.toggle("disabled", currentPage >= totalPages - 1);
    renderPageNumbers();
}

/** búsqueda global: trae todas y filtra por nombre o id */
async function searchAndRender(q) {
    const qn = q.trim().toLowerCase();
    if (!ALL_ZONES_CACHE.length) {
        ALL_ZONES_CACHE = await getAllZone().catch(() => []);
    }
    const filtered = ALL_ZONES_CACHE.filter(z =>
        z.name_zone?.toLowerCase().includes(qn) ||
        (z.id_zone || "").toLowerCase().includes(qn)
    );
    // Ocultamos la paginación cuando hay búsqueda
    pager.classList.add("d-none");
    renderRows(filtered);
}

/* =========================================================
   Eventos de UI (abrir modal, paginación, CRUD)
   ========================================================= */
btnAddZone.addEventListener("click", async () => {
    if (!CAN_WRITE) return;

    // ID secuencial auto y readonly
    if (!ALL_ZONES_CACHE.length) {
        ALL_ZONES_CACHE = await getAllZone().catch(() => []);
    }
    const nextId = nextZoneId(ALL_ZONES_CACHE.map(z => z.id_zone));
    form.reset();
    Input_ID.value = nextId;
    Input_ID.readOnly = true;
    Name_Zone.value = "";
    FILE_SELECTED = null;
    setPreview(null);
    ImgPreview.dataset.url = ""; // borro url existente
    SaveText.textContent = "Registrar Zona";
    modal.show();
});

ImgInput.addEventListener("change", (e) => {
    const f = e.target.files?.[0] || null;
    FILE_SELECTED = f;
    setPreview(FILE_SELECTED || ImgPreview.dataset.url || null);
});

/* editar / eliminar (delegación) */
tableBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit-zone");
    const delBtn = e.target.closest(".btn-delete-zone");

    if (editBtn) {
        if (!CAN_WRITE) return;
        const tr = e.target.closest("tr");
        const id = tr.dataset.id;
        const name = tr.dataset.name;
        const img = tr.dataset.img || "";

        form.reset();
        Input_ID.value = id;
        Input_ID.readOnly = true;
        Name_Zone.value = name;

        FILE_SELECTED = null;
        setPreview(img || null);
        ImgPreview.dataset.url = img || "";
        SaveText.textContent = "Actualizar Zona";
        modal.show();
    }

    if (delBtn) {
        if (!CAN_WRITE) return;
        const tr = e.target.closest("tr");
        const id = tr.dataset.id;
        const ok = await swalAsk("¿Eliminar zona?", "Esta acción no se puede deshacer.");
        if (!ok.isConfirmed) return;
        try {
            const resp = await DeleteZone(id);
            if (resp?.success === false) throw new Error(resp.message || "Error al eliminar");
            await swalOK("Zona eliminada.");
            // recargar
            if (SearchZone.value.trim()) {
                // si estoy en búsqueda, refresco el filtro
                ALL_ZONES_CACHE = []; // fuerza recarga
                await searchAndRender(SearchZone.value);
            } else {
                await loadPage(currentPage, 8);
            }
        } catch (err) { swalErr(err.message || "No se pudo eliminar"); }
    }
});

/* submit crear/editar */
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!CAN_WRITE) return;

    const id_zone = Input_ID.value.trim();
    const name_zone = Name_Zone.value.trim();
    if (!id_zone || !name_zone) { swalErr("Completa los campos requeridos."); return; }

    try {
        // subir imagen si hay nueva
        let finalUrl = ImgPreview.dataset.url || null;
        if (FILE_SELECTED) {
            const up = await UploadImage(FILE_SELECTED, { type: "zone" });
            if (!up || up.success === false) throw new Error(up?.message || "Error al subir imagen");
            finalUrl = up.data;
        }

        const payload = {
            id_zone,
            name_zone,
            img_zone: finalUrl
        };

        if (SaveText.textContent.includes("Actualizar")) {
            const resp = await UpdatedZone(id_zone, payload);
            if (resp?.success === false) throw new Error(resp.message || "Error al actualizar");
            await swalOK("Zona actualizada.");
        } else {
            const resp = await InsertNewZone(payload);
            if (resp?.success === false) throw new Error(resp.message || "Error al registrar");
            await swalOK("Zona registrada.");
        }

        modal.hide();
        FILE_SELECTED = null;
        ImgPreview.dataset.url = "";

        // refrescar
        ALL_ZONES_CACHE = []; // para que el siguiente ID secuencial sea correcto
        if (SearchZone.value.trim()) {
            await searchAndRender(SearchZone.value);
        } else {
            // vuelve a la primera página para ver la recién creada
            currentPage = 0;
            await loadPage(currentPage, 8);
            pager.classList.remove("d-none");
        }

    } catch (err) {
        swalErr(err.message || "Ocurrió un error");
    }
});

/* paginación */
prevPageBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (prevPageBtn.classList.contains("disabled")) return;
    if (currentPage > 0) { currentPage--; await loadPage(currentPage, 8); }
});
nextPageBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (nextPageBtn.classList.contains("disabled")) return;
    if (currentPage < totalPages - 1) { currentPage++; await loadPage(currentPage, 8); }
});
paginationNumbersContainer.addEventListener("click", async (e) => {
    e.preventDefault();
    const link = e.target.closest(".page-link");
    if (!link || link.dataset.page === undefined) return;
    const newPage = parseInt(link.dataset.page, 10);
    if (newPage !== currentPage) { currentPage = newPage; await loadPage(currentPage, 8); }
});

/* búsqueda global */
SearchZone.addEventListener("input", async (e) => {
    const q = e.target.value || "";
    if (q.trim()) {
        await searchAndRender(q);
    } else {
        pager.classList.remove("d-none");
        currentPage = 0;
        await loadPage(currentPage, 8);
    }
});

/* =========================================================
   Arranque
   ========================================================= */
(async function boot() {
    await loadAuthAndGate();
    if (!CAN_SEE) return;            // 🚫 sin acceso: no cargamos nada

    // base para ID secuencial
    ALL_ZONES_CACHE = await getAllZone().catch(() => []);
    // primera página
    await loadPage(currentPage, 8);

    // ESC para cerrar modal
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalEl.classList.contains("show")) modal.hide();
    });
})();
