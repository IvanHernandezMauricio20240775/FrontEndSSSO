// MaitanenceController.js
import * as MAINT from "../Service/MaintenanceService.js";
import { AuthStatus } from "../Service/AuthService.js";
import { getAllLocation } from "../Service/LocationService.js";
import { GetAllListMemberCommite } from "../Service/CommiteService.js";

/* ========================= Estado UI / Helpers ========================= */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function swalOk(t) { return Swal.fire({ icon: "success", title: "Listo", text: t, confirmButtonColor: "#169b87" }); }
function swalErr(t) { return Swal.fire({ icon: "error", title: "Ups", text: t, confirmButtonColor: "#169b87" }); }
function swalAsk(tt, tx, ok = "Sí") {
  return Swal.fire({
    icon: "question", title: tt, text: tx,
    showCancelButton: true, confirmButtonText: ok, cancelButtonText: "Cancelar",
    confirmButtonColor: "#169b87"
  });
}
function parseHHMMSS(v) {
  const m = /^(\d{2}):(\d{2}):(\d{2})$/.exec((v || "").trim());
  if (!m) return null;
  const h = +m[1], mm = +m[2], s = +m[3]; if (mm > 59 || s > 59) return null;
  return h * 3600 + mm * 60 + s;
}
function cleanBackdrops() {
  document.body.classList.remove("modal-open");
  document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());
}
function stripe(ui) {
  if (ui === "COMPLETADO") return "done";
  if (ui === "VENCIDO") return "overdue";
  return "pending";
}

/* ========================= Estado Global ========================= */
let CURRENT_USER = null;
let PERMS = {
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canRealize: false,
  seeAll: false,
  seeOnlyOwn: false
};

let TYPES = [];      // [{ id_type, name }]
let LOCATIONS = [];  // [{ id_location, name }]
let EMPLOYEES = [];  // [{ id_member, name, nit }]
let ASSIGN_VIEW = []; // lista de AssignMaintenanceViewDTO (desde API)

/* Filtros & paginación */
let curStatus = "ALL", curType = "ALL", curQuery = "";
let page = 1;
const PAGE_SIZE = 10;

/* ========================= Permisos por rol ========================= */
function computePerms(claims) {
  const role = (claims?.role || "").trim();
  const committeeRole = (claims?.committeeRole || "").trim();

  const IS_ADMIN = role === "Administrador";
  const BOARD = role === "Usuario" && ["Presidente", "Vicepresidente", "Secretario"].includes(committeeRole);
  const IS_MAINT = role === "Usuario" && committeeRole === "Mantenimiento";

  PERMS.canCreate = IS_ADMIN || BOARD;
  PERMS.canEdit = IS_ADMIN || BOARD;
  PERMS.canDelete = IS_ADMIN || BOARD;
  PERMS.canRealize = IS_MAINT;
  PERMS.seeAll = IS_ADMIN || BOARD;
  PERMS.seeOnlyOwn = IS_MAINT;

  // Control de UI
  $("#btnOpenAssign")?.classList.toggle("d-none", !PERMS.canCreate);
}

/* ========================= Cargas Iniciales ========================= */
async function loadAuth() {
  const me = await AuthStatus(); // Debe devolver { ok, status, data: {...} }
  console.log("[AuthStatus] =>", me);
  if (!me || !me.ok || !me.data) {
    await swalErr("No se pudo obtener la sesión del usuario.");
    throw new Error("AuthStatus inválido");
  }
  CURRENT_USER = me.data; // { role, committeeRole, idMember, ...}
  computePerms(CURRENT_USER);

  if (!PERMS.seeAll && !PERMS.seeOnlyOwn) {
    await Swal.fire({
      icon: "warning",
      title: "Acceso restringido",
      text: "No tienes acceso a esta sección.",
      confirmButtonColor: "#169b87"
    });
    // Opcional: ocultar todo el contenido
    $("main")?.classList.add("d-none");
    throw new Error("Sin permisos");
  }
}

async function loadTypes() {
  const resp = await MAINT.getAllTypes();
  console.log("[GetAllTypeMaintenance] =>", resp);
  const arr = resp?.data || [];
  TYPES = arr.map(t => ({
    id_type: t.id_type_maintence,
    name: t.name_type
  }));
}

async function loadLocations() {
  const resp = await getAllLocation();
  console.log("[getAllLocation] =>", resp);
  const arr = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
  LOCATIONS = arr.map(l => ({
    id_location: l.id_location,
    name: l.name_location
  }));
}

