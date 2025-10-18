// ============================= IMPORTS =============================
import * as ACCIDENTS from "../Service/AccidentService.js";
import { getALlEmployees } from "../Service/EmployeeService.js";
import { AuthStatus } from "../Service/AuthService.js";

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ======================= AUTH + PERMISOS GUARD =====================
let CURRENT_USER = null;         // { nit, role, committeeRole, email, department }
let CAN_USE_MODULE = false;
const ALLOWED_COMMITTEE = new Set(["Presidente", "Vicepresidente", "Secretario"]);

async function ensureAuthAndPermissions() {
  try {
    const res = await AuthStatus();
    const u = (res && (res.data || res)) ?? null;
    if (!u || !u.nit) throw new Error("Sin sesión");

    CURRENT_USER = {
      nit: u.nit,
      role: u.role,
      committeeRole: u.committeeRole,
      email: u.email,
      department: u.department
    };

    const isAdmin = CURRENT_USER.role === "Administrador";
    const isUserBoss = (CURRENT_USER.role === "Usuario") && ALLOWED_COMMITTEE.has(CURRENT_USER.committeeRole);
    CAN_USE_MODULE = isAdmin || isUserBoss;

    if (!CAN_USE_MODULE) {
      showNoAccess();
    } else {
      hideNoAccess();
      const btn = document.getElementById('btnAbrirRegistrar');
      if (btn) btn.classList.remove('d-none');
    }
  } catch (e) {
    throw e;
  }
}

function showNoAccess() {
  const container = document.getElementById("accidents-root") || document.querySelector(".main-content") || document.body;
  container.innerHTML = "";
  const span = document.createElement("div");
  span.style.position = "relative";
  span.style.width = "100%";
  span.style.minHeight = "50vh";
  span.style.display = "grid";
  span.style.placeItems = "center";
  span.innerHTML = `
    <div class="alert alert-warning" style="max-width:800px">
      <i class="bi bi-shield-lock"></i>
      <span class="ms-2">Esta información es confidencial, tú no tienes acceso a ver esta información.</span>
    </div>`;
  container.appendChild(span);

  const btn = document.getElementById('btnAbrirRegistrar');
  if (btn) btn.classList.add('d-none');
}
function hideNoAccess() {
  // si había un bloqueador, ya vaciamos el container arriba; no hay nada que quitar aquí
}

// ======================= SWEETALERT HELPERS ========================
const hasSwal = () => typeof Swal !== "undefined";
function swalError(text, title = "Error") {
  if (hasSwal()) return Swal.fire({ icon: "error", title, text });
  alert(text);
}
function swalSuccess(text, title = "Éxito") {
  if (hasSwal()) return Swal.fire({ icon: "success", title, text });
  alert(text);
}
function swalConfirm({ title = "¿Estás seguro?", text = "", confirmButtonText = "Sí", cancelButtonText = "Cancelar" } = {}) {
  if (hasSwal()) {
    return Swal.fire({
      icon: "question",
      title, text, showCancelButton: true,
      confirmButtonText, cancelButtonText
    });
  }
  const ok = confirm(text || title);
  return Promise.resolve({ isConfirmed: ok });
}
function swalToast(text, icon = "success") {
  if (hasSwal()) {
    return Swal.fire({
      toast: true, icon, title: text, position: "top-end",
      showConfirmButton: false, timer: 1800, timerProgressBar: true
    });
  }
}

// ================ LOADER (para cargas iniciales de API) ==============
function getAccRoot() {
  return document.getElementById("accidents-root")
      || document.querySelector(".main-content")
      || document.body;
}
function showLoading(msg = "Cargando…") {
  const host = getAccRoot();
  if (!host) return;
  let el = document.getElementById("acc-loader");
  if (!el) {
    el = document.createElement("div");
    el.id = "acc-loader";
    el.style.cssText = `
      position:fixed; inset:0; background:rgba(255,255,255,.75);
      display:flex; align-items:center; justify-content:center; z-index:2000;
      backdrop-filter:saturate(120%) blur(2px);
    `;
    el.innerHTML = `
      <div class="text-center">
        <div class="spinner-border text-success" role="status" style="width:3rem;height:3rem;"></div>
        <div class="mt-3 fw-semibold" style="color:#169b87">${msg}</div>
      </div>`;
    host.appendChild(el);
  } else {
    el.style.display = "flex";
  }
}
function hideLoading() {
  const el = document.getElementById("acc-loader");
  if (el) el.style.display = "none";
}

// ======================= ESTADO Y CATÁLOGOS ========================
let BODY_PARTS = [];               // [{id_part, ui_key, name, laterality_type}]
let UIKEY_TO_PART = new Map();     // ui_key -> { id_part, name, laterality }
let CATEGORIES = [];               // [{id_category_accident, name_category}]
let EMPLOYEES = [];                // [{nit, name, role, avatar}]

function mapBodyParts(bpArray) {
  UIKEY_TO_PART.clear();
  BODY_PARTS = Array.isArray(bpArray) ? bpArray : [];
  for (const p of BODY_PARTS) {
    UIKEY_TO_PART.set(p.ui_key, { id_part: p.id_part, name: p.name, laterality: p.laterality_type });
  }
}

function fillCategoriesSelects() {
  const filterSel = document.getElementById('fCategoria');
  const formSel   = document.getElementById('categoria');
  if (filterSel) {
    filterSel.innerHTML = [`<option value="">NINGUNA</option>`]
      .concat(CATEGORIES.map(c => `<option value="${c.id_category_accident}">${c.name_category}</option>`))
      .join("");
  }
  if (formSel) {
    formSel.innerHTML = `<option value="" disabled selected>Selecciona…</option>` +
      CATEGORIES.map(c => `<option value="${c.id_category_accident}">${c.name_category}</option>`).join('');
  }
}

function catName(id) {
  return (CATEGORIES.find(c => Number(c.id_category_accident) === Number(id)) || {}).name_category || '—';
}
function empName(nit) {
  return (EMPLOYEES.find(e => e.nit === nit) || {}).name || nit || '—';
}

