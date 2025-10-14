
import * as POTENCIALRISK from "../Service/PotencialRiskService.js";
import { AuthStatus } from "../Service/AuthService.js";
import { getAllLocation } from "../Service/LocationService.js";

const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const $  = (sel, root = document) => root.querySelector(sel);
const todayYYYYMMDD = () => new Date().toISOString().slice(0, 10);

function toast(icon, title, timer = 1700) {
  Swal.fire({ icon, title, timer, showConfirmButton: false, position: "top", toast: true });
}

function computeRisk(prob, impact) {
  const p = Number(prob), i = Number(impact);
  const score = p * i;
  let level = "";
  if (score <= 3) level = "MUY BAJO";
  else if (score <= 5) level = "BAJO";
  else if (score <= 9) level = "MEDIO";
  else if (score <= 12) level = "ALTO";
  else if (score <= 16) level = "MUY ALTO";
  else level = "EXTREMO";
  return { score, levelName: level };
}

// Toma campos en MAYÚSCULA o camelCase
const pick = (o, ...ks) => ks.map(k => o?.[k] ?? o?.[toCamel(k)] ?? o?.[toSnake(k)]);
const toCamel = k => k.replace(/_([a-z])/g, (_,c)=>c.toUpperCase()).replace(/^[A-Z]/,c=>c.toLowerCase());
const toSnake = k => k.replace(/[A-Z]/g, c => "_"+c.toLowerCase());

/* =========================================================
   ESTADO GLOBAL
   ========================================================= */
const state = {
  auth: null,                 // {role, committeeRole, nit, ...}
  canSeeAll: false,           // Admin o (Usuario con rol de comité)
  canVerify: false,           // mismos que canSeeAll
  selfOnly: true,             // Usuario normal (sin comité)
  types: [],                  // catálogo de tipos
  locations: [],              // catálogo de ubicaciones
  typePage: 0,                // paginación de tarjetas (6 por página)
  tablePage: 0,               // página actual del backend
  tablePageSize: 10,          // size backend
  lastPage: null,             // Page<> devuelta por el backend (para render)
  filterState: "ALL",         // ALL | PENDIENTE | VERIFICADO
  filterType: "",             // ID_TYPERISK
  filterText: "",             // búsqueda general
  formImages: [null, null, null], // URLs subidas a Cloudinary
  pendingTypeId: null,        // Tipo elegido desde la tarjeta (select bloqueado)
};

/* =========================================================
   ACCESO / PERMISOS
   ========================================================= */
async function bootstrapAuth() {
  const res = await AuthStatus(); // {success, data:{committeeRole, role, nit, ...}}
  const data = res?.data || res;

  const role = data?.role || "";
  const committeeRole = data?.committeeRole || "";
  const nit = data?.nit || "";

  const committeeWhitelist = ["Presidente", "Vicepresidente", "Secretario", "Auxiliar de Emergencia"];

  state.auth = { role, committeeRole, nit };
  state.canSeeAll = role === "Administrador" || (role === "Usuario" && committeeWhitelist.includes(committeeRole));
  state.canVerify = state.canSeeAll;
  state.selfOnly = !state.canSeeAll;
}

/* =========================================================
   CATÁLOGOS
   ========================================================= */
async function loadTypes() {
  const list = await POTENCIALRISK.GetAllTypesRisk(); // [{ID_TYPERISK, NAME_TYPERISK, ...}]
  state.types = Array.isArray(list) ? list : [];
}

async function loadLocations() {
  const list = await getAllLocation(); // [{id_location, name_location, ...}]
  state.locations = Array.isArray(list) ? list : [];
}

/* =========================================================
   UI: RENDER TIPOS (tarjetas 6 por página)
   ========================================================= */
