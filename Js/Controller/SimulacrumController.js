import * as Simulacrum from "../Service/SimulacrumService.js";
import { AuthStatus } from "../Service/AuthService.js";

/* =================== Estado global (API) =================== */
let TYPES = [];       // [{ ID_TypeSimulacrum, Name_TypeSimulacrum }]
let SIMULACROS = [];  // normalizados
let RBAC = { canView: false, canManage: false, canReport: false };
let CURRENT_USER = { idMember: null, role: "", committeeRole: "" };

/* =================== Helpers UI =================== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const teal = "#169b87";
const teal700 = "#0c8b7e";

function swalOk(msg) {
  return Swal.fire({ icon: "success", title: "Listo", text: msg, confirmButtonColor: teal });
}
function swalErr(msg) {
  return Swal.fire({ icon: "error", title: "Ups", text: msg, confirmButtonColor: teal });
}
function swalAsk(opts = {}) {
  return Swal.fire({
    icon: "question",
    title: opts.title || "¿Seguro?",
    text: opts.text || "",
    showCancelButton: true,
    confirmButtonText: opts.confirmText || "Sí",
    cancelButtonText: "Cancelar",
    confirmButtonColor: teal,
    cancelButtonColor: "#6c757d"
  });
}

function getModal(el) { return bootstrap.Modal.getOrCreateInstance(el); }

/* =================== Lógica de tiempo =================== */
function countdownStr(fecha, hora) {
  const dt = new Date(`${fecha}T${hora}:00`);
  const now = new Date();
  let diff = dt - now;
  const sign = diff >= 0 ? 1 : -1;
  diff = Math.abs(diff);
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const base = `${String(d).padStart(2, "0")}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return sign > 0 ? `Inicia en ${base}` : `Venció hace ${base}`;
}

/* =================== RBAC =================== */
async function initRBAC() {
  try {
    const me = await AuthStatus(); // { ok, status, data:{...} } o claims directos
    const claims = me?.data ?? me ?? {};
    const role = String(claims.role || "").toUpperCase();
    const committeeRole = String(claims.committeeRole || claims.committeRole || "").toUpperCase();
    const idMember = claims.idMember ?? claims.id_member ?? null;

    CURRENT_USER = { idMember, role, committeeRole };

    let canManage = false, canReport = false, canView = true;
    if (role === "ADMINISTRADOR") { canManage = true; canReport = true; }
    else if (role === "USUARIO") {
      if (["PRESIDENTE", "VICEPRESIDENTE", "SECRETARIO"].includes(committeeRole)) { canManage = true; canReport = true; }
      else if (committeeRole === "MIEMBRO") { canReport = true; }
    }
    RBAC = { canManage, canReport, canView };
  } catch {
    RBAC = { canView: true, canManage: false, canReport: false };
  }
}

/* =================== API: cargas =================== */
function normalizeType(t) {
  return { ID_TypeSimulacrum: t.id_type_simulacrum, Name_TypeSimulacrum: t.name_type_simulacrum };
}
function normalizeSim(dto) {
  return {
    ID_Simulacrum: dto.id_simulacrum,
    Name_Simulacrum: dto.name_simulacrum,
    IMG_Simulacrum: dto.img_simulacrum || "",
    DT_Simulacrum: dto.dt_simulacrum,
    Simulacrum_Time: dto.simulacrum_time,
    Description_Simulacrum: dto.description_simulacrum || "",
    Simulacrum_Status: dto.simulacrum_status,
    ID_TypeSimulacrum: dto.id_type_simulacrum,
    Type_Name: dto.type_name || ""
  };
}
async function loadTypes() {
  const list = await Simulacrum.GetTypesSimulacrum();
  TYPES = (Array.isArray(list) ? list : []).map(normalizeType);
}
async function loadSimulacros() {
  const list = await Simulacrum.GetAllSimulacrums();
  SIMULACROS = (Array.isArray(list) ? list : []).map(normalizeSim);
}

/* =================== Filtros y render =================== */
let currentStatus = "ALL";
let currentType = "ALL";
let currentQuery = "";
let currentView = "GRID"; // GRID | TIMELINE

function typeName(id) {
  const t = TYPES.find((x) => String(x.ID_TypeSimulacrum) === String(id));
  return t ? t.Name_TypeSimulacrum : "—";
}
function applyFilters(list) {
  return list.filter((s) => {
    const matchStatus = currentStatus === "ALL" ? true : s.Simulacrum_Status === currentStatus;
    const matchType = currentType === "ALL" ? true : String(s.ID_TypeSimulacrum) === String(currentType);
    const q = currentQuery.trim().toLowerCase();
    const matchQ = !q ? true :
      s.ID_Simulacrum.toLowerCase().includes(q) ||
      s.Name_Simulacrum.toLowerCase().includes(q) ||
      (s.Description_Simulacrum || "").toLowerCase().includes(q);
    return matchStatus && matchType && matchQ;
  });
}
function uiStatus(s) {
  try {
    const dt = new Date(`${s.DT_Simulacrum}T${s.Simulacrum_Time}:00`);
    if (s.Simulacrum_Status === "PENDIENTE" && dt < new Date()) return "VENCIDO";
    return s.Simulacrum_Status;
  } catch { return s.Simulacrum_Status; }
}

function render() {
  const data = applyFilters(SIMULACROS);
  const results = $("#results");
  const noRes = $("#noResults");
  results.innerHTML = "";
  noRes.classList.toggle("d-none", data.length > 0);

  if (currentView === "GRID") {
    results.className = "row g-4";
    data.forEach((s) => results.appendChild(cardSimulacro(s)));
  } else {
    results.className = "";
    results.appendChild(renderTimeline(data));
  }
}

function cardSimulacro(s) {
  const col = document.createElement("div");
  col.className = "col-12 col-sm-6 col-lg-4";

  const canEditDel = RBAC.canManage;
  const canCreateReport = RBAC.canReport && s.Simulacrum_Status === "PENDIENTE";
  const canViewReport = s.Simulacrum_Status === "COMPLETADO";

  col.innerHTML = `
    <div class="card-sim">
      <div class="card-sim-inner">
        <!-- FRONT -->
        <div class="card-face p-0">
          <div class="position-relative">
            <img class="card-img-top" src="${s.IMG_Simulacrum || "https://images.unsplash.com/photo-1520975922284-7b6832e7b1df?q=80&w=1200&auto=format&fit=crop"}" alt="">
            <div class="dropdown dot-menu">
              <button class="btn btn-light btn-sm rounded-circle" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><button class="dropdown-item ${canEditDel ? "" : "disabled"}" data-action="edit" data-id="${s.ID_Simulacrum}"><i class="bi bi-pencil-square me-2"></i>Editar</button></li>
                <li><button class="dropdown-item ${canEditDel ? "" : "disabled"}" data-action="delete" data-id="${s.ID_Simulacrum}"><i class="bi bi-trash3 me-2"></i>Eliminar</button></li>
                <li><hr class="dropdown-divider"></li>
                <li>
                  <button class="dropdown-item ${canViewReport ? "" : "disabled"}" data-action="view-report" data-id="${s.ID_Simulacrum}">
                    <i class="bi bi-file-earmark-text me-2"></i>Ver reporte
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div class="p-3 d-flex flex-column gap-2 flex-grow-1">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-0">${s.Name_Simulacrum}</h5>
              <span class="badge rounded-pill badge-state">${uiStatus(s)}</span>
            </div>
            <div class="kv"><i class="bi bi-building me-1"></i> ${typeName(s.ID_TypeSimulacrum)}</div>
            <div class="text-muted small">
              <i class="bi bi-calendar3 me-1"></i>${s.DT_Simulacrum}
              <span class="ms-3"><i class="bi bi-clock me-1"></i>${s.Simulacrum_Time}</span>
            </div>
            <div class="text-teal fw-semibold">${countdownStr(s.DT_Simulacrum, s.Simulacrum_Time)}</div>

            <div class="mt-auto pt-2">
              <button class="btn btn-outline-secondary btn-sm" data-action="flip">Detalles</button>
            </div>
          </div>
        </div>

        <!-- BACK -->
        <div class="card-face back p-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">#${s.ID_Simulacrum}</h6>
            <button class="btn btn-light btn-sm" data-action="flip"><i class="bi bi-arrow-left"></i></button>
          </div>
          <div class="small-muted mb-2">Instrucciones:</div>
          <div class="border rounded p-2 small" style="max-height:140px; overflow:auto;">${s.Description_Simulacrum || "—"}</div>

          <div class="mt-3">
            ${canCreateReport
      ? `<button class="btn btn-teal w-100" data-action="open-report" data-id="${s.ID_Simulacrum}">
                     <i class="bi bi-clipboard2-plus me-2"></i> Marcar completado (reporte)
                   </button>`
      : `<button class="btn btn-outline-secondary w-100" data-action="flip">Cerrar</button>`
    }
          </div>
        </div>
      </div>
    </div>
  `;

  const root = col.querySelector(".card-sim");
  col.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === "flip") {
      root.classList.toggle("flipped");
    } else if (action === "open-report") {
      openReporte(btn.dataset.id);
    } else if (action === "edit" && RBAC.canManage) {
      openProgramar(btn.dataset.id);
    } else if (action === "delete" && RBAC.canManage) {
      eliminar(btn.dataset.id);
    } else if (action === "view-report") {
      verReporte(btn.dataset.id);
    }
  });

  return col;
}

function renderTimeline(list) {
  const arr = [...list].sort((a, b) => {
    const da = new Date(`${a.DT_Simulacrum}T${a.Simulacrum_Time}:00`);
    const db = new Date(`${b.DT_Simulacrum}T${b.Simulacrum_Time}:00`);
    return da - db;
  });

  const wrap = document.createElement("div");
  wrap.className = "timeline";

  arr.forEach((s) => {
    const canEditDel = RBAC.canManage;
    const canCreateReport = RBAC.canReport && s.Simulacrum_Status === "PENDIENTE";
    const canViewReport = s.Simulacrum_Status === "COMPLETADO";

    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `
      <span class="bullet"></span>
      <div class="d-flex justify-content-between">
        <div>
          <div class="fw-semibold">${s.Name_Simulacrum} <span class="badge rounded-pill badge-state ms-1">${uiStatus(s)}</span></div>
          <div class="text-muted small">
            <i class="bi bi-calendar3 me-1"></i>${s.DT_Simulacrum}
            <span class="ms-3"><i class="bi bi-clock me-1"></i>${s.Simulacrum_Time}</span>
            <span class="ms-3">${typeName(s.ID_TypeSimulacrum)}</span>
          </div>
          <div class="small mt-1">${countdownStr(s.DT_Simulacrum, s.Simulacrum_Time)}</div>
        </div>
        <div class="d-flex align-items-start gap-2">
          <button class="btn btn-outline-secondary btn-sm" data-action="flip-timeline" data-id="${s.ID_Simulacrum}">Detalles</button>
          <div class="dropdown">
            <button class="btn btn-light btn-sm" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><button class="dropdown-item ${canEditDel ? "" : "disabled"}" data-action="edit" data-id="${s.ID_Simulacrum}">Editar</button></li>
              <li><button class="dropdown-item ${canEditDel ? "" : "disabled"}" data-action="delete" data-id="${s.ID_Simulacrum}">Eliminar</button></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item ${canViewReport ? "" : "disabled"}" data-action="view-report" data-id="${s.ID_Simulacrum}">Ver reporte</button></li>
            </ul>
          </div>
        </div>
      </div>
      <div id="tl-${s.ID_Simulacrum}" class="mt-2 d-none">
        <div class="small-muted mb-1">Instrucciones</div>
        <div class="border rounded p-2 small">${s.Description_Simulacrum || "—"}</div>
        ${canCreateReport ? `<button class="btn btn-teal btn-sm mt-2" data-action="open-report" data-id="${s.ID_Simulacrum}">Marcar completado (reporte)</button>` : ""}
      </div>
    `;
    item.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const a = btn.dataset.action;
      if (a === "flip-timeline") {
        document.getElementById(`tl-${btn.dataset.id}`).classList.toggle("d-none");
      } else if (a === "open-report") {
        openReporte(btn.dataset.id);
      } else if (a === "edit" && RBAC.canManage) {
        openProgramar(btn.dataset.id);
      } else if (a === "delete" && RBAC.canManage) {
        eliminar(btn.dataset.id);
      } else if (a === "view-report") {
        verReporte(btn.dataset.id);
      }
    });
    wrap.appendChild(item);
  });

  return wrap;
}

/* =================== Tipos: selects =================== */
function fillTypesSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = TYPES
    .map(t => `<option value="${t.ID_TypeSimulacrum}">${t.Name_TypeSimulacrum}</option>`)
    .join("");
}

/* =================== Programar / Editar =================== */
function generateId() {
  // siguiente correlativo compacto (reusa huecos)
  const nums = SIMULACROS
    .map(s => parseInt(String(s.ID_Simulacrum).replace(/\D/g, "")) || 0)
    .filter(n => n > 0)
    .sort((a, b) => a - b);

  let next = 1;
  for (const n of nums) {
    if (n === next) next++;
    else if (n > next) break;
  }
  return `SIML-${String(next).padStart(3, "0")}`;
}

function prefillCreateForm() {
  fillTypesSelect($("#simType"));
  $("#modalProgramarTitle").textContent = "Programar Simulacro";
  $("#programarBtnText").textContent = "Programar";
  $("#hiddenEditingId").value = "";
  $("#simId").value = generateId();
  $("#simName").value = "";
  $("#simType").value = TYPES[0]?.ID_TypeSimulacrum ?? "";
  $("#simDate").value = "";
  $("#simTime").value = "";
  $("#simDesc").value = "";
  $("#imgPreview").classList.add("d-none");
  $("#imgPlaceholder").classList.remove("d-none");
  $("#imgInput").value = "";
}

function openProgramar(id) {
  // Editar – se abre programáticamente
  fillTypesSelect($("#simType"));
  const s = SIMULACROS.find((x) => x.ID_Simulacrum === id);
  if (!s) return;

  $("#modalProgramarTitle").textContent = "Editar Simulacro";
  $("#programarBtnText").textContent = "Guardar cambios";
  $("#hiddenEditingId").value = s.ID_Simulacrum;
  $("#simId").value = s.ID_Simulacrum;
  $("#simName").value = s.Name_Simulacrum;
  $("#simType").value = s.ID_TypeSimulacrum;
  $("#simDate").value = s.DT_Simulacrum;
  $("#simTime").value = s.Simulacrum_Time;
  $("#simDesc").value = s.Description_Simulacrum || "";

  const hasImg = !!s.IMG_Simulacrum;
  $("#imgPreview").src = hasImg ? s.IMG_Simulacrum : "";
  $("#imgPreview").classList.toggle("d-none", !hasImg);
  $("#imgPlaceholder").classList.toggle("d-none", hasImg);
  $("#imgInput").value = "";

  getModal($("#modalProgramar")).show();
}

async function eliminar(id) {
  const ok = await swalAsk({ title: "Eliminar", text: `¿Eliminar ${id}?`, confirmText: "Eliminar" });
  if (!ok.isConfirmed) return;

  try {
    const res = await Simulacrum.DeleteSimulacrum(id);
    if (res && typeof res === "object" && "success" in res && !res.success) {
      throw new Error(res.message || "No se pudo eliminar.");
    }
    await swalOk("Simulacro eliminado");
    await reloadAll();
  } catch (e) {
    swalErr(e.message || "Error al eliminar");
  }
}

/* =================== Reporte =================== */
function openReporte(id) {
  const s = SIMULACROS.find((x) => x.ID_Simulacrum === id);
  if (!s) return;

  $("#repHiddenSimId").value = s.ID_Simulacrum;
  $("#repSimId").textContent = `#${s.ID_Simulacrum}`;
  $("#repDuration").value = "";
  $("#repAlert").checked = true;
  $("#repDef").checked = false;
  $("#repEval").value = "";
  $("#repObs").value = "";
  getModal($("#modalReporte")).show();
}