async function loadEmployeesMaint() {
  const resp = await GetAllListMemberCommite();
  console.log("[GetAllListMemberCommite] =>", resp);
  const arr = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
  // Solo Mantenimiento + Activo
  EMPLOYEES = arr
    .filter(x => (x.position === "Mantenimiento") && (x.status === "Activo"))
    .map(x => ({ id_member: x.id_member, name: x.full_name, nit: x.nit }));
}

async function loadAssignments() {
  if (PERMS.seeAll) {
    const resp = await MAINT.getAllAssignMaintenanceView();
    console.log("[GetAllAssignMaintenanceView] =>", resp);
    ASSIGN_VIEW = resp?.data || [];
  } else {
    const idm = CURRENT_USER?.idMember;
    const resp = await MAINT.getAssignViewByMember(idm);
    console.log("[AssignViewByMember] =>", resp);
    ASSIGN_VIEW = resp?.data || [];
  }
}

/* ========================= Selects / pickers ========================= */
function fillTypeFilters() {
  $("#typeFilter").innerHTML =
    `<option value="ALL">Tipo de Mantenimiento</option>` +
    TYPES.map(t => `<option value="${t.id_type}">${t.name}</option>`).join("");
}
function fillAssignSelects() {
  $("#asigType").innerHTML = TYPES.map(t => `<option value="${t.id_type}">${t.name}</option>`).join("");
  $("#asigLocation").innerHTML = LOCATIONS.map(l => `<option value="${l.id_location}">${l.name}</option>`).join("");
}
function buildEmpPicker(selectedId) {
  const wrap = $("#empPicker");
  wrap.innerHTML = EMPLOYEES.map(e => `
    <div class="emp-pill ${String(selectedId) === String(e.id_member) ? 'active' : ''}" data-id="${e.id_member}">
      <div class="avatar"><i class="bi bi-person-gear"></i></div>
      <div>
        <div class="fw-semibold">${e.name}</div>
        <div class="meta">${e.nit}</div>
      </div>
    </div>`).join("");
  wrap.onclick = (ev) => {
    const pill = ev.target.closest(".emp-pill"); if (!pill) return;
    $$("#empPicker .emp-pill").forEach(x => x.classList.remove("active"));
    pill.classList.add("active");
    $("#asigEmployeeId").value = pill.dataset.id;
  };
}