// =================== LISTADO + FILTROS + PAGINACIÓN =================
const els = {
  grid: document.getElementById('grid'),
  fInseg: document.getElementById('fInseguridad'),
  fCat: document.getElementById('fCategoria'),
  fMes: document.getElementById('fMes'),
  fSearch: document.getElementById('fSearch'),
  pages: document.getElementById('pages'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  countInfo: document.getElementById('countInfo'),
  tplCard: document.getElementById('tpl-card'),
  btnRegistrar: document.getElementById('btnAbrirRegistrar')
};

const PAGE_SIZE = 10;
let currentFilter = { type_insecurity: "", id_category: "", month: "", q: "" };
let currentPage = 0;
let totalPages = 1;

// Cache maestro de TODOS los accidentes (para filtrar en cliente)
let ALL_CACHE = [];     // arreglo de detalles (cada item con: id_accident_detail, id_accident, dt_accident, type_insecurity, injured_employee, id_category_accident, ...)
let FILTERED = [];      // resultado de aplicar filtros sobre ALL_CACHE
let PAGE_SLICE = [];    // items de la página actual

function getSelectedFilterValues() {
  return {
    type_insecurity: els.fInseg?.value?.trim() || "",
    id_category: els.fCat?.value || "",
    month: els.fMes?.value || "",
    q: (els.fSearch?.value || "").trim().toLowerCase()
  };
}

// ---------- carga total (paginada desde backend, pero guardamos en cliente) ----------
async function fetchAllAccidentsToCache() {
  ALL_CACHE = [];
  let page = 0;
  const size = 50; // tamaño grande para traer rápido
  while (true) {
    const resp = await ACCIDENTS.getAllAccidentPage(page, size);
    const pg = resp?.data ?? resp;
    const content = pg?.content ?? [];
    if (Array.isArray(content)) {
      ALL_CACHE.push(...content);
    }
    const tp = pg?.totalPages ?? 1;
    if (page >= tp - 1) break;
    page += 1;
  }

  // ordenar por fecha accidente DESC (más recientes primero, si el backend no lo hace)
  ALL_CACHE.sort((a, b) => new Date(b.dt_accident) - new Date(a.dt_accident));
}

// ---------- filtros en cliente ----------
function applyClientFilters() {
  const { type_insecurity, id_category, month, q } = currentFilter;

  FILTERED = ALL_CACHE.filter(rec => {
    if (type_insecurity && rec.type_insecurity !== type_insecurity) return false;
    if (id_category && String(rec.id_category_accident) !== String(id_category)) return false;
    if (month) {
      const mm = Number((rec.dt_accident || "").slice(5, 7));
      if (String(mm) !== String(month)) return false;
    }

    if (q) {
      const txt = [
        (rec.type_insecurity || ""),
        empName(rec.injured_employee),
        catName(rec.id_category_accident)
      ].join(" ").toLowerCase();
      if (!txt.includes(q)) return false;
    }
    return true;
  });

  // recalcular páginas
  totalPages = Math.max(1, Math.ceil(FILTERED.length / PAGE_SIZE));
  if (currentPage >= totalPages) currentPage = totalPages - 1;
}

function renderCurrentPage() {
  const start = currentPage * PAGE_SIZE;
  PAGE_SLICE = FILTERED.slice(start, start + PAGE_SIZE);

  renderGrid(PAGE_SLICE);
  renderPager();
  renderChartsFrom(FILTERED); // gráficas con TODOS los filtrados, no solo la página
}

function renderGrid(list) {
  const grid = els.grid, tpl = els.tplCard;
  if (!grid || !tpl) return;
  grid.innerHTML = '';
  for (const d of list) {
    const n = tpl.content.cloneNode(true);
    n.querySelector('.title').textContent = `ACCIDENTE POR: ${catName(d.id_category_accident).toUpperCase()}`;
    n.querySelector('.fecha').textContent = `Fecha del accidente: ${d.dt_accident}`;
    n.querySelector('.causa').textContent = `Causa: ${d.type_insecurity}`;
    n.querySelector('.empleado').textContent = `Empleado lesionado: ${empName(d.injured_employee)}`;

    n.querySelector('.action-edit').addEventListener('click', (e) => { e.preventDefault(); openForm('edit', d.id_accident_detail); });
    n.querySelector('.action-view').addEventListener('click', (e) => { e.preventDefault(); openDetalle(d.id_accident_detail, d.id_accident); });
    n.querySelector('.action-pdf').addEventListener('click', async (e) => {
      e.preventDefault();
      const full = await ACCIDENTS.getAccidentDetail(d.id_accident_detail);
      const head = await ACCIDENTS.getAccidentHeader(d.id_accident);
      downloadPDFFromDTO(full?.data ?? full, head?.data ?? head);
    });

    grid.appendChild(n);
  }
  if (els.countInfo) {
    els.countInfo.textContent = `${FILTERED.length} accidente(s) • página ${currentPage + 1}/${totalPages}`;
  }
}

function renderPager() {
  const pages = els.pages, btnPrev = els.btnPrev, btnNext = els.btnNext;
  if (!pages) return;
  pages.innerHTML = '';
  for (let i = 0; i < totalPages; i++) {
    const b = document.createElement('button');
    b.className = 'btn btn-ghost btn-sm' + (i === currentPage ? ' btn-brand text-white' : '');
    b.textContent = i + 1;
    b.addEventListener('click', () => { currentPage = i; renderCurrentPage(); });
    pages.appendChild(b);
  }
  if (btnPrev) btnPrev.onclick = () => { if (currentPage > 0) { currentPage--; renderCurrentPage(); } };
  if (btnNext) btnNext.onclick = () => { if (currentPage < totalPages - 1) { currentPage++; renderCurrentPage(); } };
}

// listeners de filtros
['change', 'input'].forEach(ev => {
  els.fInseg?.addEventListener(ev, () => { currentFilter = getSelectedFilterValues(); currentPage = 0; applyClientFilters(); renderCurrentPage(); });
  els.fCat?.addEventListener(ev, () => { currentFilter = getSelectedFilterValues(); currentPage = 0; applyClientFilters(); renderCurrentPage(); });
  els.fMes?.addEventListener(ev, () => { currentFilter = getSelectedFilterValues(); currentPage = 0; applyClientFilters(); renderCurrentPage(); });
  els.fSearch?.addEventListener(ev, () => { currentFilter = getSelectedFilterValues(); currentPage = 0; applyClientFilters(); renderCurrentPage(); });
});

// ============================= GRÁFICAS ============================
let chartDonut, chartBar;
function renderChartsFrom(list) {
  const ctxD = document.getElementById('chartDonut')?.getContext('2d');
  const ctxB = document.getElementById('chartBar')?.getContext('2d');
  if (!ctxD || !ctxB) return;

  const cAccion = list.filter(r => r.type_insecurity === 'ACCION INSEGURA').length;
  const cCond   = list.filter(r => r.type_insecurity === 'CONDICION INSEGURA').length;
  const byMonth = Array.from({ length: 12 }, (_, i) =>
    list.filter(r => Number((r.dt_accident || '').slice(5, 7)) === (i + 1)).length
  );

  const colors = {
    donut: { cond: 'rgba(32, 162, 160, 1)', action: 'rgba(14, 127, 125, 0.7)' },
    bar: 'rgba(14, 127, 125, 0.7)',
    barBorder: 'rgba(32, 162, 160, 1)',
    grid: 'rgba(148, 163, 184, 0.25)',
    ticks: '#64748b'
  };

  if (chartDonut) chartDonut.destroy();
  if (chartBar) chartBar.destroy();

  chartDonut = new Chart(ctxD, {
    type: 'doughnut',
    data: {
      labels: ['Condición', 'Acción'],
      datasets: [{ data: [cCond, cAccion], backgroundColor: [colors.donut.cond, colors.donut.action], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, layout: { padding: 10 },
      plugins: { legend: { position: 'top', labels: { color: colors.ticks, boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
      cutout: '68%', radius: '90%'
    }
  });

  chartBar = new Chart(ctxB, {
    type: 'bar',
    data: {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      datasets: [{
        label: 'Accidentes', data: byMonth,
        backgroundColor: colors.bar, hoverBackgroundColor: colors.barBorder,
        borderColor: colors.barBorder, borderWidth: 1, maxBarThickness: 18, borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, layout: { padding: { top: 6, right: 10, bottom: 4, left: 6 } },
      scales: {
        x: { grid: { display: false }, ticks: { color: colors.ticks, maxRotation: 0, autoSkip: true } },
        y: { beginAtZero: true, ticks: { color: colors.ticks, stepSize: 1 }, grid: { color: colors.grid } }
      }
    }
  });
}

function logoSSSO() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='60'><rect width='220' height='60' fill='white'/><text x='10' y='40' font-family='Arial' font-size='36' fill='#115e59'>SSSO</text><circle cx='180' cy='30' r='14' fill='#115e59'/><rect x='176' y='18' width='8' height='24' fill='white'/></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}
function downloadPDFFromDTO(detail, header) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }); const m = 48;
  doc.addImage(logoSSSO(), 'PNG', m, m - 8, 140, 40);
  doc.setFontSize(16); doc.text('Reporte de Accidente', m + 160, m + 12);
  let y = m + 60; doc.setFontSize(11);
  doc.text(`ID Accidente: ${header?.id_accident ?? '—'}`, m, y); y += 16;
  doc.text(`Fecha registro: ${header?.date_register ?? '—'} ${header?.time_register ?? ''}`, m, y); y += 16;
  doc.text(`Confirmado por: ${header?.confirmed_by ?? '—'}`, m, y); y += 24;
  doc.text(`Fecha del accidente: ${detail?.dt_accident ?? '—'}`, m, y); y += 16;
  doc.text(`Categoría: ${catName(detail?.id_category_accident)}`, m, y); y += 16;
  doc.text(`Tipo de inseguridad: ${detail?.type_insecurity ?? '—'}`, m, y); y += 16;
  doc.text(`Empleado lesionado: ${empName(detail?.injured_employee)}`, m, y); y += 16;
  doc.text(`Testigo: ${detail?.witness ?? '—'}`, m, y); y += 16;
  doc.text(`Actividad: ${detail?.activity ?? '—'}`, m, y); y += 16;
  doc.text(`Medidas inmediatas: ${detail?.immediate_measures ?? '—'}`, m, y); y += 16;
  doc.text(`Causa raíz: ${detail?.root_cause ?? '—'}`, m, y); y += 16;
  doc.text(`Causa directa: ${detail?.direct_cause ?? '—'}`, m, y); y += 16;
  y += 8; doc.text('Zonas afectadas:', m, y); y += 14;
  const zonas = (detail?.affected_parts ?? []).map(ap => (BODY_PARTS.find(b => Number(b.id_part) === Number(ap.id_part)) || {}).name).filter(Boolean);
  doc.text(zonas.length ? zonas.join(', ') : '—', m, y, { maxWidth: 520 });
  doc.save(`Accidente_${header?.id_accident ?? 'detalle'}.pdf`);
}

// ============================ DETALLE ==============================
const modalDetalle = new bootstrap.Modal(document.getElementById('modalDetalle'));
async function openDetalle(idDetail, idAccident) {
  try {
    const detRes = await ACCIDENTS.getAccidentDetail(idDetail);
    const d = detRes?.data ?? detRes;
    const headRes = await ACCIDENTS.getAccidentHeader(idAccident ?? d.id_accident);
    const a = headRes?.data ?? headRes;

    const zonas = (d.affected_parts || []).map(ap => {
      const bp = BODY_PARTS.find(b => Number(b.id_part) === Number(ap.id_part));
      return bp ? bp.name : `Parte #${ap.id_part}`;
    });

    document.getElementById('detalleContent').innerHTML = `
      <div class="card"><div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <h6>Generales</h6>
            <ul class="mb-3">
              <li><b>ID accidente:</b> ${a.id_accident}</li>
              <li><b>Fecha registro:</b> ${a.date_register ?? '—'} ${a.time_register ?? ''}</li>
              <li><b>Confirmado por:</b> ${a.confirmed_by ?? '—'}</li>
            </ul>
            <h6>Del accidente</h6>
            <ul class="mb-0">
              <li><b>Fecha del accidente:</b> ${d.dt_accident}</li>
              <li><b>Categoría:</b> ${catName(d.id_category_accident)}</li>
              <li><b>Tipo de inseguridad:</b> ${d.type_insecurity}</li>
              <li><b>Empleado lesionado:</b> ${empName(d.injured_employee)}</li>
              <li><b>Testigo:</b> ${d.witness ?? '—'}</li>
              <li><b>Actividad:</b> ${d.activity ?? '—'}</li>
              <li><b>Medidas inmediatas:</b> ${d.immediate_measures ?? '—'}</li>
              <li><b>Causa raíz:</b> ${d.root_cause ?? '—'}</li>
              <li><b>Causa directa:</b> ${d.direct_cause ?? '—'}</li>
              <li><b>Descripción:</b> ${d.description ?? '—'}</li>
            </ul>
          </div>
          <div class="col-md-6">
            <h6>Zonas afectadas</h6>
            ${zonas.length ? '<ul>' + zonas.map(z => `<li>${z}</li>`).join('') + '</ul>' : '<div class="text-muted">—</div>'}
          </div>
        </div>
      </div></div>
    `;
    document.getElementById('btnDetallePDF').onclick = () => downloadPDFFromDTO(d, a);
    document.getElementById('btnDetalleEditar').onclick = () => { modalDetalle.hide(); openForm('edit', idDetail); };
    modalDetalle.show();
  } catch (e) {
    console.error("openDetalle error", e);
    swalError("No fue posible cargar el detalle.");
  }
}

// ==================== FORM + EMPLEADOS + 3D UI =====================
const modalForm = new bootstrap.Modal(document.getElementById('modalForm'));
document.getElementById('btnAbrirRegistrar')?.addEventListener('click', () => openForm('new'));

let editingId = null;
const f = {
  fechaRegistro: document.getElementById('fechaRegistro'),
  horaRegistro: document.getElementById('horaRegistro'),
  confirmadoPor: document.getElementById('confirmadoPor'),
  categoria: document.getElementById('categoria'),
  fechaAcc: document.getElementById('fechaAccidente'),
  tipoInseg: document.getElementById('tipoInseguridad'),
  witness: document.getElementById('witness'),
  actividad: document.getElementById('actividad'),
  medidas: document.getElementById('medidas'),
  causaRaiz: document.getElementById('causaRaiz'),
  causaDirecta: document.getElementById('causaDirecta'),
  descripcion: document.getElementById('descripcion'),
  buscaEmpleado: document.getElementById('buscaEmpleado'),
  empleadosWrap: document.getElementById('empleadosScroller'),
  empleadoSel: document.getElementById('empleadoSeleccionado'),
  form: document.getElementById('formAccidente'),
  zonasHidden: document.getElementById('zonasSeleccionadas'),
  countSel: document.getElementById('countSel'),
};

// === NUEVO: limitar descripción a 1000 caracteres (HTML) ===
if (f.descripcion) f.descripcion.setAttribute('maxlength', '1000');

function pad2(n) { return String(n).padStart(2, '0'); }
function nowDate() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function nowTime() { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }

let currentEmployeeNIT = null;
function clearEmployeeSelectionUI() {
  [...f.empleadosWrap.children].forEach(c => c.classList.remove('selected'));
  currentEmployeeNIT = null;
  f.empleadoSel.value = "";
}
function renderEmployees(list) {
  f.empleadosWrap.innerHTML = '';
  list.forEach(e => {
    const card = document.createElement('div');
    card.className = 'employee-card';
    card.dataset.nit = e.nit;
    card.innerHTML = `
      <div class="d-flex align-items-center gap-2 mb-2">
        <div class="fs-3">${e.avatar || '👤'}</div>
        <div><div class="fw-semibold">${e.name}</div><div class="nit">${e.nit}</div></div>
      </div>
      <div class="role">${e.role || ''}</div>`;
    card.addEventListener('click', () => {
      [...f.empleadosWrap.children].forEach(c => c.classList.remove('selected'));
      card.classList.add('selected'); currentEmployeeNIT = e.nit; f.empleadoSel.value = e.nit;
    });
    f.empleadosWrap.appendChild(card);
  });
}
function onSearchEmployee() {
  const q = (f.buscaEmpleado.value || "").trim().toLowerCase();
  renderEmployees(EMPLOYEES.filter(e => e.nit.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)));
}

function initFormGenerales() {
  f.fechaRegistro.value = nowDate();
  f.horaRegistro.value = nowTime();
  f.confirmadoPor.value = `${CURRENT_USER.nit} — ${CURRENT_USER.email}`;
  renderEmployees(EMPLOYEES);
  f.buscaEmpleado.value = '';
  f.buscaEmpleado.oninput = onSearchEmployee;
}

// =========================== 3D MANIQUÍ ============================
const BRAND_COLOR = 0x169b87, EYE_WHITE = 0xF7F7F7, PUPIL = 0x2a2a2a, LIP_COLOR = 0xB86A5B, HAIR_COLOR = 0x3b2a1f;
const SKIN_TONES = { claro: { main: 0xF4D2B7, dark: 0xD9A786 }, medio: { main: 0xD2A483, dark: 0xB17C5A }, moreno: { main: 0x9C6B4E, dark: 0x7B523E } };
let currentTone = 'medio', currentGender = 'male';
let scene, camera, renderer, controls, raycaster, mouseNDC, mannequinGroup, hairGroup, toastMax;
const selectableMeshes = new Map(); const selectedIds = new Set(); const MAX_SELECT = 10;
const LABELS = {
  head: 'Cabeza', neck: 'Cuello', chest: 'Pectoral/pecho', abdomen: 'Abdomen', pelvis: 'Pelvis/Cadera',
  glute_r: 'Glúteo derecho', glute_l: 'Glúteo izquierdo', shoulder_r: 'Hombro derecho', shoulder_l: 'Hombro izquierdo',
  upperarm_r: 'Brazo derecho (prox.)', upperarm_l: 'Brazo izquierdo (prox.)', biceps_r: 'Bíceps derecho', biceps_l: 'Bíceps izquierdo',
  forearm_r: 'Antebrazo derecho', forearm_l: 'Antebrazo izquierdo', wrist_r: 'Muñeca derecha', wrist_l: 'Muñeca izquierda',
  elbow_r: 'Codo derecho', elbow_l: 'Codo izquierdo', hand_r: 'Mano derecha', hand_l: 'Mano izquierda',
  thigh_r: 'Muslo derecho', thigh_l: 'Muslo izquierdo', knee_r: 'Rodilla derecha', knee_l: 'Rodilla izquierda',
  calf_r: 'Pierna derecha (gemelo)', calf_l: 'Pierna izquierda (gemelo)', foot_r: 'Pie derecho', foot_l: 'Pie izquierdo',
  nose: 'Nariz', eye_r: 'Ojo derecho', eye_l: 'Ojo izquierdo', mouth: 'Boca', ear_r: 'Oreja derecha', ear_l: 'Oreja izquierda'
};
function matSkin(hex) { return new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0, roughness: 0.6, sheen: 0.35, sheenColor: new THREE.Color(hex).multiplyScalar(0.95), clearcoat: 0.05, clearcoatRoughness: 0.6, emissive: 0x000000 }); }
function matStd(hex) { return new THREE.MeshStandardMaterial({ color: hex, roughness: .7, metalness: 0, emissive: 0x000000 }); }

function init3D() {
  const wrap = document.getElementById('viewer-wrap'), host = document.getElementById('viewer3d');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, wrap.clientWidth / wrap.clientHeight, 0.1, 100); camera.position.set(3.2, 2.0, 3.2);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.1)); const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(3, 6, 4); scene.add(dir);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.8, 48), matStd(0xf2f4f7)); ground.rotation.x = -Math.PI / 2; ground.position.y = 0; scene.add(ground);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.rotateSpeed = .9; controls.zoomSpeed = 1.0;
  controls.dollyToCursor = true; controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.target.set(0, 1.4, 0); controls.minDistance = 1.8; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI * 0.49;

  raycaster = new THREE.Raycaster(); mouseNDC = new THREE.Vector2();
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', onResize);

  document.getElementById('vistaFrente').addEventListener('change', () => snapView('front'));
  document.getElementById('vistaEspalda').addEventListener('change', () => snapView('back'));
  document.getElementById('vistaLado').addEventListener('change', () => snapView('side'));
  document.getElementById('btnCentrar').addEventListener('click', focusModel);
  document.getElementById('btnResetSel').addEventListener('click', clearSelection);
  document.getElementById('genero').addEventListener('change', e => { currentGender = e.target.value; rebuildMannequin(); });
  document.getElementById('tonoPiel').addEventListener('change', e => { currentTone = e.target.value; applySkinTone(); });
  toastMax = new bootstrap.Toast(document.getElementById('toastMax'));

  buildMannequin(currentGender); animate();

  // Fallback por si quedó en 0x0
  requestAnimationFrame(() => {
    const wrap2 = document.getElementById('viewer-wrap');
    if (wrap2 && renderer && (renderer.domElement.width === 0 || renderer.domElement.height === 0)) {
      onResize();
    }
  });
}
function dispose3D() {
  if (!renderer) return;
  window.removeEventListener('resize', onResize);
  renderer.domElement.removeEventListener('pointermove', onPointerMove);
  renderer.domElement.removeEventListener('pointerdown', onPointerDown);
  renderer.dispose();
  document.getElementById('viewer3d').innerHTML = '';
  scene = camera = renderer = controls = raycaster = mouseNDC = mannequinGroup = hairGroup = null;
  selectableMeshes.clear(); selectedIds.clear();
  updateChips();
}
function onResize() {
  const wrap = document.getElementById('viewer-wrap'); if (!camera || !renderer) return;
  camera.aspect = wrap.clientWidth / wrap.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(wrap.clientWidth, wrap.clientHeight);
}
function animate() { if (!renderer) return; requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
function focusModel() { if (!controls || !camera) return; controls.target.set(0, 1.4, 0); camera.position.set(3.2, 2.0, 3.2); controls.update(); }
function snapView(which) { if (!camera || !controls) return; const r = 3.3; if (which === 'front') camera.position.set(0, 1.8, r); if (which === 'back') camera.position.set(0, 1.8, -r); if (which === 'side') camera.position.set(r, 1.8, 0); controls.target.set(0, 1.4, 0); controls.update(); }
function rebuildMannequin() { selectedIds.clear(); updateChips(); if (mannequinGroup) scene.remove(mannequinGroup); if (hairGroup) scene.remove(hairGroup); selectableMeshes.clear(); buildMannequin(currentGender); }
function buildMannequin(gender = 'male') {
  mannequinGroup = new THREE.Group(); mannequinGroup.name = 'mannequin';
  const tone = SKIN_TONES[currentTone];
  const part = (id, label, geom, pos, base = 'skinMain') => {
    let m; if (base === 'skinMain') m = matSkin(tone.main); else if (base === 'skinDark') m = matSkin(tone.dark);
    else if (base === 'eye') m = matStd(EYE_WHITE); else if (base === 'mouth') m = matStd(LIP_COLOR); else m = matStd(0xffffff);
    const mesh = new THREE.Mesh(geom, m); mesh.position.set(pos.x, pos.y, pos.z);
    mesh.userData = { id, label, base }; selectableMeshes.set(id, mesh); mannequinGroup.add(mesh); return mesh;
  };
  const G = (gender === 'female') ? { shoulderW: 1.00, hipW: 1.08, chestScale: 0.95, gluteW: 1.06, torsoH: 1.02 } : { shoulderW: 1.08, hipW: 0.98, chestScale: 0.90, gluteW: 1.00, torsoH: 1.04 };
  const SCALE = 1.0; const yFoot = 0.07, yCalf = 0.30, yKnee = 0.50, yThigh = 0.80, yPelvis = 1.05, yAbd = 1.35, yChest = 1.65, yShoulder = 1.77, yNeck = 1.86, yHead = 2.08;
  const pelvis = part('pelvis', 'Pelvis/Cadera', new THREE.CylinderGeometry(0.21 * G.hipW * SCALE, 0.24 * G.hipW * SCALE, 0.22 * SCALE, 24), { x: 0, y: yPelvis, z: 0 }, 'skinDark'); pelvis.scale.set(1.1, 1, .9);
  const abdomen = part('abdomen', 'Abdomen', new THREE.CapsuleGeometry(0.19 * SCALE, 0.23 * G.torsoH * SCALE, 10, 16), { x: 0, y: yAbd, z: 0 }, 'skinMain'); abdomen.scale.set(1.2, 1.06, 1.0);
  const chest = part('chest', 'Pectoral/pecho', new THREE.CapsuleGeometry(0.20 * SCALE, 0.22 * G.torsoH * SCALE, 12, 18), { x: 0, y: yChest, z: 0 }, 'skinMain'); chest.scale.set(1.35 * G.shoulderW, 0.9 * G.chestScale, 1.05);
  const glR = part('glute_r', 'Glúteo derecho', new THREE.SphereGeometry(0.13 * G.gluteW * SCALE, 20, 16), { x: +0.13 * SCALE, y: yPelvis - 0.03, z: -0.18 * SCALE }, 'skinDark'); glR.scale.set(1.15, 1, 1.15);
  const glL = part('glute_l', 'Glúteo izquierdo', new THREE.SphereGeometry(0.13 * G.gluteW * SCALE, 20, 16), { x: -0.13 * SCALE, y: yPelvis - 0.03, z: -0.18 * SCALE }, 'skinDark'); glL.scale.set(1.15, 1, 1.15);
  part('neck', 'Cuello', new THREE.CylinderGeometry(0.08 * SCALE, 0.09 * SCALE, 0.12 * SCALE, 20), { x: 0, y: yNeck, z: 0 }, 'skinMain');
  part('head', 'Cabeza', new THREE.SphereGeometry(0.18 * SCALE, 26, 20), { x: 0, y: yHead, z: 0 }, 'skinMain');
  const nose = part('nose', 'Nariz', new THREE.ConeGeometry(0.048 * SCALE, 0.11 * SCALE, 24), { x: 0, y: yHead + 0.015, z: 0.158 * SCALE }, 'skinDark'); nose.rotation.x = Math.PI / 2;
  const eyeR = part('eye_r', 'Ojo derecho', new THREE.SphereGeometry(0.034 * SCALE, 16, 12), { x: +0.072 * SCALE, y: yHead + 0.035, z: 0.152 * SCALE }, 'eye');
  const eyeL = part('eye_l', 'Ojo izquierdo', new THREE.SphereGeometry(0.034 * SCALE, 16, 12), { x: -0.072 * SCALE, y: yHead + 0.035, z: 0.152 * SCALE }, 'eye');
  const pupilMat = matStd(PUPIL);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.014 * SCALE, 12, 10), pupilMat); pupilR.position.set(+0.072 * SCALE, yHead + 0.035, 0.168 * SCALE);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.014 * SCALE, 12, 10), pupilMat); pupilL.position.set(-0.072 * SCALE, yHead + 0.035, 0.168 * SCALE);
  mannequinGroup.add(pupilR, pupilL);
  part('mouth', 'Boca', new THREE.CapsuleGeometry(0.022 * SCALE, 0.07 * SCALE, 8, 16), { x: 0, y: yHead - 0.055, z: 0.165 * SCALE }, 'mouth');
  part('ear_r', 'Oreja derecha', new THREE.SphereGeometry(0.058 * SCALE, 16, 12), { x: +0.19 * SCALE, y: yHead, z: 0 }, 'skinDark');
  part('ear_l', 'Oreja izquierda', new THREE.SphereGeometry(0.058 * SCALE, 16, 12), { x: -0.19 * SCALE, y: yHead, z: 0 }, 'skinDark');
  part('shoulder_r', 'Hombro derecho', new THREE.SphereGeometry(0.095 * SCALE, 20, 16), { x: +0.34 * G.shoulderW * SCALE, y: yShoulder, z: 0 }, 'skinMain');
  part('shoulder_l', 'Hombro izquierdo', new THREE.SphereGeometry(0.095 * SCALE, 20, 16), { x: -0.34 * G.shoulderW * SCALE, y: yShoulder, z: 0 }, 'skinMain');
  part('upperarm_r', 'Brazo derecho (prox.)', new THREE.CapsuleGeometry(0.079 * SCALE, 0.34 * SCALE, 12, 18), { x: +0.46 * G.shoulderW * SCALE, y: yShoulder - 0.22, z: 0 }, 'skinMain');
  part('upperarm_l', 'Brazo izquierdo (prox.)', new THREE.CapsuleGeometry(0.079 * SCALE, 0.34 * SCALE, 12, 18), { x: -0.46 * G.shoulderW * SCALE, y: yShoulder - 0.22, z: 0 }, 'skinMain');
  part('biceps_r', 'Bíceps derecho', new THREE.CapsuleGeometry(0.058 * SCALE, 0.17 * SCALE, 10, 16), { x: +0.46 * G.shoulderW * SCALE, y: yShoulder - 0.27, z: 0.085 }, 'skinDark');
  part('biceps_l', 'Bíceps izquierdo', new THREE.CapsuleGeometry(0.058 * SCALE, 0.17 * SCALE, 10, 16), { x: -0.46 * G.shoulderW * SCALE, y: yShoulder - 0.27, z: 0.085 }, 'skinDark');
  part('elbow_r', 'Codo derecho', new THREE.SphereGeometry(0.082 * SCALE, 20, 16), { x: +0.46 * G.shoulderW * SCALE, y: yShoulder - 0.39, z: 0 }, 'skinDark');
  part('elbow_l', 'Codo izquierdo', new THREE.SphereGeometry(0.082 * SCALE, 20, 16), { x: -0.46 * G.shoulderW * SCALE, y: yShoulder - 0.39, z: 0 }, 'skinDark');
  part('forearm_r', 'Antebrazo derecho', new THREE.CapsuleGeometry(0.068 * SCALE, 0.29 * SCALE, 12, 18), { x: +0.46 * G.shoulderW * SCALE, y: yShoulder - 0.56, z: 0 }, 'skinMain');
  part('forearm_l', 'Antebrazo izquierdo', new THREE.CapsuleGeometry(0.068 * SCALE, 0.29 * SCALE, 12, 18), { x: -0.46 * G.shoulderW * SCALE, y: yShoulder - 0.56, z: 0 }, 'skinMain');
  part('wrist_r', 'Muñeca derecha', new THREE.CylinderGeometry(0.07 * SCALE, 0.07 * SCALE, 0.06 * SCALE, 24), { x: +0.46 * G.shoulderW * SCALE, y: yShoulder - 0.70, z: 0 }, 'skinDark');
  part('wrist_l', 'Muñeca izquierda', new THREE.CylinderGeometry(0.07 * SCALE, 0.07 * SCALE, 0.06 * SCALE, 24), { x: -0.46 * G.shoulderW * SCALE, y: yShoulder - 0.70, z: 0 }, 'skinDark');
  part('hand_r', 'Mano derecha', new THREE.BoxGeometry(0.15 * SCALE, 0.11 * SCALE, 0.06 * SCALE), { x: +0.46 * G.shoulderW * SCALE, y: yShoulder - 0.77, z: 0.03 }, 'skinMain');
  part('hand_l', 'Mano izquierda', new THREE.BoxGeometry(0.15 * SCALE, 0.11 * SCALE, 0.06 * SCALE), { x: -0.46 * G.shoulderW * SCALE, y: yShoulder - 0.77, z: 0.03 }, 'skinMain');
  part('thigh_r', 'Muslo derecho', new THREE.CapsuleGeometry(0.105 * SCALE, 0.45 * SCALE, 12, 18), { x: +0.12 * SCALE, y: yThigh, z: 0 }, 'skinMain');
  part('thigh_l', 'Muslo izquierdo', new THREE.CapsuleGeometry(0.105 * SCALE, 0.45 * SCALE, 12, 18), { x: -0.12 * SCALE, y: yThigh, z: 0 }, 'skinMain');
  part('knee_r', 'Rodilla derecha', new THREE.SphereGeometry(0.095 * SCALE, 20, 16), { x: +0.12 * SCALE, y: yKnee, z: 0.02 }, 'skinDark');
  part('knee_l', 'Rodilla izquierda', new THREE.SphereGeometry(0.095 * SCALE, 20, 16), { x: -0.12 * SCALE, y: yKnee, z: 0.02 }, 'skinDark');
  part('calf_r', 'Pierna derecha (gemelo)', new THREE.CapsuleGeometry(0.09 * SCALE, 0.33 * SCALE, 12, 18), { x: +0.12 * SCALE, y: yCalf, z: 0 }, 'skinMain');
  part('calf_l', 'Pierna izquierda (gemelo)', new THREE.CapsuleGeometry(0.09 * SCALE, 0.33 * SCALE, 12, 18), { x: -0.12 * SCALE, y: yCalf, z: 0 }, 'skinMain');
  part('foot_r', 'Pie derecho', new THREE.BoxGeometry(0.24 * SCALE, 0.07 * SCALE, 0.10 * SCALE), { x: +0.15 * SCALE, y: yFoot, z: +0.05 }, 'skinMain');
  part('foot_l', 'Pie izquierdo', new THREE.BoxGeometry(0.24 * SCALE, 0.07 * SCALE, 0.10 * SCALE), { x: -0.15 * SCALE, y: yFoot, z: +0.05 }, 'skinMain');

  hairGroup = new THREE.Group(); hairGroup.layers.set(1);
  const hairMat = matStd(HAIR_COLOR);
  if (gender === 'male') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.19 * SCALE, 24, 18, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), hairMat); cap.position.set(0, yHead + 0.01, -0.01); hairGroup.add(cap);
  } else {
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.16 * SCALE, 0.28 * SCALE, 12, 18), hairMat); back.position.set(0, yHead - 0.02, -0.14 * SCALE);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.19 * SCALE, 24, 18, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.6), hairMat); crown.position.set(0, yHead + 0.01, 0);
    hairGroup.add(back, crown);
  }
  mannequinGroup.traverse(o => { if (o.isMesh) o.geometry.computeVertexNormals(); });
  scene.add(mannequinGroup); scene.add(hairGroup); focusModel();
}
function applySkinTone() {
  const tone = SKIN_TONES[currentTone];
  mannequinGroup?.traverse(o => {
    if (!o.isMesh) return; const base = o.userData?.base;
    if (base === 'skinMain') o.material.color.setHex(tone.main);
    else if (base === 'skinDark') o.material.color.setHex(tone.dark);
  });
}
const hoverLabel = document.getElementById('hoverLabel');
function onPointerMove(e) {
  if (!renderer) return;
  const rect = renderer.domElement.getBoundingClientRect(); const x = e.clientX - rect.left, y = e.clientY - rect.top;
  mouseNDC.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1); raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects([...selectableMeshes.values()], false);
  if (hits.length) { const { id, label } = hits[0].object.userData; hoverLabel.textContent = label ?? (LABELS[id] || id); hoverLabel.style.left = `${x}px`; hoverLabel.style.top = `${y}px`; hoverLabel.style.opacity = 1; document.body.style.cursor = 'pointer'; }
  else { hoverLabel.style.opacity = 0; document.body.style.cursor = 'default'; }
}
function onPointerDown(e) {
  if (!renderer) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects([...selectableMeshes.values()], false);
  if (hits.length) toggleSelect(hits[0].object.userData.id);
}
function toggleSelect(id) {
  const mesh = selectableMeshes.get(id); if (!mesh) return;
  if (selectedIds.has(id)) { selectedIds.delete(id); mesh.material.emissive?.setHex(0x000000); restoreBaseColor(mesh); }
  else {
    if (selectedIds.size >= MAX_SELECT) { bootstrap.Toast.getOrCreateInstance(document.getElementById('toastMax')).show(); return; }
    selectedIds.add(id); mesh.material.emissive?.setHex(BRAND_COLOR); mesh.material.emissiveIntensity = 0.6;
  }
  updateChips();
}
function restoreBaseColor(mesh) {
  const tone = SKIN_TONES[currentTone], base = mesh.userData?.base;
  if (base === 'skinMain') mesh.material.color.setHex(tone.main);
  else if (base === 'skinDark') mesh.material.color.setHex(tone.dark);
  else if (base === 'eye') mesh.material.color.setHex(EYE_WHITE);
  else if (base === 'mouth') mesh.material.color.setHex(LIP_COLOR);
}
function clearSelection() {
  for (const id of selectedIds) { const m = selectableMeshes.get(id); if (m) { m.material.emissive?.setHex(0x000000); restoreBaseColor(m); } }
  selectedIds.clear(); updateChips();
}
function updateChips() {
  const chips = document.getElementById('chips'); if (!chips) return;
  chips.innerHTML = ''; const arr = [...selectedIds].map(id => ({ id, label: LABELS[id] || id }));
  f.zonasHidden.value = JSON.stringify(arr); f.countSel.textContent = `(${arr.length}/${MAX_SELECT})`;
  if (!arr.length) { chips.innerHTML = '<div class="form-text">Aún no hay zonas seleccionadas.</div>'; return; }
  for (const item of arr) {
    const chip = document.createElement('span'); chip.className = 'chip';
    chip.innerHTML = `<i class="bi bi-geo-alt"></i> ${item.label} <button type="button" title="Quitar"><i class="bi bi-x-lg"></i></button>`;
    chip.querySelector('button').addEventListener('click', () => toggleSelect(item.id)); chips.appendChild(chip);
  }
}
document.getElementById('btnDemo')?.addEventListener('click', () => {
  ['biceps_r', 'eye_r', 'wrist_r', 'knee_l', 'glute_r'].forEach(id => { if (!selectedIds.has(id)) toggleSelect(id); });
  document.getElementById('vistaFrente').checked = true; snapView('front');
});
function inferLatFromKey(k) { if (/_r$/i.test(k)) return 'DERECHO'; if (/_l$/i.test(k)) return 'IZQUIERDO'; return 'CENTRAL'; }

