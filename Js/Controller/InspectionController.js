import * as INSPECTION from "../Service/InspectionAssignService.js";
import { AuthStatus } from "../Service/AuthService.js";
import { getSmokeDetectorByLocation } from "../Service/SmokeDetectorService.js";
import { getExtinguishersByLocation } from "../Service/ExtinguisherService.js";
import { GetAllListMemberCommite } from "../Service/CommiteService.js";
import { getAllLocation } from "../Service/LocationService.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmtDate = d => d;
const today = () => new Date().toISOString().slice(0, 10);

const TB_Type_Implements = [
  { id: 1, name: "GENERAL" },
  { id: 2, name: "EXTINTOR" },
  { id: 3, name: "DETECTOR DE HUMO" }
];

// ==== NUEVO: helpers de fecha (validar hoy o futuro) ====
function onlyDate(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d); // medianoche local
}
function isTodayOrFuture(ymd) {
  const dSel = onlyDate(ymd);
  const dNow = onlyDate(today());
  if (!dSel || !dNow) return false;
  dSel.setHours(0, 0, 0, 0);
  dNow.setHours(0, 0, 0, 0);
  return dSel.getTime() >= dNow.getTime();
}

// ==== auth / permisos
let AUTH = { role: null, commiteRole: null, idMember: null };
let CAN_MANAGE = false;     // programar/editar/eliminar (Admin/Presidente/Vice/Secretario)
let IS_INSPECTOR = false;   // Usuario-Inspector
let CAN_DO_DETAILS = false; // sólo inspector puede “realizar/editar” detalles

// ==== datos dinámicos
let DB_Inspections = [];
let DB_Pager = { totalPages: 1, totalElements: 0, number: 0, size: 10 };
let DB_Locations = [];
let DB_Inspectores = [];

// caches
const TiposCache = new Map();        // idInspection -> "EXTINTOR - DETECTOR - GENERAL"
const AnyCompletedCache = new Map(); // idInspection -> boolean
const ExtByLocCache = new Map();     // locId -> [{code}]
const DetByLocCache = new Map();     // locId -> [{code}]

/* =========================================================
   Estado de filtros / paginación
   ========================================================= */
const state = {
  tab: "ALL",   // ALL | PENDIENTE | COMPLETADO
  tipo: "",     // filtro local por tipo
  q: "",
  page: 0,
  size: 10
};

/* =========================================================
   UI utils
   ========================================================= */
function stateBadge(st) {
  return st === "COMPLETADO"
    ? '<span class="badge-soft verified">COMPLETADO</span>'
    : '<span class="badge-soft pending">PENDIENTE</span>';
}

function nextInspectionId() {
  const nums = DB_Inspections
    .map(i => Number(String((i.ID_Inspection ?? i.id ?? "")).split("-")[1]))
    .filter(n => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `INSP-${String(max + 1).padStart(3, "0")}`;
}

function locationNameById(id) {
  return DB_Locations.find(x => x.id_location === id)?.name_location || id || "";
}

function inspectorNitById(id) {
  return DB_Inspectores.find(x => x.id_member === id)?.nit || "";
}

/* =========================================================
   CHART
   ========================================================= */
const AQUA_PALETTE = [
  "#1abc9c", "#16a085", "#20c997", "#0fb9b1", "#2ecc71",
  "#27ae60", "#26de81", "#10b981", "#34d399", "#14b8a6"
];
let chart, _resizeTO = null;

function getChartHeight() {
  return Math.max(180, Math.min(320, Math.round(window.innerHeight * 0.28)));
}

async function buildChart() {
  const canvas = document.getElementById("chartCategorias");
  if (!canvas) return;

  let counts = { "GENERAL": 0, "EXTINTOR": 0, "DETECTOR DE HUMO": 0 };
  try {
    const data = await INSPECTION.GetCountsByCategory();
    if (data && typeof data === "object") counts = { ...counts, ...data };
  } catch (e) {
    console.error("CountsByCategory error:", e);
  }

  const cats = ["GENERAL", "EXTINTOR", "DETECTOR DE HUMO"];
  const values = cats.map(k => counts[k] || 0);

  canvas.height = getChartHeight();
  const ctx = canvas.getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: cats,
      datasets: [{
        label: "Inspecciones",
        data: values,
        backgroundColor: values.map((_, i) => AQUA_PALETTE[i % AQUA_PALETTE.length]),
        borderWidth: 0,
        borderRadius: 10,
        maxBarThickness: 56,
        categoryPercentage: 0.68,
        barPercentage: 0.85
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => items?.[0]?.label ?? "",
            label: item => ` ${item.parsed.y} asignación(es)`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#334155", font: { size: 12 } } },
        y: { beginAtZero: true, grace: "10%", ticks: { stepSize: 1, color: "#64748b", font: { size: 12 } }, grid: { color: "rgba(0,0,0,.06)" } }
      },
      animation: { duration: 600 }
    }
  });
}

