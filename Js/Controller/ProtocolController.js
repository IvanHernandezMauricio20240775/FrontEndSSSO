// ProtocoControl.js
import * as PROTOCOL from "../Service/ProtocolService.js";
import { AuthStatus } from "../Service/AuthService.js";


const $ = s => document.querySelector(s);

let AUTH = null;
let CURRENT_NIT = null;
let CAN_WRITE = false;
let CATEGORIES = [];
let PROTOCOLS = [];

const ALLOWED_COMMITTEE = ["presidente", "vicepresidente", "secretario"];

const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const todayYMD = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/* =========================================================
   Elementos de la vista
   ========================================================= */
const viewCategories = $("#view-categories");
const viewProtocols = $("#view-protocols");

const searchCategory = $("#searchCategory");
const searchProtocol = $("#searchProtocol");

const btnNewCategory = $("#btnNewCategory");
const btnNewProtocol = $("#btnNewProtocol");

const categoriesGrid = $("#categoriesGrid");
const protocolsGrid = $("#protocolsGrid");

const catNameHeader = $("#catNameHeader");

// Modales y campos: Categoría
const categoryModal = $("#categoryModal");
const categoryForm = $("#categoryForm");
const categoryModalTitle = $("#categoryModalTitle");
const categorySubmitText = $("#categorySubmitText");
const catId = $("#catId");
const catName = $("#catName");
const catDesc = $("#catDesc");
const catImgInput = $("#catImgInput");
const catImgPreview = $("#catImgPreview");

// Modales y campos: Protocolo
const protocolModal = $("#protocolModal");
const protocolForm = $("#protocolForm");
const protocolModalTitle = $("#protocolModalTitle");
const protocolSubmitText = $("#protocolSubmitText");
const protoId = $("#protoId");
const protoName = $("#protoName");
const protoDesc = $("#protoDesc");
const protoDate = $("#protoDate"); // visual solamente; se ignora al enviar (se envía HOY)

const ilustration = $("#illustration");

/* SweetAlert helpers */
const swalOK = msg => Swal.fire({ icon: 'success', title: 'Éxito', text: msg, timer: 1400, showConfirmButton: false });
const swalErr = msg => Swal.fire({ icon: 'error', title: 'Ups...', text: msg });
const swalInfo = (title, html) => Swal.fire({ icon: 'info', title, html });
const swalAsk = (title = '¿Eliminar?', text = 'Esta acción no se puede deshacer.') =>
  Swal.fire({ icon: 'warning', title, text, showCancelButton: true, confirmButtonColor: '#d33', cancelButtonText: 'Cancelar', confirmButtonText: 'Eliminar' });

async function loadAuthAndPermissions() {
  try {
    const resp = await AuthStatus(); // puede venir { success, data: {...} } o directamente {...}
    const payload = (resp && typeof resp === 'object' && 'data' in resp) ? (resp.data || {}) : (resp || {});
    AUTH = payload;

    const norm = (s) => (s ?? '').toString().trim().toLowerCase();

    CURRENT_NIT = payload?.nit ?? null;
    const role = norm(payload?.role);           // "administrador" | "usuario" | ...
    const committee = norm(payload?.committeeRole);  // "presidente" | "inspector" | ...

    const isAdmin = role === 'administrador' || role === 'admin' || role === 'administrator';
    const isUser = role === 'usuario' || role === 'user';

    const hasCommitteePower = ['presidente', 'vicepresidente', 'secretario'].includes(committee);

    // Regla correcta:
    //  - Admin: SIEMPRE puede crear/editar/eliminar (committeeRole NO importa)
    //  - Usuario: solo si es Presidente/Vicepresidente/Secretario
    CAN_WRITE = isAdmin || (isUser && hasCommitteePower);

    // Mostrar/ocultar los botones de creación según permisos
    if (CAN_WRITE) {
      btnNewCategory.classList.remove('d-none');
      btnNewProtocol.classList.remove('d-none');
    } else {
      btnNewCategory.classList.add('d-none');
      btnNewProtocol.classList.add('d-none');
    }

  } catch (e) {
    // Si falla Auth, por seguridad, deja solo lectura
    CAN_WRITE = false;
    btnNewCategory.classList.add('d-none');
    btnNewProtocol.classList.add('d-none');
    console.warn('No se pudo obtener AuthStatus:', e);
  }
}