// ====================== RESETEO/LIMPIEZA FORM ======================
function resetFormUI() {
  // limpiar validaciones
  f.form.classList.remove('was-validated');

  // valores base
  f.fechaRegistro.value = nowDate();
  f.horaRegistro.value  = nowTime();
  f.confirmadoPor.value = `${CURRENT_USER?.nit ?? ''} — ${CURRENT_USER?.email ?? ''}`;
  f.categoria.value = "";
  f.fechaAcc.value = "";
  f.tipoInseg.value = "";
  f.witness.value = "";
  f.actividad.value = "";
  f.medidas.value = "";
  f.causaRaiz.value = "";
  f.causaDirecta.value = "";
  f.descripcion.value = "";

  // empleados
  clearEmployeeSelectionUI();

  // 3D
  selectedIds.clear(); updateChips();
  const generoSel = document.getElementById('genero');
  const tonoSel   = document.getElementById('tonoPiel');
  if (generoSel) generoSel.value = "male";
  if (tonoSel)   tonoSel.value   = "medio";
  currentGender = "male";
  currentTone   = "medio";
}

// ===== helper: esperar a que el modal esté visible (para init3D) =====
function waitModalShown(modalEl) {
  return new Promise(resolve => {
    const once = () => { modalEl.removeEventListener('shown.bs.modal', once); resolve(); };
    modalEl.addEventListener('shown.bs.modal', once, { once: true });
  });
}