window.addEventListener("resize", () => {
  clearTimeout(_resizeTO);
  _resizeTO = setTimeout(() => { if (chart) chart.resize(); }, 140);
});

/* =========================================================
   Catálogos
   ========================================================= */
async function loadUbicaciones() {
  const sel = $("#selUbicacion");
  sel.innerHTML = '<option value="">Selecciona una Ubicación</option>';
  try {
    const json = await getAllLocation();
    const list = json?.data ?? json ?? [];
    DB_Locations = Array.isArray(list) ? list : [];
    sel.innerHTML += DB_Locations.map(u => `<option value="${u.id_location}">${u.name_location}</option>`).join("");
    sel.onchange = () => { asignCtx.ubicacion = sel.value; };
  } catch (e) {
    console.error("getAllLocation error:", e);
  }
}

async function loadInspectores() {
  const grid = $("#gridInspectores"); grid.innerHTML = "";
  try {
    const res = await GetAllListMemberCommite();
    const list = (res?.data ?? res ?? []).filter(x => x.position === "Inspector" && x.status === "Activo");
    DB_Inspectores = list.map(x => ({ id_member: x.id_member, nit: x.nit, name: x.full_name }));

    DB_Inspectores.forEach(p => {
      const card = document.createElement("div");
      card.className = "col-6 col-sm-4 col-md-3 col-lg-2";
      card.innerHTML = `
        <div class="card-inspector" data-id="${p.id_member}">
          <div class="icon"><i class="bi bi-person-badge"></i></div>
          <div class="small text-muted">${p.nit || "-"}</div>
          <div class="fw-semibold">${p.name}</div>
        </div>`;
      const el = $(".card-inspector", card);
      el.onclick = () => {
        if (!CAN_MANAGE) return;
        $$(".card-inspector").forEach(x => x.classList.remove("active"));
        el.classList.add("active");
        asignCtx.inspector = p.id_member;
      };
      grid.appendChild(card);
    });
  } catch (e) {
    console.error("GetAllListMemberCommite error:", e);
  }
}

/* =========================================================
   Tabla + paginación
   ========================================================= */
async function fetchPage() {
  try {
    let pg;

    if (IS_INSPECTOR) {
      const pageObj = await INSPECTION.GetInspectionsPageByMember({
        memberId: AUTH.idMember,
        state: state.tab || "ALL",
        q: state.q || "",
        page: state.page,
        size: state.size
      });
      pg = pageObj?.data ?? pageObj;
    } else {
      const pageObj = await INSPECTION.GetInspectionsPage({
        status: state.tab || "ALL",
        q: state.q || "",
        page: state.page,
        size: state.size
      });
      pg = pageObj?.data ?? pageObj;
    }

    DB_Inspections = Array.isArray(pg?.content) ? pg.content : [];
    DB_Pager = {
      totalPages: pg?.totalPages ?? 1,
      totalElements: pg?.totalElements ?? DB_Inspections.length,
      number: pg?.number ?? state.page,
      size: pg?.size ?? state.size
    };

    if (IS_INSPECTOR) {
      DB_Inspections = DB_Inspections.filter(r =>
        String(r.ID_Member ?? r.memberId ?? r.id_member) === String(AUTH.idMember)
      );
      DB_Pager.totalElements = DB_Inspections.length;
      DB_Pager.totalPages = 1;
      DB_Pager.number = 0;
    }

    await hydrateTiposAndCompleted(DB_Inspections);
  } catch (e) {
    console.error("fetchPage error:", e);
    throw e;
  }
}

async function hydrateTiposAndCompleted(rows) {
  const pending = rows
    .filter(r => !TiposCache.has(r.ID_Inspection || r.id))
    .map(async r => {
      const id = r.ID_Inspection || r.id;
      try {
        const arr = await INSPECTION.GetAssignmentsByInspection(id);
        const list = arr?.data ?? arr ?? [];
        const tiposSet = new Set(list.map(a => {
          if (a.ID_TypeImplement === 1) return "GENERAL";
          if (a.ID_TypeImplement === 2) return "EXTINTOR";
          if (a.ID_TypeImplement === 3) return "DETECTOR DE HUMO";
          return "";
        }).filter(Boolean));
        TiposCache.set(id, [...tiposSet].join(" - "));
        AnyCompletedCache.set(id, list.some(a => a.State_Assign === "COMPLETADO"));
      } catch (e) {
        console.warn("Assignments fetch fail for", id, e);
        TiposCache.set(id, "");
        AnyCompletedCache.set(id, false);
      }
    });
  await Promise.allSettled(pending);
}