async function verReporte(idSim) {
  try {
    const answer = await Simulacrum.GetReportBySimulacrum(idSim);
    const rep = answer.data;
    $("#vrSimId").textContent = `#${idSim}`;
    $("#verReporteBody").innerHTML = `
      <div class="row g-3">
        <div class="col-md-4"><div class="small-muted">Duración</div><div class="fw-semibold">${rep.duration_simulacrum}</div></div>
        <div class="col-md-4"><div class="small-muted">¿Funcionó la alerta?</div><div class="fw-semibold">${rep.successful_alert}</div></div>
        <div class="col-md-4"><div class="small-muted">¿Hubo deficiencias?</div><div class="fw-semibold">${rep.deficiency}</div></div>
        <div class="col-12"><div class="small-muted">Participación</div><div>${rep.participation_evaluation}</div></div>
        <div class="col-12"><div class="small-muted">Observaciones</div><div>${rep.observation}</div></div>
      </div>
    `;
    getModal($("#modalVerReporte")).show();
  } catch (e) {
    swalErr("No hay reporte disponible.");
  }
}

/* =================== Validaciones =================== */
function isValidTimeHHmm(v) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}
function isTodayOrFuture(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return d >= today;
}
function parseDurationToSeconds(hhmmss) {
  const m = /^(\d{2}):(\d{2}):(\d{2})$/.exec(hhmmss?.trim() || "");
  if (!m) return null;
  const [_, hh, mm, ss] = m;
  const h = Number(hh), m2 = Number(mm), s = Number(ss);
  if (h > 23 || m2 > 59 || s > 59) return null;
  return h * 3600 + m2 * 60 + s;
}