/* =========================================================
   Carga de datos desde API
   ========================================================= */
async function fetchCategories() {
  const list = await PROTOCOL.GetAllListCategoryProtocol(); // lista cruda
  CATEGORIES = (list || []).map(x => ({
    id: String(x.id_category_protocol),
    name: x.name_category_protocol,
    description: x.description_category_protocol,
    img: x.img_protocol || ""
  }));
}

async function fetchProtocolsByCategory(categoryId) {
  const resp = await PROTOCOL.GetProtocolsByCategory(categoryId); // ApiResponse<List<ProtocolDTO>>
  if (!resp || resp.success === false) {
    throw new Error(resp?.message || "Error al obtener protocolos por categoría");
  }
  const arr = resp.data || [];
  PROTOCOLS = arr.map(p => ({
    id: String(p.id_protocol),
    categoryId: String(p.id_category_protocol),
    name: p.name_protocol,
    description: p.description,
    createdAt: p.dt_created,     // yyyy-MM-dd
    state: p.state_protocol
  }));
}

/* =========================================================
   Render
   ========================================================= */
function renderCategories(filterText = "") {
  const q = filterText.trim().toLowerCase();
  const cats = CATEGORIES.filter(c =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    (c.description || "").toLowerCase().includes(q)
  );

  categoriesGrid.innerHTML = "";
  if (!cats.length) {
    categoriesGrid.innerHTML = `<div class="text-center text-secondary py-5">Sin resultados</div>`;
    return;
  }

  cats.forEach(cat => {
    const card = document.createElement("div");
    card.className = "cat-card";
    card.dataset.id = cat.id;

    const menu = CAN_WRITE ? `
      <button class="btn dots p-1" data-bs-toggle="dropdown" data-id="${cat.id}" onclick="event.stopPropagation()">
        <i class="bi bi-three-dots"></i>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item action-view-cat" data-id="${cat.id}"><i class="bi bi-eye me-2"></i>Ver</a></li>
        <li><a class="dropdown-item action-edit-cat" data-id="${cat.id}"><i class="bi bi-pencil-square me-2"></i>Editar</a></li>
        <li><a class="dropdown-item text-danger action-del-cat" data-id="${cat.id}"><i class="bi bi-trash3 me-2"></i>Eliminar</a></li>
      </ul>
    ` : `
      <button class="btn dots p-1 d-none" disabled><i class="bi bi-three-dots"></i></button>
      <ul class="dropdown-menu dropdown-menu-end d-none"></ul>
    `;

    card.innerHTML = `
      <div class="accent-strip"></div>
      ${menu}
      <img class="thumb" alt="img" src="${cat.img || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1374&auto=format&fit=crop'}">
      <div class="text-center small text-uppercase text-secondary fw-bold mt-1">PROTOCOLO DE:</div>
      <div class="text-center fw-semibold">${cat.name}</div>
    `;

    // Click en tarjeta -> navegar a protocolos
    card.addEventListener("click", (e) => {
      if (e.target.closest(".dropdown-menu") || e.target.closest(".dots")) return;
      const url = new URL(location.href);
      url.searchParams.set("cat", cat.id);
      history.pushState({}, "", url);
      setView(); // recarga protocolos
    });

    categoriesGrid.appendChild(card);
  });
}