function renderPager() {
  const ul = $("#pager"); ul.innerHTML = "";
  const pages = Math.max(1, DB_Pager.totalPages);
  const cur = Math.min(DB_Pager.number, pages - 1);

  const mk = (label, i, disabled = false, active = false) => {
    const li = document.createElement("li");
    li.className = `page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${label}</a>`;
    li.onclick = e => { e.preventDefault(); if (!disabled) { state.page = i; loadAndRenderTable(); } };
    ul.appendChild(li);
  };

  mk("«", 0, cur === 0);
  mk("‹", Math.max(0, cur - 1), cur === 0);
  for (let i = 0; i < pages; i++) mk(i + 1, i, false, i === cur);
  mk("›", Math.min(pages - 1, cur + 1), cur === pages - 1);
  mk("»", pages - 1, cur === pages - 1);
}

function renderTable() {
  const filtered = state.tipo
    ? DB_Inspections.filter(r => (TiposCache.get(r.ID_Inspection || r.id) || "").includes(state.tipo))
    : DB_Inspections;

  const tb = $("#tbodyInspecciones"); tb.innerHTML = "";
  filtered.forEach(r => {
    const id   = r.ID_Inspection || r.id;
    const tipos = TiposCache.get(id) || r.Type_Names || r.tipos || "-";
    const date = r.Date_Inspection || r.date || r.Date || "";
    const st   = r.State_Inspection || r.state || "PENDIENTE";
    const loc  = r.Location_Name || locationNameById(r.ID_Location || r.locationId);
    const nit  = r.NIT_Encargado || inspectorNitById(r.ID_Member ?? r.memberId);

    const anyCompleted     = AnyCompletedCache.get(id) || false;
    const allowEditDelete  = CAN_MANAGE && !anyCompleted;
    const showRunInspector = IS_INSPECTOR;
    const showEyeAdmin     = CAN_MANAGE && anyCompleted;

    let acciones = '';
    if (showRunInspector) acciones += `<i class="bi bi-play-btn-fill text-success me-1" title="Realizar"></i>`;
    if (showEyeAdmin)     acciones += `<i class="bi bi-eye text-primary me-1" title="Ver detalles"></i>`;
    acciones += `
      <i class="bi bi-pencil-square me-1 ${allowEditDelete ? '' : 'text-muted disabled'}" title="Editar"></i>
      <i class="bi bi-trash3 ${allowEditDelete ? 'text-danger' : 'text-muted disabled'}" title="Eliminar"></i>
    `;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${id}</td>
      <td class="fw-semibold">${tipos}</td>
      <td>${fmtDate(date)}</td>
      <td>${nit || "-"}</td>
      <td>${stateBadge(st)}</td>
      <td>${loc || "-"}</td>
      <td class="text-center table-actions">${acciones}</td>
    `;

    const icons = row.querySelectorAll("i");
    let idx = 0;
    if (showRunInspector) {
      icons[idx++].onclick = () => abrirRealizar(id, false);
    }
    if (showEyeAdmin) {
      icons[idx++].onclick = () => abrirRealizar(id, true);
    }
    if (icons[idx] && allowEditDelete) icons[idx].onclick = () => abrirAsignar(id);
    idx++;
    if (icons[idx] && allowEditDelete) icons[idx].onclick = async () => { await eliminarInspeccion(id); };

    tb.appendChild(row);
  });

  renderPager();
}

async function loadAndRenderTable() {
  try {
    $("#tbodyInspecciones").innerHTML = `<tr><td colspan="7" class="text-center py-4">Cargando...</td></tr>`;
    await fetchPage();
    renderTable();
  } catch (e) {
    $("#tbodyInspecciones").innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error al cargar</td></tr>`;
  }
}

/* =========================================================
   Asignar / Programar inspección
   ========================================================= */
const mdAsignar = new bootstrap.Modal("#modalAsignar");
const mdSelector = new bootstrap.Modal("#modalSelector");
const mdRealizar = new bootstrap.Modal("#modalRealizar");
const mdDetalle  = new bootstrap.Modal("#modalDetalle");

let asignCtx = {
  editId: null,
  inspector: null,
  ubicacion: "",
  tipoGeneral: false,
  ExtintoresEnProgreso: [],
  DetectoresEnProgreso: [],
  selectorTipo: 2
};

function resetAsignCtx() {
  asignCtx = {
    editId: null,
    inspector: null,
    ubicacion: "",
    tipoGeneral: false,
    ExtintoresEnProgreso: [],
    DetectoresEnProgreso: [],
    selectorTipo: 2
  };
}

function loadTiposCards() {
  const wrap = $("#cardsTipos");
  wrap.innerHTML = `
    <div class="col-12 col-sm-6 col-lg-4 d-flex justify-content-center">
      <div class="card-tipo ext ${asignCtx.ExtintoresEnProgreso.length?'active':''}" id="cardExt">
        <div class="icon"><i class="bi bi-fire-extinguisher"></i></div>
        <div class="fw-bold">EXTINTORES</div>
        <div class="small text-muted">Selecciona implementos</div>
      </div>
    </div>
    <div class="col-12 col-sm-6 col-lg-4 d-flex justify-content-center">
      <div class="card-tipo detector ${asignCtx.DetectoresEnProgreso.length?'active':''}" id="cardDet">
        <div class="icon"><i class="bi bi-alarm"></i></div>
        <div class="fw-bold">DETECTORES DE HUMO</div>
        <div class="small text-muted">Selecciona implementos</div>
      </div>
    </div>
    <div class="col-12 col-sm-6 col-lg-4 d-flex justify-content-center">
      <div class="card-tipo general ${asignCtx.tipoGeneral?'active':''}" id="cardGen">
        <div class="icon"><i class="bi bi-building"></i></div>
        <div class="fw-bold">GENERAL</div>
        <div class="small text-muted">Inspección del área</div>
      </div>
    </div>
  `;

  $("#cardExt").onclick = () => CAN_MANAGE && abrirSelector(2);
  $("#cardDet").onclick = () => CAN_MANAGE && abrirSelector(3);
  $("#cardGen").onclick = () => {
    if (!CAN_MANAGE) return;
    asignCtx.tipoGeneral = !asignCtx.tipoGeneral;
    $("#cardGen").classList.toggle("active", asignCtx.tipoGeneral);
  };
}

async function renderSelectorList(tipo, ubic) {
  const list = $("#selectorList"); list.innerHTML = "";
  let src = [];

  if (tipo === 2) {
    if (!ExtByLocCache.has(ubic)) {
      const resp = await getExtinguishersByLocation(ubic);
      ExtByLocCache.set(ubic, (resp?.data ?? resp ?? []).map(x => ({ code: x.id_extinguisher, id_location: x.id_location })));
    }
    src = ExtByLocCache.get(ubic);
  } else {
    if (!DetByLocCache.has(ubic)) {
      const resp = await getSmokeDetectorByLocation(ubic);
      DetByLocCache.set(ubic, (resp?.data ?? resp ?? []).map(x => ({ code: x.id_smoke_detector, id_location: x.id_location })));
    }
    src = DetByLocCache.get(ubic);
  }

  src.forEach(it => {
    const code = it.code;
    const selected = (tipo === 2)
      ? asignCtx.ExtintoresEnProgreso.includes(code)
      : asignCtx.DetectoresEnProgreso.includes(code);

    const div = document.createElement("div");
    div.className = `selector-item ${selected ? 'active' : ''}`;
    div.dataset.code = code;
    div.innerHTML = `
      <span class="code">${code}</span>
      <i class="bi ${selected ? 'bi-check-circle-fill text-success' : 'bi-plus-circle'}"></i>
    `;
    div.onclick = () => {
      const arr = (tipo === 2) ? asignCtx.ExtintoresEnProgreso : asignCtx.DetectoresEnProgreso;
      const i = arr.indexOf(code);
      if (i >= 0) arr.splice(i, 1); else arr.push(code);
      renderSelectorList(tipo, ubic);
    };
    list.appendChild(div);
  });

  $("#selectorSearch").oninput = (e) => {
    const q = e.target.value.toLowerCase();
    $$("#selectorList .selector-item").forEach(el => {
      el.classList.toggle("d-none", !el.dataset.code.toLowerCase().includes(q));
    });
  };
}

async function abrirSelector(tipo) {
  const ubic = $("#selUbicacion").value;
  if (!ubic) {
    Swal.fire({ icon: "warning", title: "Selecciona una ubicación primero" });
    return;
  }
  asignCtx.selectorTipo = tipo;
  $("#selectorTitle").textContent = (tipo === 2 ? "EXTINTORES - " : "DETECTORES - ") + (locationNameById(ubic));
  $("#selectorSearch").value = "";
  await renderSelectorList(tipo, ubic);
  mdSelector.show();
}
$("#btnSelectorOk").onclick = () => {
  $("#cardExt").classList.toggle("active", asignCtx.ExtintoresEnProgreso.length > 0);
  $("#cardDet").classList.toggle("active", asignCtx.DetectoresEnProgreso.length > 0);
  mdSelector.hide();
};

async function abrirAsignar(idInspection = null) {
  if (!CAN_MANAGE) return;

  resetAsignCtx();

  await loadInspectores();
  await loadUbicaciones();
  loadTiposCards();

  $("#inpCodigo").value = idInspection ? String(idInspection) : nextInspectionId();
  $("#inpFecha").value  = today();

  // ===== NUEVO: bloquear fechas pasadas en el input =====
  $("#inpFecha").setAttribute("min", today());

  if (idInspection) {
    try {
      const resp = await INSPECTION.GetInspectionById(idInspection);
      const it   = resp?.data ?? resp;
      if (!it) return;

      asignCtx.editId = idInspection;

      $("#inpCodigo").value    = (it.ID_Inspection ?? it.id ?? "") || String(idInspection);
      $("#inpFecha").value     = (it.Date_Inspection ?? it.date ?? "") || today();
      $("#selUbicacion").value = (it.ID_Location ?? it.locationId ?? "") || "";
      asignCtx.ubicacion       = $("#selUbicacion").value;

      // Reafirmar min por si vino muy rápido el valor
      $("#inpFecha").setAttribute("min", today());

      asignCtx.inspector = it.ID_Member ?? it.memberId ?? null;
      $$(".card-inspector").forEach(c => {
        if (Number(c.dataset.id) === Number(asignCtx.inspector)) c.classList.add("active");
      });

      const assigns = it.assignments ?? await INSPECTION.GetAssignmentsByInspection(idInspection);
      const list    = assigns?.data ?? assigns ?? [];

      asignCtx.ExtintoresEnProgreso = list.filter(a => a.ID_TypeImplement === 2).map(a => a.ID_Implement);
      asignCtx.DetectoresEnProgreso = list.filter(a => a.ID_TypeImplement === 3).map(a => a.ID_Implement);
      asignCtx.tipoGeneral          = list.some(a => a.ID_TypeImplement === 1);

      $("#cardExt").classList.toggle("active", asignCtx.ExtintoresEnProgreso.length > 0);
      $("#cardDet").classList.toggle("active", asignCtx.DetectoresEnProgreso.length > 0);
      $("#cardGen").classList.toggle("active", asignCtx.tipoGeneral);
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "No se pudo cargar la inspección" });
      return;
    }
  }

  mdAsignar.show();
}