/* =================== Filtros, búsqueda, vista =================== */
function initFilters() {
  $$("#statusTabs .nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$("#statusTabs .nav-link").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentStatus = btn.dataset.status;
      render();
    });
  });

  const filterType = $("#filterType");
  const paintFilterType = () => {
    filterType.innerHTML = `<option value="ALL">Tipo de Simulacro</option>` +
      TYPES.map((t) => `<option value="${t.ID_TypeSimulacrum}">${t.Name_TypeSimulacrum}</option>`).join("");
  };
  paintFilterType();
  filterType.addEventListener("change", () => { currentType = filterType.value; render(); });

  $("#searchBox").addEventListener("input", (e) => { currentQuery = e.target.value; render(); });

  $("#btnGrid").addEventListener("click", () => {
    currentView = "GRID";
    $("#btnGrid").classList.add("active");
    $("#btnTimeline").classList.remove("active");
    render();
  });
  $("#btnTimeline").addEventListener("click", () => {
    currentView = "TIMELINE";
    $("#btnTimeline").classList.add("active");
    $("#btnGrid").classList.remove("active");
    render();
  });

  // Al mostrar el modal de Programar desde el botón con data-bs-toggle,
  // solo prellenamos – NO volvemos a mostrar (para evitar backdrops duplicados).
  const programarEl = $("#modalProgramar");
  programarEl.addEventListener("show.bs.modal", () => {
    // Si NO se viene de editar, es crear:
    if (!$("#hiddenEditingId").value) prefillCreateForm();
  });
  // Limpieza defensiva del backdrop si quedara pegado
  programarEl.addEventListener("hidden.bs.modal", () => {
    document.body.classList.remove("modal-open");
    $$(".modal-backdrop").forEach(e => e.remove());
  });
}