function renderTypePagination() {
  const per = 6;
  const pages = Math.ceil(state.types.length / per) || 1;
  state.typePage = Math.min(state.typePage, pages - 1);

  const start = state.typePage * per;
  const slice = state.types.slice(start, start + per);

  const grid = $("#riskTypeGrid"); grid.innerHTML = "";
  slice.forEach(t => {
    const idType = t.ID_TYPERISK ?? t.idTypeRisk ?? t.id_type_risk;
    const name = t.NAME_TYPERISK ?? t.nameTypeRisk ?? t.name_typerisk ?? t.name_type_risk ?? "Tipo";

    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-2";
    col.innerHTML = `
      <div class="risk-card animate__animated animate__fadeIn" title="${t.DESCRIPTION_TYPERISK ?? ""}">
        <div>
          <div class="mb-2"><i class="bi bi-exclamation-triangle fs-3 text-secondary"></i></div>
          <div class="fw-bold">${String(name).toUpperCase()}</div>
        </div>
      </div>`;
    col.querySelector(".risk-card").addEventListener("click", () => {
      state.pendingTypeId = idType;   // fija la selección
      openCaptureModal();              // abre modal de captura
    });
    grid.appendChild(col);
  });

  const dots = $("#riskDots"); dots.innerHTML = "";
  for (let i = 0; i < pages; i++) {
    const b = document.createElement("button");
    b.className = i === state.typePage ? "active" : "";
    b.addEventListener("click", () => { state.typePage = i; renderTypePagination(); });
    dots.appendChild(b);
  }
}

/* =========================================================
   LISTA: CARGA DEL BACKEND Y RENDER TABLA
   ========================================================= */
async function fetchPage() {
  if (state.canSeeAll) {
    // Admin / Comité → usa filtros del backend
    state.lastPage = await POTENCIALRISK.GetReportsPage({
      status: state.filterState,
      type: state.filterType,
      q: state.filterText,
      page: state.tablePage,
      size: state.tablePageSize
    });
  } else {
    // Usuario normal → solo mis reportes (sin verify)
    state.lastPage = await POTENCIALRISK.GetReportsByEmployee(state.auth.nit, {
      page: state.tablePage,
      size: state.tablePageSize
    });
    // Nota: si quieres aplicar filtros en cliente, podrías filtrar state.lastPage.content aquí.
    // Mantengo backend paging para no romper la paginación real.
  }
}

function typeNameById(idType) {
  const t = state.types.find(x => (x.ID_TYPERISK ?? x.idTypeRisk) === idType);
  return t?.NAME_TYPERISK ?? t?.nameTypeRisk ?? idType ?? "";
}

function mapRow(r) {
  // tolera MAYÚSCULA o camelCase
  const [
    id, dt, rscore, rname, status, idType, identifiedBy, idLoc, locName
  ] = [
    r.ID_REPORTRISK ?? r.idReportRisk,
    r.DT_IDENTIFICATION ?? r.dtIdentification,
    r.RISK_LEVEL_SCORE ?? r.riskLevelScore,
    r.RISK_LEVEL_NAME ?? r.riskLevelName,
    r.STATUSRISK ?? r.statusRisk,
    r.ID_TYPERISK ?? r.idTypeRisk,
    r.IDENTIFIEDBY ?? r.identifiedBy,
    r.ID_LOCATION ?? r.idLocation,
    r.LOCATION_NAME ?? r.locationName
  ];
  return {
    ID_ReportRisk: id,
    DT_Identification: dt,
    Risk_Level_Score: rscore,
    Risk_Level_Name: rname,
    StatusRisk: status,
    ID_TypeRisk: idType,
    IdentifiedBy: identifiedBy,
    ID_Location: idLoc,
    Location_Name: locName || "",
    Type_Name: r.TYPE_NAME ?? r.typeName ?? typeNameById(idType)
  };
}