async function programarAsignacion() {
  if (!CAN_MANAGE) return;

  const codigo    = $("#inpCodigo").value;
  const fecha     = $("#inpFecha").value;
  const ubic      = $("#selUbicacion").value;
  const inspector = asignCtx.inspector;

  // ===== NUEVO: validación dura de fecha (hoy o futura) =====
  if (!isTodayOrFuture(fecha)) {
    Swal.fire({ icon: "warning", title: "Fecha inválida", text: "La fecha debe ser hoy o una fecha futura." });
    return;
  }

  if (!inspector) { Swal.fire({ icon: "warning", title: "Selecciona un inspector" }); return; }
  if (!ubic)      { Swal.fire({ icon: "warning", title: "Selecciona una ubicación" }); return; }
  const haySeleccion = asignCtx.tipoGeneral || asignCtx.ExtintoresEnProgreso.length || asignCtx.DetectoresEnProgreso.length;
  if (!haySeleccion) { Swal.fire({ icon: "warning", title: "Selecciona al menos un tipo de inspección" }); return; }

  const insp = {
    ID_Inspection: codigo,
    Date_Inspection: fecha,
    ID_Member: inspector,
    ID_Location: ubic,
    State_Inspection: "PENDIENTE"
  };

  const assigns = [];
  if (asignCtx.tipoGeneral) {
    assigns.push({ ID_Inspection: codigo, ID_Implement: ubic, ID_TypeImplement: 1, State_Assign: "PENDIENTE" });
  }
  asignCtx.ExtintoresEnProgreso.forEach(code => {
    assigns.push({ ID_Inspection: codigo, ID_Implement: code, ID_TypeImplement: 2, State_Assign: "PENDIENTE" });
  });
  asignCtx.DetectoresEnProgreso.forEach(code => {
    assigns.push({ ID_Inspection: codigo, ID_Implement: code, ID_TypeImplement: 3, State_Assign: "PENDIENTE" });
  });

  const payload = { inspection: insp, assignments: assigns };

  try {
    if (!asignCtx.editId) {
      await INSPECTION.CreateAssignInspection(payload);
      Swal.fire({ icon: "success", title: "Inspección programada" });
    } else {
      await INSPECTION.UpdateAssignInspection(codigo, payload);
      Swal.fire({ icon: "success", title: "Inspección actualizada" });
    }
    mdAsignar.hide();
    TiposCache.delete(codigo);
    AnyCompletedCache.delete(codigo);
    await buildChart();
    await loadAndRenderTable();
  } catch (e) {
    console.error(e);
    Swal.fire({ icon: "error", title: "No se pudo guardar la inspección", text: e.message || "" });
  }
}
$("#btnProgramar").onclick = programarAsignacion;
$("#btnAsignar").onclick = () => CAN_MANAGE && abrirAsignar();