function bindSimTimeMask(){
  const inp = $("#simTime");
  if (!inp) return;

  inp.addEventListener("input", (e) => {
    // algunos navegadores usan picker; si ya viene "HH:mm" lo dejamos
    if (/^\d{0,2}:?\d{0,2}$/.test(e.target.value)) {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 4); // HHmm
      let out = digits;
      if (digits.length >= 3) out = digits.slice(0,2) + ":" + digits.slice(2,4);
      e.target.value = out;
    }
  });

  inp.addEventListener("blur", () => {
    const [hhRaw="", mmRaw=""] = String(inp.value || "").split(":");
    if (hhRaw === "" && mmRaw === "") return; // vacío, se valida aparte

    let hh = Math.min(23, Math.max(0, parseInt(hhRaw || "0", 10) || 0));
    let mm = Math.min(59, Math.max(0, parseInt(mmRaw || "0", 10) || 0));
    inp.value = String(hh).padStart(2,"0") + ":" + String(mm).padStart(2,"0");
  });
}

// HH:mm:ss para #repDuration (auto-: y validación custom)
function bindDurationMask(){
  const inp = $("#repDuration");
  if (!inp) return;

  // evitamos pattern HTML para que no choque con navegadores
  inp.removeAttribute("pattern");
  inp.setAttribute("maxlength", "8");
  inp.setAttribute("inputmode", "numeric");

  inp.addEventListener("input", (e) => {
    let v = e.target.value.replace(/[^\d]/g, "").slice(0, 6); // HHmmss
    if (v.length >= 5) v = v.slice(0,2) + ":" + v.slice(2,4) + ":" + v.slice(4,6);
    else if (v.length >= 3) v = v.slice(0,2) + ":" + v.slice(2,4) + (v.length>4 ? ":"+v.slice(4,6) : "");
    e.target.value = v.slice(0,8);
    e.target.setCustomValidity("");
  });

  inp.addEventListener("blur", (e) => {
    const secs = parseDurationToSeconds(e.target.value);
    if (secs == null || secs < 40) {
      e.target.setCustomValidity("Formato HH:mm:ss (mínimo 00:00:40).");
    } else {
      e.target.setCustomValidity("");
    }
  });
}