function renderTable() {
  const page = state.lastPage || { content: [], totalPages: 1, number: 0, size: state.tablePageSize };
  const content = Array.isArray(page.content) ? page.content.map(mapRow) : [];
  const totalPages = page.totalPages ?? 1;
  const current = page.number ?? state.tablePage;

  const tbody = $("#reportTableBody"); tbody.innerHTML = "";
  content.forEach(r => {
    const tr = document.createElement("tr");
    const badge = (r.StatusRisk || "").toUpperCase() === "VERIFICADO"
      ? '<span class="badge-soft verified">VERIFICADO</span>'
      : '<span class="badge-soft pending">PENDIENTE</span>';

    tr.innerHTML = `
      <td class="fw-semibold">${r.Type_Name}</td>
      <td>${r.DT_Identification ?? ""}</td>
      <td><span class="badge-soft">${r.Risk_Level_Name} (${r.Risk_Level_Score})</span></td>
      <td>${r.IdentifiedBy ?? ""}</td>
      <td>${badge}</td>
      <td class="text-center table-actions">
        <i class="bi bi-eye-fill me-1" title="Ver"></i>
        ${state.selfOnly && r.IdentifiedBy !== state.auth.nit ? "" : '<i class="bi bi-pencil-square me-1" title="Editar"></i>'}
        ${state.selfOnly && r.IdentifiedBy !== state.auth.nit ? "" : '<i class="bi bi-trash3" title="Eliminar"></i>'}
      </td>`;

    const icons = tr.querySelectorAll("i");
    if (icons[0]) icons[0].addEventListener("click", () => openDetail(r.ID_ReportRisk));
    if (icons[1]) icons[1].addEventListener("click", () => editReport(r.ID_ReportRisk));
    if (icons[2]) icons[2].addEventListener("click", () => deleteReport(r.ID_ReportRisk));

    tbody.appendChild(tr);
  });

  // Paginador (usa metadata del backend)
  const pager = $("#tablePager"); pager.innerHTML = "";
  const mk = (label, pageNum, disabled = false, active = false) => {
    const li = document.createElement("li");
    li.className = `page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${label}</a>`;
    li.addEventListener("click", (e) => {
      e.preventDefault();
      if (disabled) return;
      state.tablePage = pageNum;
      refreshTable();
    });
    pager.appendChild(li);
  };
  mk("«", 0, current === 0);
  mk("‹", Math.max(0, current - 1), current === 0);
  for (let i = 0; i < totalPages; i++) mk(i + 1, i, false, i === current);
  mk("›", Math.min(totalPages - 1, current + 1), current >= totalPages - 1);
  mk("»", totalPages - 1, current >= totalPages - 1);
}

async function refreshTable() {
  try {
    $("#reportTableBody").innerHTML = `<tr><td colspan="6" class="text-center py-4">Cargando…</td></tr>`;
    await fetchPage();
    renderTable();
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: "error", title: "Error", text: err.message || "No se pudo cargar la tabla." });
    $("#reportTableBody").innerHTML = "";
  }
}

/* =========================================================
   CAPTURA (Modal) – Tipo de Riesgo bloqueado
   ========================================================= */
const captureModal = new bootstrap.Modal("#captureModal");
const detailModal  = new bootstrap.Modal("#detailModal");

async function openCaptureModal() {
  // poblar select de tipos (solo para mostrar; queda disabled)
  const selType = $("#typeRisk");
  selType.innerHTML = state.types
    .map(t => `<option value="${t.ID_TYPERISK ?? t.idTypeRisk}">${t.NAME_TYPERISK ?? t.nameTypeRisk}</option>`)
    .join("");
  selType.disabled = true;

  // poblar ubicaciones desde API
  const selLoc = $("#location");
  selLoc.innerHTML = state.locations
    .map(l => `<option value="${l.id_location}">${l.name_location}</option>`)
    .join("");

  // limpiar form
  $("#riskForm").reset();
  $("#riskLevel").value = "";
  state.formImages = [null, null, null];
  $$(".evidence-slot").forEach(slot => {
    slot.innerHTML = `
      <div class="evidence-drop w-100 h-100 d-flex align-items-center justify-content-center">
        <i class="bi bi-plus-lg fs-2"></i>
      </div>`;
  });

  if (!state.pendingTypeId) {
    Swal.fire({ icon: "warning", title: "Selecciona un tipo", text: "Primero elige una tarjeta de tipo de riesgo." });
    return;
  }
  selType.value = state.pendingTypeId;
  captureModal.show();
}