/* ========================= Filtros/Paginación/Render ========================= */
function applyFilters(list) {
  return list.filter(x => {
    // DTO fields desde backend
    let uiState = x.state_maintenace || "PENDIENTE";
    try {
      if (uiState === "PENDIENTE") {
        const dt = new Date(x.date_maintenance);
        const now = new Date(); now.setHours(0,0,0,0);
        if (dt < now) uiState = "VENCIDO";
      }
    } catch {}
    x.__uiState = uiState;

    const s = curStatus === "ALL" ? true : x.__uiState === curStatus;
    const t = curType === "ALL" ? true : String(x.id_type_maintence) === String(curType);

    const q = curQuery.trim().toLowerCase();
    const matchQ = !q ? true :
      String(x.id_maintenace).toLowerCase().includes(q) ||
      (x.member_name || "").toLowerCase().includes(q) ||
      (x.type_name || "").toLowerCase().includes(q) ||
      (x.location_name || "").toLowerCase().includes(q);

    return s && t && matchQ;
  });
}
function updateKpis(list) {
  const done = list.filter(x => x.__uiState === "COMPLETADO").length;
  const pend = list.filter(x => x.__uiState !== "COMPLETADO").length;
  $("#kpiDone").textContent = done;
  $("#kpiPending").textContent = pend;
}
function render() {
  const data = applyFilters(ASSIGN_VIEW.slice());
  updateKpis(data.slice());

  const total = data.length;
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > maxPage) page = maxPage;
  const start = (page - 1) * PAGE_SIZE, slice = data.slice(start, start + PAGE_SIZE);

  $("#pageInfo").textContent = `Mostrando ${total ? start + 1 : 0}–${start + slice.length} de ${total}`;
  $("#btnPrev").disabled = page <= 1; $("#btnNext").disabled = page >= maxPage;

  const cont = $("#cardsContainer"), empty = $("#emptyState");
  cont.innerHTML = ""; empty.classList.toggle("d-none", slice.length > 0);

  slice.forEach(a => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-4 col-xxl-3 animate__animated animate__fadeInUp animate__faster";

    // Acciones visibles según permisos/estado
    const canEdit = PERMS.canEdit;
    const canDelete = PERMS.canDelete;
    const canRealize = PERMS.canRealize && a.__uiState !== "COMPLETADO"; // solo si no completado
    const showView = a.__uiState === "COMPLETADO";

    const actions = [];
    if (canEdit) {
      actions.push(`<button class="btn btn-outline-primary btn-sm" data-action="edit" data-id="${a.id_assign_maintence}">
                      <i class="bi bi-pencil-square me-1"></i> Actualizar
                    </button>`);
    }
    if (canRealize) {
      actions.push(`<button class="btn btn-warning btn-sm" data-action="do" data-id="${a.id_assign_maintence}">
                      <i class="bi bi-wrench me-1"></i> Realizar
                    </button>`);
    }
    if (showView) {
      actions.push(`<button class="btn btn-outline-secondary btn-sm" data-action="view" data-id="${a.id_assign_maintence}">
                      <i class="bi bi-eye me-1"></i> Ver
                    </button>`);
    }
    if (canDelete) {
      actions.push(`<button class="btn btn-outline-danger btn-sm" data-action="delete" data-id="${a.id_assign_maintence}">
                      <i class="bi bi-trash3 me-1"></i> Eliminar
                    </button>`);
    }

    col.innerHTML = `
      <div class="card-mnt">
        <span class="stripe ${stripe(a.__uiState)}"></span>

        <div class="d-flex justify-content-between align-items-start">
          <div class="fw-semibold">Cod-Mantenimiento: ${a.id_maintenace}</div>
          <span class="state-pill ${stripe(a.__uiState)}">${a.__uiState}</span>
        </div>

        <div class="mt-2">
          <div class="label">Tipo de Mantenimiento: <span class="value">${a.type_name || "—"}</span></div>
          <div class="label">Encargado: <span class="value">${a.member_name || "—"}</span></div>
          <div class="label">Fecha: <span class="value">${a.date_maintenance || "—"}</span></div>
          <div class="label">Ubicación: <span class="value">${a.location_name || "—"}</span></div>
        </div>

        <div class="card-actions">
          ${actions.join("\n")}
        </div>
      </div>
    `;

    col.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]"); if (!btn) return;
      const id = Number(btn.dataset.id); const act = btn.dataset.action;
      if (act === "edit") openAssignForEdit(id);
      else if (act === "delete") deleteAssign(id);
      else if (act === "view") viewDetails(id);
      else if (act === "do") openDetail(id);
    });
    cont.appendChild(col);
  });
}

/* ========================= Asignar / Editar ========================= */
async function openAssignNew() {
  if (!PERMS.canCreate) return swalErr("No tienes permisos para crear asignaciones.");

  $("#assignModalTitle").textContent = "Asignar Mantenimiento";
  $("#assignBtnText").textContent = "Guardar";
  $("#hiddenEditingAssignId").value = "";

  try {
    const next = await MAINT.nextMaintenanceId();
    console.log("[NextMaintenanceId] =>", next);
    $("#asigId").value = next?.data || "";
  } catch {
    $("#asigId").value = "";
  }

  $("#asigDate").value = "";
  $("#asigType").value = TYPES[0]?.id_type || "";
  $("#asigLocation").value = LOCATIONS[0]?.id_location || "";
  $("#asigDesc").value = "";
  $("#asigEmployeeId").value = "";
  buildEmpPicker(null);

  bootstrap.Modal.getOrCreateInstance($("#modalAssign")).show();
}

function findViewByAssign(idAssign) {
  return ASSIGN_VIEW.find(x => Number(x.id_assign_maintence) === Number(idAssign));
}

async function openAssignForEdit(idAssign) {
  if (!PERMS.canEdit) return swalErr("No tienes permisos para actualizar asignaciones.");
  const v = findViewByAssign(idAssign);
  if (!v) return swalErr("No se encontró la asignación seleccionada.");

  $("#assignModalTitle").textContent = "Actualizar Mantenimiento";
  $("#assignBtnText").textContent = "Guardar cambios";
  $("#hiddenEditingAssignId").value = idAssign;

  $("#asigId").value = v.id_maintenace;
  $("#asigDate").value = (v.date_maintenance || "").slice(0, 10);
  $("#asigType").value = v.id_type_maintence;
  $("#asigLocation").value = v.id_location || "";
  $("#asigDesc").value = ""; // el DTO de vista no tiene description; puedes dejarlo vacío o traerlo en otro endpoint si lo agregas
  $("#asigEmployeeId").value = v.id_member;
  buildEmpPicker(v.id_member);

  bootstrap.Modal.getOrCreateInstance($("#modalAssign")).show();
}