/* =================== Inicio =================== */
document.addEventListener("DOMContentLoaded", async () => {
  // Vista previa imagen


  const imgInput = $("#imgInput");
  if (imgInput) {
    imgInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        $("#imgPreview").src = reader.result;
        $("#imgPreview").classList.remove("d-none");
        $("#imgPlaceholder").classList.add("d-none");
      };
      reader.readAsDataURL(file);
    });
  }

  bindSimTimeMask();
  bindDurationMask();

  try {
    await initRBAC();
    await loadTypes();
    initFilters();
    await loadSimulacros();
    render();
  } catch (e) {
    swalErr("Error al cargar datos iniciales");
  }


  // Submit Programar/Editar
  $("#formProgramar")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!RBAC.canManage) return;

    const editing = $("#hiddenEditingId").value;
    const isCreate = !editing;

    // Validaciones
    const name = $("#simName").value.trim();
    const type = $("#simType").value;
    const date = $("#simDate").value;
    const time = $("#simTime").value;

    if (!name) return swalErr("El nombre es obligatorio.");
    if (!type) return swalErr("Selecciona un tipo de simulacro.");
    if (!date) return swalErr("La fecha es obligatoria.");
    if (!time || !isValidTimeHHmm(time)) return swalErr("La hora debe ser HH:mm (00–23:00–59).");
    if (isCreate && !isTodayOrFuture(date)) return swalErr("La fecha debe ser hoy o una fecha futura.");

    try {
      // Subir imagen (opcional)
      let imgURL = "";
      const file = $("#imgInput")?.files?.[0] || null;
      if (file) {
        const up = await Simulacrum.UploadImage(file, { folder: "simulacros" });
        imgURL = up?.data ?? up ?? "";
      } else {
        const src = $("#imgPreview").getAttribute("src");
        imgURL = src && /^https?:\/\//i.test(src) ? src : "";
      }

      const idSim = isCreate ? generateId() : $("#simId").value;
      const payload = {
        id_simulacrum: idSim,
        name_simulacrum: name,
        img_simulacrum: imgURL || null,
        dt_simulacrum: date,
        simulacrum_time: time,
        description_simulacrum: $("#simDesc").value.trim() || null,
        id_type_simulacrum: Number(type)
      };

      if (isCreate) {
        payload.simulacrum_status = "PENDIENTE";
        const res = await Simulacrum.InsertSimulacrum(payload);
        if (res && res.success === false) throw new Error(res.message || "No se pudo crear");
        await swalOk("Simulacro creado");
      } else {
        const res = await Simulacrum.UpdateSimulacrum(editing, payload);
        if (res && res.success === false) throw new Error(res.message || "No se pudo actualizar");
        await swalOk("Simulacro actualizado");
      }

      getModal($("#modalProgramar")).hide();
      await reloadAll();
    } catch (err) {
      swalErr(err.message || "Error al guardar el simulacro");
    }
  });

  // Submit Reporte
  $("#formReporte")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!RBAC.canReport) return;

    try {
      const idSim = $("#repHiddenSimId").value;
      const dur = $("#repDuration").value;

      const secs = parseDurationToSeconds(dur);
      if (secs == null) return swalErr("La duración debe tener el formato HH:mm:ss.");
      if (secs < 40) return swalErr("La duración mínima es de 00:00:40.");

      const payload = {
        duration_simulacrum: dur,
        successful_alert: $("#repAlert").checked ? "TRUE" : "FALSE",
        deficiency: $("#repDef").checked ? "TRUE" : "FALSE",
        participation_evaluation: $("#repEval").value.trim(),
        observation: $("#repObs").value.trim(),
        id_member_reporter: CURRENT_USER.idMember,
        id_simulacrum: idSim
      };

      // Validar textos requeridos
      if (!payload.participation_evaluation) return swalErr("Describe la participación de los empleados.");
      if (!payload.observation) return swalErr("Ingresa observaciones del simulacro.");

      const res = await Simulacrum.InsertReportSimulacrum(payload);
      if (res && res.success === false) throw new Error(res.message || "No se pudo registrar el reporte");

      getModal($("#modalReporte")).hide();
      await swalOk("Reporte guardado. El simulacro quedó COMPLETADO.");
      await reloadAll();
    } catch (err) {
      swalErr(err.message || "Error al registrar reporte");
    }
  });

  // Refresco ligero de countdowns (cada 60s)
  setInterval(() => {
    if (currentView === "GRID" || currentView === "TIMELINE") render();
  }, 60000);
});

/* =================== Utilidades =================== */
async function reloadAll() {
  await loadSimulacros();
  render();
}