function bindEvidenceInputs() {
  // abrir input al click en slot
  $$(".evidence-slot").forEach(slot => {
    slot.addEventListener("click", () => {
      const idx = Number(slot.dataset.slot);
      document.querySelector(`input[type="file"][data-input="${idx}"]`).click();
    });
  });

  // cuando se elige archivo → subir a Cloudinary vía API y previsualizar
  $$('input[type="file"][data-input]').forEach(input => {
    input.addEventListener("change", async () => {
      const idx = Number(input.dataset.input);
      const file = input.files?.[0];
      if (!file) return;

      const slot = document.querySelector(`.evidence-slot[data-slot="${idx}"]`);
      const prev = slot.innerHTML;
      slot.innerHTML = `<div class="small text-muted">Subiendo…</div>`;

      try {
        const up = await POTENCIALRISK.UploadImage(file, { folder: "evidenceRisk" });
        const url = up?.data || up; // {success, data:'https://...'}
        state.formImages[idx] = url;

        slot.innerHTML = `<img src="${url}" alt="Evidencia ${idx + 1}" style="object-fit:cover;width:100%;height:100%">`;
      } catch (err) {
        console.error(err);
        slot.innerHTML = prev;
        Swal.fire({ icon: "error", title: "No se pudo subir la imagen", text: err.message });
      }
    });
  });
}

function liveRiskLevel() {
  const probSel = $("#prob"), impSel = $("#impact"), level = $("#riskLevel");
  const update = () => {
    const p = probSel.value, i = impSel.value;
    if (p && i) {
      const { score, levelName } = computeRisk(p, i);
      level.value = `${levelName} (${score})`;
    } else { level.value = ""; }
  };
  probSel.addEventListener("change", update);
  impSel.addEventListener("change", update);
}

async function saveReport() {
  const form = $("#riskForm");
  if (!form.checkValidity()) {
    form.classList.add("was-validated");
    toast("error", "Completa los campos requeridos");
    return;
  }
  const evids = state.formImages.filter(Boolean);
  if (!evids.length) {
    Swal.fire({ icon: "warning", title: "Falta evidencia", text: "Debes adjuntar al menos 1 imagen." });
    return;
  }

  try {
    const body = {
      "DESCRIPTIONRISK": $("#desc").value.trim(),
      "PROBABILITY_SCORE": Number($("#prob").value),
      "IMPACT_SCORE": Number($("#impact").value),
      "DT_IDENTIFICATION": todayYYYYMMDD(),
      "STATUSRISK": "PENDIENTE",
      "ID_TYPERISK": state.pendingTypeId,
      "IDENTIFIEDBY": state.auth.nit,
      "ID_LOCATION": $("#location").value,
      "EVIDENCES": evids
    };

    await POTENCIALRISK.InsertReport(body);
    captureModal.hide();
    toast("success", "Reporte creado");
    // reset selección para siguiente alta
    state.pendingTypeId = null;
    // recargar tabla desde backend (página 0 para que aparezca arriba)
    state.tablePage = 0;
    await refreshTable();
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: "error", title: "Error al crear", text: err.message });
  }
}

/* =========================================================
   DETALLE / EDITAR / ELIMINAR / VERIFICAR
   ========================================================= */