// ==================== ABRIR FORM (NEW / EDIT) ======================
async function openForm(mode = 'new', idDetail = null) {
  editingId = (mode === 'edit') ? idDetail : null;
  document.getElementById('formTitle').textContent = editingId ? 'Editar accidente' : 'Registrar accidente';

  // reset limpio SIEMPRE
  resetFormUI();

  // Inicial auto + empleados
  initFormGenerales();

  // Mostrar modal primero y esperar a que esté visible para inicializar 3D
  const elModal = document.getElementById('modalForm');
  modalForm.show();
  await waitModalShown(elModal);

  // 3D: ahora sí (ya hay ancho/alto)
  dispose3D();
  init3D();
  setTimeout(() => { onResize(); }, 50); // forzar resize por animación Bootstrap

  if (editingId) {
    const detRes = await ACCIDENTS.getAccidentDetail(editingId);
    const d = detRes?.data ?? detRes;

    const headRes = await ACCIDENTS.getAccidentHeader(d.id_accident);
    const a = headRes?.data ?? headRes;

    f.fechaRegistro.value = a.date_register ?? nowDate();
    f.horaRegistro.value  = a.time_register ?? nowTime();
    f.confirmadoPor.value = a.confirmed_by ?? `${CURRENT_USER.nit} — ${CURRENT_USER.email}`;

    f.categoria.value = d.id_category_accident;
    f.fechaAcc.value = d.dt_accident;
    f.tipoInseg.value = d.type_insecurity;
    f.witness.value = d.witness ?? '';
    f.actividad.value = d.activity ?? '';
    f.medidas.value = d.immediate_measures ?? '';
    f.causaRaiz.value = d.root_cause ?? '';
    f.causaDirecta.value = d.direct_cause ?? '';
    f.descripcion.value = d.description ?? '';

    // empleado
    const card = [...f.empleadosWrap.children].find(c => c.dataset.nit === d.injured_employee);
    if (card) card.click();

    // zonas -> seleccionar por id_part => ui_key
    const selUi = (d.affected_parts || [])
      .map(ap => BODY_PARTS.find(b => Number(b.id_part) === Number(ap.id_part)))
      .filter(Boolean)
      .map(b => b.ui_key);
    selectedIds.clear();
    selUi.forEach(k => toggleSelect(k));
  }
}