/* Submit crear/actualizar */
$("#formAssign").addEventListener("submit", async (e) => {
  e.preventDefault();
  const editing = $("#hiddenEditingAssignId").value;

  const idMaintenance = $("#asigId").value.trim();
  const date = $("#asigDate").value;
  const idType = Number($("#asigType").value);
  const idLocation = $("#asigLocation").value || null;
  const desc = $("#asigDesc").value.trim(); // (aún no se persiste en vista)
  const idMember = Number($("#asigEmployeeId").value);

  if (!idMember) return swalErr("Selecciona un encargado (tarjeta).");
  if (!date) return swalErr("La fecha es obligatoria.");

  // Validación de fecha futura SOLO en crear
  if (!editing) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(date + "T00:00:00") < today) return swalErr("La fecha debe ser hoy o futura.");
  }

  try {
    if (!editing) {
      const maintenance = {
        id_maintenace: idMaintenance,
        date_maintenance: date,
        state_maintenace: "PENDIENTE",
        id_member: idMember,
        id_location: idLocation
      };
      const assign = {
        id_type_maintence: idType,
        id_maintenace: idMaintenance
      };
      console.log("[POST payload] InsertMaintenanceAndAssign =>", { maintenance, assign });
      const resp = await MAINT.insertMaintenanceAndAssign({ maintenance, assign });
      console.log("[POST resp] InsertMaintenanceAndAssign =>", resp);
      await swalOk("Asignación creada");
    } else {
      const view = findViewByAssign(Number(editing));
      if (!view) return swalErr("No se encontró la asignación para actualizar.");

      const maintenance = {
        id_maintenace: idMaintenance,
        date_maintenance: date,
        state_maintenace: view.state_maintenace || "PENDIENTE",
        id_member: idMember,
        id_location: idLocation
      };
      const assign = {
        id_assign_maintence: Number(editing),
        id_type_maintence: idType,
        id_maintenace: idMaintenance
      };
      console.log("[PUT payload] UpdateAssignment =>", { idAssign: Number(editing), maintenance, assign });
      const resp = await MAINT.updateAssignment(Number(editing), { maintenance, assign });
      console.log("[PUT resp] UpdateAssignment =>", resp);
      await swalOk("Asignación actualizada");
    }

    bootstrap.Modal.getOrCreateInstance($("#modalAssign")).hide();
    cleanBackdrops();
    await reloadAndRender();
  } catch (err) {
    console.error("formAssign submit error:", err);
    swalErr(err.message || "No se pudo guardar la asignación.");
  }
});

/* ========================= Eliminar ========================= */
async function deleteAssign(idAssign) {
  if (!PERMS.canDelete) return swalErr("No tienes permisos para eliminar asignaciones.");
  const ok = await swalAsk("Eliminar mantenimiento", "Se eliminará la asignación y sus detalles.", "Eliminar");
  if (!ok.isConfirmed) return;

  try {
    console.log("[DELETE] idAssign =>", idAssign);
    const resp = await MAINT.deleteAssignment(idAssign);
    console.log("[DELETE resp] =>", resp);
    await swalOk("Asignación eliminada");
    await reloadAndRender();
  } catch (err) {
    console.error("deleteAssign error:", err);
    swalErr(err.message || "No se pudo eliminar la asignación.");
  }
}

/* ========================= Realizar / Detalle ========================= */
function openDetail(idAssign) {
  if (!PERMS.canRealize) return swalErr("No tienes permisos para realizar mantenimientos.");
  const v = findViewByAssign(idAssign);
  if (!v) return swalErr("No se encontró la asignación.");

  $("#detHeadId").textContent = `#${v.id_maintenace}`;
  $("#hiddenAssignIdForDetail").value = idAssign;
  $("#detName").value = ""; $("#detTime").value = ""; $("#detActivity").value = "";
  $("#detDesc").value = ""; $("#detImg").value = "";

  bootstrap.Modal.getOrCreateInstance($("#modalDetail")).show();
}