async function openDetail(id) {
  try {
    const r = await POTENCIALRISK.GetReportById(id); // DTO completo con EVIDENCES
    const data = r; // json?.data ya lo maneja el wrapper

    const ID  = data.ID_REPORTRISK ?? data.idReportRisk;
    const DT  = data.DT_IDENTIFICATION ?? data.dtIdentification;
    const NM  = data.RISK_LEVEL_NAME ?? data.riskLevelName;
    const SC  = data.RISK_LEVEL_SCORE ?? data.riskLevelScore;
    const ST  = (data.STATUSRISK ?? data.statusRisk ?? "").toUpperCase();
    const TY  = data.TYPE_NAME ?? data.typeName ?? typeNameById(data.ID_TYPERISK ?? data.idTypeRisk);
    const LOC = data.LOCATION_NAME ?? data.locationName ?? (data.ID_LOCATION ?? "");
    const P   = data.PROBABILITY_SCORE ?? data.probabilityScore;
    const I   = data.IMPACT_SCORE ?? data.impactScore;
    const EVS = Array.isArray(data.EVIDENCES) ? data.EVIDENCES : [];

    $("#detailInfo").innerHTML = `
      <div class="d-grid" style="grid-template-columns: 150px 1fr; gap:.25rem .75rem">
        <div class="text-muted">ID Reporte</div><div>${ID}</div>
        <div class="text-muted">Fecha</div><div>${DT ?? ""}</div>
        <div class="text-muted">Tipo</div><div>${TY}</div>
        <div class="text-muted">Ubicación</div><div>${LOC}</div>
        <div class="text-muted">Probabilidad</div><div>${P}</div>
        <div class="text-muted">Impacto</div><div>${I}</div>
        <div class="text-muted">Nivel</div><div><span class="badge-soft">${NM} (${SC})</span></div>
        <div class="text-muted">Estado</div><div>${ST === "VERIFICADO" ? '<span class="badge-soft verified">VERIFICADO</span>' : '<span class="badge-soft pending">PENDIENTE</span>'}</div>
        <div class="text-muted">Reportador</div><div>${data.IDENTIFIEDBY ?? data.identifiedBy ?? ""}</div>
      </div>`;

    const imgs = $("#detailImages"); imgs.innerHTML = "";
    EVS.filter(Boolean).forEach(u => {
      const col = document.createElement("div"); col.className = "col-6";
      col.innerHTML = `<img class="w-100 rounded-3" style="object-fit:cover;height:150px" src="${u}">`;
      imgs.appendChild(col);
    });
    $("#detailDesc").textContent = data.DESCRIPTIONRISK ?? data.descriptionRisk ?? "";

    const footer = $("#detailFooter"); footer.innerHTML = "";
    const canShowVerify = state.canVerify && ST === "PENDIENTE";
    if (canShowVerify) {
      const btnV = document.createElement("button"); btnV.className = "btn btn-success";
      btnV.innerHTML = '<i class="bi bi-check2-circle"></i> Dar como Verificado';
      btnV.addEventListener("click", async () => {
        try {
          await POTENCIALRISK.VerifyReport(ID);
          detailModal.hide();
          toast("success", "Reporte verificado");
          await refreshTable();
        } catch (err) {
          Swal.fire({ icon: "error", title: "No se pudo verificar", text: err.message });
        }
      });
      footer.appendChild(btnV);
    } else {
      footer.innerHTML = `<span class="text-success fw-semibold">${ST === "VERIFICADO" ? "Este reporte ya está verificado." : (state.selfOnly ? "No tienes permisos para verificar." : "")}</span>`;
    }

    detailModal.show();
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: "error", title: "Error", text: err.message || "No se pudo cargar el detalle." });
  }
}

async function editReport(id) {
  try {
    const data = await POTENCIALRISK.GetReportById(id);
    state.pendingTypeId = data.ID_TYPERISK ?? data.idTypeRisk;

    await openCaptureModal();

    // completar campos
    $("#prob").value     = data.PROBABILITY_SCORE ?? data.probabilityScore ?? "";
    $("#impact").value   = data.IMPACT_SCORE ?? data.impactScore ?? "";
    $("#location").value = data.ID_LOCATION ?? data.idLocation ?? "";
    $("#desc").value     = data.DESCRIPTIONRISK ?? data.descriptionRisk ?? "";
    const { levelName, score } = computeRisk($("#prob").value, $("#impact").value);
    $("#riskLevel").value = `${levelName} (${score})`;

    // evidencias actuales
    state.formImages = Array.isArray(data.EVIDENCES) ? [...data.EVIDENCES].slice(0,3) : [null, null, null];
    state.formImages.forEach((img, idx) => {
      if (img) {
        const slot = document.querySelector(`.evidence-slot[data-slot="${idx}"]`);
        if (slot) slot.innerHTML = `<img src="${img}" alt="Evidencia ${idx+1}" style="object-fit:cover;width:100%;height:100%">`;
      }
    });

    // Guardar (sobrescribe handler temporalmente)
    const btn = $("#saveReportBtn");
    const originalHandler = btn.onclick;
    btn.onclick = async () => {
      try {
        const body = {
          "DESCRIPTIONRISK": $("#desc").value.trim(),
          "PROBABILITY_SCORE": Number($("#prob").value),
          "IMPACT_SCORE": Number($("#impact").value),
          "ID_LOCATION": $("#location").value,
          // enviar evidencias si hay (el service reemplaza si llegan)
          "EVIDENCES": state.formImages.filter(Boolean)
        };
        await POTENCIALRISK.UpdateReport(id, body);
        captureModal.hide();
        toast("success", "Cambios guardados");
        state.pendingTypeId = null;
        await refreshTable();
      } catch (err) {
        Swal.fire({ icon: "error", title: "No se pudo actualizar", text: err.message });
      } finally {
        // restaurar handler
        btn.onclick = originalHandler;
      }
    };
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: "error", title: "Error", text: err.message || "No se pudo cargar el reporte para edición." });
  }
}