function renderProtocols(categoryId, filterText = "") {
  const cat = CATEGORIES.find(c => c.id === String(categoryId));

  if (cat) catNameHeader.textContent = cat.name;
  console.log("cat", cat);
  const img = cat.img || "https://via.placeholder.com/320x320?text=Sin+imagen";
  console.log(img)
  ilustration.innerHTML = `<img alt="ilustración" id="ilustracion" src="${img}">`;

  const q = (filterText || "").trim().toLowerCase();
  const items = PROTOCOLS
    .filter(p => String(p.categoryId) === String(categoryId))
    .filter(p => !q || p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));

  protocolsGrid.innerHTML = "";
  if (!items.length) {
    protocolsGrid.innerHTML = `<div class="text-center text-secondary py-5">Sin resultados</div>`;
    return;
  }

  


  items.forEach(p => {
    const card = document.createElement("div");
    card.className = "proto-card";

    const menu = CAN_WRITE ? `
      <button class="btn dots p-1" data-bs-toggle="dropdown" data-id="${p.id}">
        <i class="bi bi-three-dots"></i>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item action-edit-proto" data-id="${p.id}"><i class="bi bi-pencil-square me-2"></i>Editar</a></li>
        <li><a class="dropdown-item text-danger action-del-proto" data-id="${p.id}"><i class="bi bi-trash3 me-2"></i>Eliminar</a></li>
      </ul>
    ` : `
      <button class="btn dots p-1 d-none" disabled><i class="bi bi-three-dots"></i></button>
      <ul class="dropdown-menu dropdown-menu-end d-none"></ul>
    `;

    card.innerHTML = `
      <div class="accent-strip"></div>
      ${menu}
      <div class="proto-title mb-1">NOMBRE: ${p.name}</div>
      <div class="xsmall mb-2">FECHA DE CREACIÓN: ${fmtDate(p.createdAt)}</div>
      <div class="proto-desc"><span class="fw-semibold">DESCRIPCIÓN: </span>${p.description}</div>
    `;
    protocolsGrid.appendChild(card);
  });
}

/* =========================================================
   View switch
   ========================================================= */
function getCurrentCatFromURL() {
  return new URLSearchParams(location.search).get("cat");
}

async function setView() {
  const currentCatId = getCurrentCatFromURL();

  if (!CATEGORIES.length) {
    await fetchCategories();
  }

  if (currentCatId) {
    // mostrar protocolos
    viewCategories.classList.add("d-none");
    viewProtocols.classList.remove("d-none");

    // cargar protocolos de la categoría
    try {
      await fetchProtocolsByCategory(currentCatId);
      renderProtocols(currentCatId, searchProtocol.value);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Error", text: e.message || "No se pudieron cargar los protocolos" });
      // Volver a categorías si falla
      const url = new URL(location.href);
      url.searchParams.delete("cat");
      history.replaceState({}, "", url);
      viewProtocols.classList.add("d-none");
      viewCategories.classList.remove("d-none");
      renderCategories(searchCategory.value);
    }
  } else {
    // mostrar categorías
    viewProtocols.classList.add("d-none");
    viewCategories.classList.remove("d-none");
    renderCategories(searchCategory.value);
  }
}

window.addEventListener("popstate", setView);

/* =========================================================
   Eventos · Categorías
   ========================================================= */
searchCategory.addEventListener("input", e => renderCategories(e.target.value));

btnNewCategory.addEventListener("click", () => {
  if (!CAN_WRITE) return;
  categoryModalTitle.textContent = "Nueva categoría de protocolos";
  categorySubmitText.textContent = "Registrar Nueva Categoría";
  catId.value = "";
  catName.value = "";
  catDesc.value = "";
  catImgInput.value = "";
  catImgPreview.innerHTML = '<span class="text-muted"><i class="bi bi-image me-2"></i>Sin imagen</span>';
  delete catImgPreview.dataset.url;
  bootstrap.Modal.getOrCreateInstance(categoryModal).show();
});

// Preview (guardamos el File y mostramos vista previa)
catImgInput.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = document.createElement("img");
    img.src = reader.result;
    catImgPreview.innerHTML = "";
    catImgPreview.appendChild(img);
  };
  reader.readAsDataURL(f);
});