/* =========================================================
   Eliminar Inspección
   ========================================================= */
async function eliminarInspeccion(id) {
  if (!CAN_MANAGE) return;
  const res = await Swal.fire({ icon: "question", title: "¿Eliminar inspección?", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#d33" });
  if (!res.isConfirmed) return;
  try {
    await INSPECTION.DeleteInspection(id);
    Swal.fire({ icon: "success", title: "Eliminado" });
    TiposCache.delete(id);
    AnyCompletedCache.delete(id);
    await buildChart();
    await loadAndRenderTable();
  } catch (e) {
    console.error(e);
    Swal.fire({ icon: "error", title: "No se pudo eliminar", text: e.message || "" });
  }
}

/* =========================================================
   Realizar / Ver Detalles
   ========================================================= */
async function abrirRealizar(idInspection, readOnly = false) {
  try {
    const get = await INSPECTION.GetInspectionById(idInspection);
    const insp = get?.data ?? get;
    if (!insp) return;

    $("#realizarTitle").textContent   = `REALIZAR INSPECCIONES - ${idInspection}`;
    $("#realizarUbicacion").textContent = `UBICACIÓN - ${insp.Location_Name}`;

    const assignsResp = insp.assignments ?? (await INSPECTION.GetAssignmentsByInspection(idInspection));
    const list = (assignsResp?.data ?? assignsResp ?? []);

    const ext = list.filter(a => a.ID_TypeImplement === 2);
    const det = list.filter(a => a.ID_TypeImplement === 3);
    const gen = list.filter(a => a.ID_TypeImplement === 1);

    $("#secExtintores").classList.toggle("d-none", ext.length === 0);
    $("#secDetectores").classList.toggle("d-none", det.length === 0);
    $("#secGeneral").classList.toggle("d-none", gen.length === 0);

    const mkCard = (a, cont) => {
      const c = document.createElement("div");
      c.className = "col-12 col-sm-6 col-lg-4";
      const done = a.State_Assign === "COMPLETADO";
      const canRun = CAN_DO_DETAILS && !readOnly;
      const adminViewAllowed = readOnly && done;
      const enabled = canRun || adminViewAllowed;

      c.innerHTML = `
        <div class="p-3 border rounded-3 h-100">
          <div class="small text-muted">Cod-Impl: ${a.ID_Implement}</div>
          <div class="small">Estado: ${stateBadge(a.State_Assign)}</div>
          <div class="mt-2 d-flex gap-2">
            <button class="btn btn-sm ${enabled ? (canRun ? (done ? 'btn-outline-primary' : 'btn-teal') : 'btn-outline-secondary') : 'btn-outline-secondary disabled'} flex-grow-1">
              ${canRun ? (done ? 'Ver/editar' : 'Empezar') : 'Ver detalle'}
            </button>
          </div>
        </div>`;
      const [btnRun] = c.querySelectorAll("button");
      if (enabled) btnRun.onclick = () => abrirDetalle(a, !canRun);
      cont.appendChild(c);
    };

    const contExt = $("#cardsExtintores"); contExt.innerHTML = "";
    ext.forEach(a => mkCard(a, contExt));
    const contDet = $("#cardsDetectores"); contDet.innerHTML = "";
    det.forEach(a => mkCard(a, contDet));
    const contGen = $("#cardsGenerales"); contGen.innerHTML = "";
    gen.forEach(a => mkCard(a, contGen));

    mdRealizar.show();
  } catch (e) {
    console.error(e);
    Swal.fire({ icon: "error", title: "No se pudo abrir la inspección" });
  }
}

let detalleCtx = { assign: null, tipo: 0, readOnly: false };

function abrirDetalle(assign, readOnly = false) {
  detalleCtx = { assign, tipo: assign.ID_TypeImplement, readOnly };

  const title =
    (assign.ID_TypeImplement === 2) ? `Extintor - ${assign.ID_Implement}` :
    (assign.ID_TypeImplement === 3) ? `Detector - ${assign.ID_Implement}` :
    `General - ${locationNameById(assign.ID_Implement)}`;
  $("#detalleTitle").textContent = title;

  let html = "";
  if (assign.ID_TypeImplement === 2) {
    html = `
      <div class="row g-3">
        <div class="col-md-4"><label class="form-label">En Operación</label><select id="ex_inop" class="form-select"><option value="TRUE">Sí</option><option value="FALSE">No</option></select></div>
        <div class="col-md-4"><label class="form-label">Manómetro</label><select id="ex_gauge" class="form-select"><option>OK</option><option>BAJA</option><option>ALTA</option></select></div>
        <div class="col-md-4"><label class="form-label">Sello de Seguridad</label><select id="ex_seal" class="form-select"><option value="TRUE">Sí</option><option value="FALSE">No</option></select></div>
        <div class="col-md-4"><label class="form-label">Manguera</label><select id="ex_hose" class="form-select"><option>OK</option><option>DAÑADA</option><option>AUSENTE</option></select></div>
        <div class="col-md-4"><label class="form-label">Accesible/Visible</label><select id="ex_acc" class="form-select"><option value="TRUE">Sí</option><option value="FALSE">No</option></select></div>
        <div class="col-12"><label class="form-label">Observación</label><textarea id="ex_obs" class="form-control" rows="3"></textarea></div>
      </div>`;
  } else if (assign.ID_TypeImplement === 3) {
    html = `
      <div class="row g-3">
        <div class="col-md-4"><label class="form-label">En Operación</label><select id="dt_inop" class="form-select"><option value="TRUE">Sí</option><option value="FALSE">No</option></select></div>
        <div class="col-md-4"><label class="form-label">Batería</label><select id="dt_bat" class="form-select"><option>OK</option><option>BAJA</option><option>REEMPLAZAR</option></select></div>
        <div class="col-md-4"><label class="form-label">LED</label><select id="dt_led" class="form-select"><option>OK</option><option>APAGADO</option></select></div>
        <div class="col-md-4"><label class="form-label">Material Dañado</label><select id="dt_dmg" class="form-select"><option value="FALSE">No</option><option value="TRUE">Sí</option></select></div>
        <div class="col-md-4"><label class="form-label">Prueba Funcional</label><input id="dt_func" type="date" class="form-control" /></div>
        <div class="col-md-4"><label class="form-label">Limpio</label><select id="dt_clean" class="form-select"><option value="TRUE">Sí</option><option value="FALSE">No</option></select></div>
        <div class="col-md-4"><label class="form-label">Ubicación Correcta</label><select id="dt_loc" class="form-select"><option value="TRUE">Sí</option><option value="FALSE">No</option></select></div>
        <div class="col-md-4"><label class="form-label">Fecha de Vencimiento</label><input id="dt_exp" type="date" class="form-control" /></div>
        <div class="col-12"><label class="form-label">Observación</label><textarea id="dt_obs" class="form-control" rows="3"></textarea></div>
      </div>`;
  } else {
    html = `
      <div class="row g-3">
        ${[
          ["Visible_Signage", "Señalización visible"],
          ["Correct_Routes", "Rutas correctas"],
          ["Free_EmergencyExits", "Salidas de emergencia libres"],
          ["Cleanfacilities", "Instalaciones limpias"],
          ["Lighting_Adequate", "Iluminación adecuada"],
          ["Electrical_Hazards", "Sin peligros eléctricos"],
          ["Floor_Condition", "Piso en buen estado"],
          ["Proper_Storage", "Almacenamiento correcto"],
          ["Emergency_Equipment_Accessible", "Eq. emergencia accesible"]
        ].map(([id, label]) => `
          <div class="col-md-6">
            <label class="form-label">${label}</label>
            <select id="g_${id}" class="form-select"><option value="TRUE">Sí</option><option value="FALSE">No</option></select>
          </div>`).join("")}
        <div class="col-12"><label class="form-label">Observación</label><textarea id="g_Observation" class="form-control" rows="3"></textarea></div>
      </div>`;
  }

  $("#detalleBody").innerHTML = html;

  if (readOnly) {
    $$("#detalleBody select, #detalleBody input, #detalleBody textarea").forEach(el => el.disabled = true);
    $("#btnGuardarDetalle").classList.add("d-none");
  } else {
    $("#btnGuardarDetalle").classList.remove("d-none");
    $("#btnGuardarDetalle").onclick = guardarDetalle;
  }

  mdDetalle.show();
}

async function guardarDetalle() {
  const { assign, tipo } = detalleCtx;
  try {
    if (tipo === 2) {
      const data = {
        ID_Assing: assign.ID_Assing,
        Extinguisher_InOperation: $("#ex_inop").value,
        Gauge_Status: $("#ex_gauge").value,
        Safety_Seal: $("#ex_seal").value,
        Hose_Condition: $("#ex_hose").value,
        Accessible_Visible: $("#ex_acc").value,
        Observation: $("#ex_obs").value
      };
      await INSPECTION.CompleteDetailExtinguisher(data);
    } else if (tipo === 3) {
      const data = {
        ID_Assing: assign.ID_Assing,
        Detector_InOperation: $("#dt_inop").value,
        Battery_Status: $("#dt_bat").value,
        LED_Indicator: $("#dt_led").value,
        Damaged_Marterial: $("#dt_dmg").value,
        Functional_Test_Date: $("#dt_func").value,
        Is_Clean: $("#dt_clean").value,
        Correct_Location: $("#dt_loc").value,
        Expiration_Date: $("#dt_exp").value || null,
        Observation: $("#dt_obs").value
      };
      await INSPECTION.CompleteDetailDetector(data);
    } else {
      const data = {
        ID_Assing: assign.ID_Assing,
        Visible_Signage: $("#g_Visible_Signage").value,
        Correct_Routes: $("#g_Correct_Routes").value,
        Free_EmergencyExits: $("#g_Free_EmergencyExits").value,
        Cleanfacilities: $("#g_Cleanfacilities").value,
        Lighting_Adequate: $("#g_Lighting_Adequate").value,
        Electrical_Hazards: $("#g_Electrical_Hazards").value,
        Floor_Condition: $("#g_Floor_Condition").value,
        Proper_Storage: $("#g_Proper_Storage").value,
        Emergency_Equipment_Accessible: $("#g_Emergency_Equipment_Accessible").value,
        Observation: $("#g_Observation").value
      };
      await INSPECTION.CompleteDetailLocation(data);
    }

    mdDetalle.hide();
    mdRealizar.hide();
    Swal.fire({ icon: "success", title: "Detalle guardado" });

    AnyCompletedCache.delete(assign.ID_Inspection);
    await buildChart();
    await loadAndRenderTable();
  } catch (e) {
    console.error(e);
    Swal.fire({ icon: "error", title: "No se pudo guardar el detalle", text: e.message || "" });
  }
}

/* =========================================================
   Filtros
   ========================================================= */
function initFilters() {
  $$(".pill-tabs .btn").forEach(b => {
    b.onclick = () => {
      $$(".pill-tabs .btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      state.tab = b.dataset.state || "ALL";
      state.page = 0;
      loadAndRenderTable();
    };
  });

  const sel = $("#filtroTipo");
  sel.innerHTML = `<option value="">Tipo de Inspección</option>` +
    TB_Type_Implements.map(t => `<option value="${t.name}">${t.name}</option>`).join("");
  sel.onchange = () => { state.tipo = sel.value; renderTable(); };

  $("#filtroTexto").oninput = (e) => {
    state.q = e.target.value;
    state.page = 0;
    loadAndRenderTable();
  };
}

/* =========================================================
   INIT con Auth y permisos
   ========================================================= */
async function initAuthAndPerms() {
  try {
    const a = await AuthStatus();
    const data = a?.data ?? a ?? {};

    AUTH.role       = data.role ?? data.Role ?? data.userRole ?? null;
    AUTH.commiteRole= data.commiteRole ?? data.committeRole ?? data.committeeRole ?? null;
    AUTH.idMember   = data.idMember ?? data.memberId ?? data.ID_Member ?? data.id_member ?? null;

    const isAdmin = AUTH.role === "Administrador";
    const isUser  = AUTH.role === "Usuario";
    const isHigh  = isUser && ["Presidente", "Vicepresidente", "Secretario"].includes(AUTH.commiteRole);

    IS_INSPECTOR  = isUser && AUTH.commiteRole === "Inspector";
    CAN_MANAGE    = isAdmin || isHigh;
    CAN_DO_DETAILS= IS_INSPECTOR;

    if (!(CAN_MANAGE || CAN_DO_DETAILS)) {
      window.location.href = "index.html";
      return false;
    }

    $("#btnAsignar").classList.toggle("d-none", !CAN_MANAGE);
    return true;
  } catch (e) {
    console.error("AuthStatus error:", e);
    window.location.href = "index.html";
    return false;
  }
}

/* =========================================================
   DOMContentLoaded
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const ok = await initAuthAndPerms();
  if (!ok) return;

  await buildChart();
  initFilters();
  await loadAndRenderTable();

  $("#btnAsignar").addEventListener("click", () => {
    if (!CAN_MANAGE) return;
    $("#inpCodigo").value = nextInspectionId();
  });
});