async function deleteReport(id) {
  const confirm = await Swal.fire({
    icon: "question",
    title: "¿Eliminar reporte?",
    text: "Esta acción no se puede deshacer.",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#d33"
  });
  if (!confirm.isConfirmed) return;

  try {
    await POTENCIALRISK.DeleteReport(id);
    toast("success", "Reporte eliminado");
    await refreshTable();
  } catch (err) {
    Swal.fire({ icon: "error", title: "No se pudo eliminar", text: err.message });
  }
}

/* =========================================================
   FILTROS (solo Admin/Comité impactan al backend)
   ========================================================= */
function initFilters() {
  // Tipos
  const sel = $("#filterType");
  sel.innerHTML = '<option value="">Tipo de Riesgos</option>' +
    state.types.map(t => `<option value="${t.ID_TYPERISK ?? t.idTypeRisk}">${t.NAME_TYPERISK ?? t.nameTypeRisk}</option>`).join("");
  sel.addEventListener("change", async () => {
    state.filterType = sel.value;
    state.tablePage = 0;
    if (state.canSeeAll) await refreshTable();
    else renderTable(); // usuario normal (sin filtros en backend)
  });

  // Búsqueda
  $("#filterText").addEventListener("input", async (e) => {
    state.filterText = e.target.value;
    state.tablePage = 0;
    if (state.canSeeAll) await refreshTable();
    else renderTable();
  });

  // Píldoras estado
  $$(".pill-tabs .btn").forEach(b => {
    b.addEventListener("click", async () => {
      $$(".pill-tabs .btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      state.filterState = b.dataset.state;
      state.tablePage = 0;
      if (state.canSeeAll) await refreshTable();
      else renderTable();
    });
  });
}

/* =========================================================
   INIT
   ========================================================= */
function initCreateHandler() {
  $("#saveReportBtn").onclick = saveReport;
}

function attachCommonHandlers() {
  // Si cierras el modal después de “editar”, vuelve a modo crear
  document.getElementById("captureModal")
    .addEventListener("hidden.bs.modal", () => {
      document.getElementById("saveReportBtn").onclick = saveReport;
      state.pendingTypeId = null;
    });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1) Auth y permisos
    await bootstrapAuth();

    // 2) Catálogos
    await Promise.all([loadTypes(), loadLocations()]);

    // 3) Render tarjetas tipos y filtros
    renderTypePagination();
    initFilters();

    // 4) Tabla (backend)
    await refreshTable();

    // 5) Evidencias y UI
    bindEvidenceInputs();
    liveRiskLevel();
    initCreateHandler();
    attachCommonHandlers();

    // 6) UI segun permisos (oculta “Dar como verificado” en detalle si no puede)
    // (ya se controla al construir footer del modal de detalle)

  } catch (err) {
    console.error(err);
    Swal.fire({ icon: "error", title: "Error al iniciar", text: err.message || "No se pudo inicializar la vista." });
  }
});

/* =========================================================
   API pública (si necesitas desde HTML)
   ========================================================= */
window.RiskUI = {
  openCaptureModal,
  openDetail,
  editReport,
  deleteReport
};