document.getElementById('modalForm')?.addEventListener('hidden.bs.modal', () => {
  // al cerrar, limpiar todo para que no “se queden” los valores
  dispose3D();
  resetFormUI();
});

// ========================= VALIDACIONES ============================
// NUEVO: helpers de fecha/validación extendida
function onlyDate(str) {
  // Espera "YYYY-MM-DD"; devuelve Date en medianoche local
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function validateBeforeSubmit() {
  // HTML5 required + selección de empleado + al menos 1 parte:
  const uiSelected = [...selectedIds];
  if (!f.form.checkValidity()) {
    f.form.classList.add('was-validated');
    swalError("Completa los campos obligatorios.");
    return false;
  }
  if (!currentEmployeeNIT) {
    swalError("Selecciona el empleado accidentado.");
    return false;
  }
  if (uiSelected.length < 1) {
    swalError("Selecciona al menos una parte afectada en el maniquí.");
    return false;
  }

  // Descripción <= 1000
  const desc = (f.descripcion.value || "").trim();
  if (desc.length > 1000) {
    swalError("La descripción no puede exceder los 1000 caracteres.");
    f.descripcion.focus();
    return false;
  }

  // Fecha de accidente: NO futura (permitido hoy o pasadas)
  const dAcc = onlyDate(f.fechaAcc.value);
  const today = onlyDate(nowDate());
  if (!dAcc) {
    swalError("Indica una fecha de accidente válida.");
    f.fechaAcc.focus();
    return false;
  }
  if (dAcc.getTime() > today.getTime()) {
    swalError("No puedes registrar un accidente con fecha futura.");
    f.fechaAcc.focus();
    return false;
  }

  return true;
}

// =========================== SUBMIT FORM ===========================
async function refetchAllAndRerender(goFirstPage = false) {
  await fetchAllAccidentsToCache();
  if (goFirstPage) currentPage = 0;
  applyClientFilters();
  renderCurrentPage();
}

f.form?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!validateBeforeSubmit()) return;

  const uiSelected = [...selectedIds]; // ui_keys
  const affected_parts = uiSelected
    .map(k => UIKEY_TO_PART.get(k))
    .filter(Boolean)
    .map(x => ({ id_part: x.id_part }));

  try {
    if (editingId) {
      const payload = {
        id_accident_detail: editingId,
        dt_accident: f.fechaAcc.value,
        activity:     f.actividad.value,
        witness:      f.witness.value,
        type_insecurity: f.tipoInseg.value,
        immediate_measures: f.medidas.value,
        root_cause:   f.causaRaiz.value,
        direct_cause: f.causaDirecta.value,
        description:  f.descripcion.value,
        injured_employee: currentEmployeeNIT,
        id_category_accident: Number(f.categoria.value),
        affected_parts
      };
      const r = await ACCIDENTS.UpdateDetail(editingId, payload);
      if (!r?.status) throw new Error(r?.message || 'Error al actualizar');

      swalSuccess("El accidente fue actualizado exitosamente.");
      modalForm.hide();
      resetFormUI();
      await refetchAllAndRerender(false);
    } else {
      const payload = {
        accident: {
          date_register: f.fechaRegistro.value,
          time_register:  f.horaRegistro.value,
          confirmed_by:   CURRENT_USER.nit
        },
        detail: {
          dt_accident: f.fechaAcc.value,
          activity:    f.actividad.value,
          witness:     f.witness.value,
          type_insecurity: f.tipoInseg.value,
          immediate_measures: f.medidas.value,
          root_cause:  f.causaRaiz.value,
          direct_cause:f.causaDirecta.value,
          description: f.descripcion.value,
          injured_employee: currentEmployeeNIT,
          id_category_accident: Number(f.categoria.value),
          affected_parts
        }
      };
      const r = await ACCIDENTS.CreateAccident(payload);
      if (!r?.status) throw new Error(r?.message || 'Error al crear');

      swalSuccess("El accidente fue registrado exitosamente.");
      modalForm.hide();
      resetFormUI();
      await refetchAllAndRerender(true);
    }
  } catch (e) {
    console.error(e);
    swalError(e.message || "Ocurrió un error al guardar.");
  }
});