$("#formDetail").addEventListener("submit", async (e) => {
  e.preventDefault();
  const idAssign = Number($("#hiddenAssignIdForDetail").value);
  if (!PERMS.canRealize) return swalErr("No tienes permisos para realizar mantenimientos.");

  const name = $("#detName").value.trim();
  const time = $("#detTime").value.trim();
  const activity = $("#detActivity").value.trim();
  const desc = $("#detDesc").value.trim();
  const file = $("#detImg").files[0] || null;

  if (!name) return swalErr("Ingresa el nombre del detalle.");
  const secs = parseHHMMSS(time);
  if (secs == null) return swalErr("Tiempo total debe tener el formato HH:mm:ss.");
  if (secs < 40) return swalErr("La duración mínima es 00:00:40.");
  if (!activity) return swalErr("Describe la actividad realizada.");

  try {
    let imgUrl = null;
    if (file) {
      const up = await MAINT.UploadImage(file, { type: "DetailMaintenance" });
      console.log("[UploadImage resp] =>", up);
      imgUrl = up?.data || null; // URL devuelta por ApiResponse
    }

    const detailDto = {
      name_maintence: name,
      total_time: time,
      description: desc || null,
      activity,
      img_maintence: imgUrl,
      id_assign_maintence: idAssign
    };
    console.log("[POST payload] InsertDetail =>", detailDto);

    const resp = await MAINT.insertDetail(detailDto);
    console.log("[POST resp] InsertDetail =>", resp);

    bootstrap.Modal.getOrCreateInstance($("#modalDetail")).hide();
    cleanBackdrops();
    await swalOk("Mantenimiento completado");
    await reloadAndRender();
  } catch (err) {
    console.error("formDetail submit error:", err);
    swalErr(err.message || "No se pudo registrar el detalle.");
  }
});

/* ========================= Ver detalles ========================= */
async function viewDetails(idAssign) {
  try {
    const v = findViewByAssign(idAssign);
    $("#viewHeadId").textContent = `#${v?.id_maintenace || ""}`;

    const resp = await MAINT.detailByAssign(idAssign);
    console.log("[GET] DetailByAssign =>", resp);

    const d = resp?.data;
    if (!d) {
      $("#viewBody").innerHTML = `<div class="text-muted">Sin detalles registrados.</div>`;
    } else {
      $("#viewBody").innerHTML = `
        <div class="border rounded p-3 mb-2">
          <div class="d-flex justify-content-between">
            <div class="fw-semibold">${d.name_maintence}</div>
            <span class="badge bg-light text-dark"><i class="bi bi-hourglass-split me-1"></i>${d.total_time}</span>
          </div>
          <div class="text-muted mb-2">${d.activity}</div>
          <div class="row g-2 align-items-center">
            <div class="col-md-9">${d.description || "—"}</div>
            <div class="col-md-3 text-end">${d.img_maintence ? `<img src="${d.img_maintence}" class="img-fluid rounded">` : ""}</div>
          </div>
        </div>`;
    }
    bootstrap.Modal.getOrCreateInstance($("#modalView")).show();
  } catch (err) {
    console.error("viewDetails error:", err);
    $("#viewBody").innerHTML = `<div class="text-muted">Sin detalles registrados.</div>`;
    bootstrap.Modal.getOrCreateInstance($("#modalView")).show();
  }
}

/* ========================= Eventos UI ========================= */
$("#btnOpenAssign").addEventListener("click", openAssignNew);
$("#btnPrev").addEventListener("click", () => { page = Math.max(1, page - 1); render(); });
$("#btnNext").addEventListener("click", () => { page = page + 1; render(); });

$$("#statusTabs .nav-link").forEach(btn => {
  btn.addEventListener("click", () => {
    $$("#statusTabs .nav-link").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    curStatus = btn.dataset.status; page = 1; render();
  });
});
$("#typeFilter").addEventListener("change", e => { curType = e.target.value; page = 1; render(); });
$("#searchBox").addEventListener("input", e => { curQuery = e.target.value; page = 1; render(); });

/* ========================= Ciclo de vida ========================= */
async function reloadAndRender() {
  await loadAssignments();
  page = 1;
  render();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Asegura limpiar backdrop siempre que cierren modales
    ["modalAssign", "modalDetail", "modalView"].forEach(id => {
      document.getElementById(id).addEventListener("hidden.bs.modal", cleanBackdrops);
    });

    await loadAuth();       // Permisos + gating
    await Promise.all([
      loadTypes(),
      loadLocations(),
      loadEmployeesMaint()
    ]);
    fillTypeFilters();
    fillAssignSelects();
    await reloadAndRender();
  } catch (err) {
    console.error("Init error:", err);
  }
});