// Delegación: Ver/Editar/Eliminar categoría
document.addEventListener("click", async (e) => {
  const btnView = e.target.closest(".action-view-cat");
  const btnEdit = e.target.closest(".action-edit-cat");
  const btnDel = e.target.closest(".action-del-cat");

  if (btnView) {
    const id = btnView.dataset.id;
    const cat = CATEGORIES.find(c => c.id === id);
    if (!cat) return;
    swalInfo("Detalle de categoría", `
      <h5 class="fw-bold mb-2">${cat.name}</h5>
      <p class="mb-0 text-secondary">${cat.description || "(Sin descripción)"}</p>
    `);
  }

  if (btnEdit) {
    if (!CAN_WRITE) return;
    const id = btnEdit.dataset.id;
    const cat = CATEGORIES.find(c => c.id === id);
    if (!cat) return;
    categoryModalTitle.textContent = "Editar categoría";
    categorySubmitText.textContent = "Guardar cambios";
    catId.value = cat.id;
    catName.value = cat.name;
    catDesc.value = cat.description || "";
    catImgPreview.innerHTML = cat.img
      ? `<img src="${cat.img}" alt="img">`
      : '<span class="text-muted"><i class="bi bi-image me-2"></i>Sin imagen</span>';
    catImgPreview.dataset.url = cat.img || "";
    catImgInput.value = "";
    bootstrap.Modal.getOrCreateInstance(categoryModal).show();
  }

  if (btnDel) {
    if (!CAN_WRITE) return;
    const id = btnDel.dataset.id;
    swalAsk("¿Eliminar categoría?", "Se eliminarán también sus protocolos asociados.")
      .then(async res => {
        if (!res.isConfirmed) return;
        try {
          const api = await PROTOCOL.DeleteCategoryProtocol(id);
          if (api?.success === false) throw new Error(api.message || "Error al eliminar");
          await fetchCategories();
          renderCategories(searchCategory.value);
          swalOK("Categoría eliminada.");
        } catch (err) {
          swalErr(err.message || "No se pudo eliminar la categoría");
        }
      });
  }
});

// Submit categoría (crear/actualizar)
categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!CAN_WRITE) return;

  const id = catId.value.trim();
  const name = catName.value.trim();
  const desc = catDesc.value.trim();

  if (!name) { swalErr("El nombre es obligatorio."); return; }

  // Subir imagen si se seleccionó; si no, usar la URL existente o vacío
  let imgUrl = catImgPreview.dataset.url || "";
  if (catImgInput.files && catImgInput.files[0]) {
    try {
      const up = await PROTOCOL.UploadImage(catImgInput.files[0], { type: "protocolcategory" });
      if (!up || up.success === false) throw new Error(up?.message || "Error al subir imagen");
      imgUrl = up.data; // URL segura
    } catch (err) {
      swalErr(err.message || "No se pudo subir la imagen");
      return;
    }
  }

  try {
    if (id) {
      // UPDATE
      const payload = {
        name_category_protocol: name,
        description_category_protocol: desc,
        img_protocol: imgUrl || null
      };
      const api = await PROTOCOL.UpdatedCategoryProtocol(id, payload);
      if (!api || api.success === false) throw new Error(api?.message || "Error al actualizar la categoría");
      swalOK("Categoría actualizada.");
    } else {
      // CREATE
      const payload = {
        name_category_protocol: name,
        description_category_protocol: desc,
        img_protocol: imgUrl || null
      };
      const api = await PROTOCOL.InsertCategoryProtocol(payload);
      if (!api || api.success === false) throw new Error(api?.message || "Error al registrar la categoría");
      swalOK("Categoría registrada.");
    }
    bootstrap.Modal.getOrCreateInstance(categoryModal).hide();
    // refrescar categorías
    await fetchCategories();
    renderCategories(searchCategory.value);
  } catch (err) {
    swalErr(err.message || "Ocurrió un error");
  }
});

/* =========================================================
   Eventos · Protocolos
   ========================================================= */
searchProtocol.addEventListener("input", e => {
  const catId = getCurrentCatFromURL();
  renderProtocols(catId, e.target.value);
});

// Botón nuevo protocolo
btnNewProtocol.addEventListener("click", () => {
  if (!CAN_WRITE) return;
  protocolModalTitle.textContent = "Nuevo protocolo";
  protocolSubmitText.textContent = "Registrar Nuevo Protocolo";
  protoId.value = "";
  protoName.value = "";
  protoDesc.value = "";
  protoDate.value = todayYMD(); // solo visual
  protoDate.setAttribute("disabled", "disabled"); // fecha la pone el backend (hoy)
  bootstrap.Modal.getOrCreateInstance(protocolModal).show();
});