// ============================ BORRADOS =============================
async function deleteDetail(idDetail) {
  const { isConfirmed } = await swalConfirm({ text: "¿Eliminar este detalle?" });
  if (!isConfirmed) return;
  const r = await ACCIDENTS.DeleteDetail(idDetail);
  if (!r?.status) { swalError(r?.message || "No se pudo eliminar"); return; }
  swalToast("Detalle eliminado");
  await refetchAllAndRerender(false);
}
async function deleteAccident(idAccident) {
  const { isConfirmed } = await swalConfirm({ text: "¿Eliminar accidente completo?" });
  if (!isConfirmed) return;
  const r = await ACCIDENTS.DeleteAccident(idAccident);
  if (!r?.status) { swalError(r?.message || "No se pudo eliminar"); return; }
  swalToast("Accidente eliminado");
  await refetchAllAndRerender(true);
}

// ========================== INICIALIZACIÓN =========================
async function initAccidentsUI() {
  showLoading("Cargando información…");
  try {
    await ensureAuthAndPermissions();
    if (!CAN_USE_MODULE) { hideLoading(); return; }

    // Catálogos
    const catRes = await ACCIDENTS.GetCategoriesAccident();
    CATEGORIES = catRes?.data ?? [];
    fillCategoriesSelects();

    const bpRes = await ACCIDENTS.GetBodyParts();
    mapBodyParts(bpRes?.data ?? []);

    // Empleados activos
    const empRes = await getALlEmployees();
    EMPLOYEES = (empRes ?? []).filter(e => String(e.state_employee).toUpperCase() === "TRUE")
      .map(e => ({
        nit: e.nit_employee,
        name: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || e.nit_employee,
        avatar: "👤",
        role: e.id_department || ""
      }));

    // Listado inicial (cachear todo y filtrar en cliente)
    await fetchAllAccidentsToCache();
    currentFilter = getSelectedFilterValues();
    applyClientFilters();
    renderCurrentPage();
  } catch (e) {
    console.error(e);
    swalError("No se pudo cargar el módulo de accidentes.");
  } finally {
    hideLoading();
  }
}

// arranque
document.addEventListener('DOMContentLoaded', initAccidentsUI);