// Delegación: editar / eliminar protocolo
document.addEventListener("click", async (e) => {
  const btnEdit = e.target.closest(".action-edit-proto");
  const btnDel = e.target.closest(".action-del-proto");

  if (btnEdit) {
    if (!CAN_WRITE) return;
    const id = btnEdit.dataset.id;
    const p = PROTOCOLS.find(x => x.id === id);
    if (!p) return;
    protocolModalTitle.textContent = "Editar protocolo";
    protocolSubmitText.textContent = "Guardar cambios";
    protoId.value = p.id;
    protoName.value = p.name;
    protoDesc.value = p.description;
    protoDate.value = p.createdAt || todayYMD();
    protoDate.setAttribute("disabled", "disabled");
    bootstrap.Modal.getOrCreateInstance(protocolModal).show();
  }

  if (btnDel) {
    if (!CAN_WRITE) return;
    const id = btnDel.dataset.id;
    swalAsk("¿Eliminar protocolo?", "Esta acción no se puede deshacer.")
      .then(async res => {
        if (!res.isConfirmed) return;
        try {
          const api = await PROTOCOL.DeleteProtocol(id);
          if (!api || api.success === false) throw new Error(api?.message || "Error al eliminar");
          const catId = getCurrentCatFromURL();
          await fetchProtocolsByCategory(catId);
          renderProtocols(catId, searchProtocol.value);
          swalOK("Protocolo eliminado.");
        } catch (err) {
          swalErr(err.message || "No se pudo eliminar el protocolo");
        }
      });
  }
});

// Submit protocolo (crear/actualizar)
protocolForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!CAN_WRITE) return;

  const id = protoId.value.trim();
  const name = protoName.value.trim();
  const desc = protoDesc.value.trim();
  const catId = getCurrentCatFromURL();

  if (!name || !desc) { swalErr("Completa todos los campos."); return; }
  if (!catId) { swalErr("Categoría no válida."); return; }
  if (!CURRENT_NIT) { swalErr("No se pudo obtener el NIT del usuario."); return; }

  try {
    if (id) {
      // UPDATE: mantenemos estado y fecha existentes
      const actual = PROTOCOLS.find(p => p.id === id);
      const payload = {
        name_protocol: name,
        description: desc,
        state_protocol: actual?.state || "HABILITADO",
        dt_created: actual?.createdAt || todayYMD(),
        id_protocol_creator: CURRENT_NIT,
        id_category_protocol: Number(catId)
      };
      const api = await PROTOCOL.UpdateProtocol(id, payload);
      if (!api || api.success === false) throw new Error(api?.message || "Error al actualizar el protocolo");
      swalOK("Protocolo actualizado.");
    } else {
      // CREATE: siempre HABILITADO y fecha HOY
      const payload = {
        name_protocol: name,
        description: desc,
        state_protocol: "HABILITADO",
        dt_created: todayYMD(),
        id_protocol_creator: CURRENT_NIT,
        id_category_protocol: Number(catId)
      };
      const api = await PROTOCOL.InsertProtocol(payload);
      if (!api || api.success === false) throw new Error(api?.message || "Error al registrar el protocolo");
      swalOK("Protocolo registrado.");
    }

    bootstrap.Modal.getOrCreateInstance(protocolModal).hide();
    // refrescar protocolos
    await fetchProtocolsByCategory(catId);
    renderProtocols(catId, searchProtocol.value);
  } catch (err) {
    swalErr(err.message || "Ocurrió un error");
  }
});

/* =========================================================
   Arranque
   ========================================================= */
async function boot() {
  // Protecciones por rol
  await loadAuthAndPermissions();

  // Cargar categorías inicialmente (y protocolos si hay ?cat=)
  await setView();

  // ESC → volver a categorías
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && getCurrentCatFromURL()) {
      const url = new URL(location.href);
      url.searchParams.delete("cat");
      history.pushState({}, "", url);
      setView();
    }
  });
}
boot();
