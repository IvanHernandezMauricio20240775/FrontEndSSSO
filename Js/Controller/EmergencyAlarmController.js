import {
  getAllEmergencyAlarm,
  InsertNewEmergencyAlarm,
  UpdatedEmergencyAlarm,
  getEmergencyAlarmById,
  DeleteEmergencyAlarm,
  UploadImage
} from "../Service/EmergencyAlarmService.js";

import { getAllLocation } from "../Service/LocationService.js";
import { AuthStatus } from "../Service/AuthService.js";

/* -------------------- helpers -------------------- */
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const swalOK  = (msg) => Swal.fire({ icon:'success', title:'Éxito', text:msg, timer:1400, showConfirmButton:false });
const swalErr = (msg) => Swal.fire({ icon:'error', title:'Ups...', text:msg });
const swalAsk = (t='¿Eliminar?', d='Esta acción no se puede deshacer.') =>
  Swal.fire({ icon:'warning', title:t, text:d, showCancelButton:true, confirmButtonColor:'#d33', cancelButtonText:'Cancelar', confirmButtonText:'Eliminar' });

/* -------------------- estado -------------------- */
let AUTH = null;
let CAN_SEE = false;   // ver la página
let CAN_WRITE = false; // crear/editar/eliminar

let alarms = [];       // lista completa
let filtered = [];     // lista filtrada
let currentPage = 1;
const perPage = 8;

let FILE_SELECTED = null; // file del modal
let IS_EDIT_MODE  = false; // flag crear/editar

// filtros
let filterMode  = "all";   // all | working | disabled
let searchQuery = "";

/* -------------------- elementos -------------------- */
const tbody         = $("#EmergencyAlarmTableBody");
const btnAdd        = $("#openFormBtn");
const modalEl       = $("#EmergencyAlarmModal");
const modal         = new bootstrap.Modal(modalEl);
const form          = $("#EmergencyAlarmForm");

const Input_ID      = $("#ID_EmergencyAlarm");
const inputType     = $("#TypeAlarm");
const inputInstall  = $("#DateInstalation");
const inputLocation = $("#TypeLocation_CMB");
const inputStatus   = $("#Status_CMB");
const inputImg      = $("#ZoneIMG");
const imgPreview    = $("#departamentoImagePreview");

const TitleModal    = $("#EmergencyAlarmModalLabel");
const btnSaveForm   = $("#saveButton");

const OptionsSection= $("#Options");
const DataSection   = $("#Data");
const WelcomeSection= $("#Welcome");
const SearchInput   = $("#Search");

const allBtn        = $("#AllOptions");
const workingBtn    = $("#AlarmWorking");
const disabledBtn   = $("#AlarmDisabled");

const prevPageBtn   = $("#prevPageBtn");
const nextPageBtn   = $("#nextPageBtn");
const pagerNumbers  = $("#paginationNumbers");

/* mensaje de no acceso si no existe */
let NoAccessMsg = $("#NoAccessMsg");
if (!NoAccessMsg) {
  NoAccessMsg = document.createElement("div");
  NoAccessMsg.id = "NoAccessMsg";
  NoAccessMsg.className = "text-center text-muted d-none py-5";
  NoAccessMsg.textContent = "No tienes acceso para ver esta información.";
  WelcomeSection?.insertAdjacentElement("afterend", NoAccessMsg);
}

/* =========================================================
   Auth / permisos
   ========================================================= */
async function loadAuthAndGate() {
  try {
    const raw = await AuthStatus();              // { ok, status, data:{...} } o payload directo
    const u   = raw?.data ?? raw ?? {};

    const norm = (s) =>
      String(s ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .toLowerCase();

    const role      = norm(u.role);
    const committee = norm(u.committeeRole);

    const isAdmin = ["administrador","admin","administrator"].includes(role);
    const isUser  = ["usuario","user"].includes(role);
    const hasCommitteePower = ["presidente","vicepresidente","secretario"].includes(committee);

    CAN_WRITE = isAdmin || (isUser && hasCommitteePower);
    CAN_SEE   = CAN_WRITE; // en esta vista: o todo o nada

    if (!CAN_SEE) {
      OptionsSection?.classList.add("d-none");
      DataSection?.classList.add("d-none");
      btnAdd?.classList.add("d-none");
      NoAccessMsg?.classList.remove("d-none");
    } else {
      OptionsSection?.classList.remove("d-none");
      DataSection?.classList.remove("d-none");
      NoAccessMsg?.classList.add("d-none");
      if (CAN_WRITE) btnAdd?.classList.remove("d-none");
      else btnAdd?.classList.add("d-none");
    }
  } catch (e) {
    CAN_SEE = false; CAN_WRITE = false;
    OptionsSection?.classList.add("d-none");
    DataSection?.classList.add("d-none");
    btnAdd?.classList.add("d-none");
    NoAccessMsg?.classList.remove("d-none");
    console.warn("AuthStatus falló:", e);
  }
}

/* =========================================================
   Utilidades
   ========================================================= */
function pad(n, w=3){ const s=`${n}`; return s.length>=w ? s : "0".repeat(w-s.length)+s; }
/** Siguiente ALRM-### rellenando huecos */
function nextAlarmId(existingIds){
  const nums = []; let maxDigits = 3;
  (existingIds||[]).forEach(id=>{
    const m = /^ALRM-(\d+)$/.exec(id || "");
    if (m){ nums.push(parseInt(m[1],10)); maxDigits = Math.max(maxDigits, m[1].length); }
  });
  if (!nums.length) return `ALRM-${pad(1,maxDigits)}`;
  nums.sort((a,b)=>a-b);
  let next = 1;
  for (let i=0;i<nums.length;i++){
    if (nums[i] === next) next++;
    else if (nums[i] > next) break;
  }
  return `ALRM-${pad(next,maxDigits)}`;
}

/** preview imagen */
function setPreview(fileOrUrl){
  if (!fileOrUrl) { imgPreview.src = "https://placehold.co/120x120?text=IMG"; return; }
  if (typeof fileOrUrl === "string"){ imgPreview.src = fileOrUrl; return; }
  const r = new FileReader();
  r.onload = () => imgPreview.src = r.result;
  r.readAsDataURL(fileOrUrl);
}

/** fila en tabla (acciones condicionadas) */
function createRow(a){
  const tr = document.createElement("tr");
  tr.dataset.id  = a.id_emergency_alarm;
  tr.dataset.img = a.img_alarm || "";

  const actions = CAN_WRITE
    ? `<a href="#" class="action-btn me-2 btn-edit" title="Editar"><i class="fa-solid fa-pen-to-square"></i></a>
       <a href="#" class="action-btn text-danger btn-del" title="Eliminar"><i class="fa-solid fa-trash-can"></i></a>`
    : `<span class="text-muted small">—</span>`;

  tr.innerHTML = `
    <td class="px-3 text-center extintor-image-cell">
      <img src="${a.img_alarm || 'https://placehold.co/80x52'}" alt="Imagen_Alarma" class="extintor-image">
    </td>
    <td class="px-3 fw-bold text-muted">#${a.id_emergency_alarm}</td>
    <td class="px-3">${a.type_alarm}</td>
    <td class="px-3">${a.installation_date}</td>
    <td class="px-3">${a.status_alarm}</td>
    <td class="px-3">${a.id_location}</td>
    <td class="px-3">${actions}</td>
  `;
  return tr;
}

/** aplica filtro + búsqueda */
function applyFilters(){
  const q = (searchQuery || "").toLowerCase().trim();
  filtered = (alarms || []).filter(a=>{
    let ok = true;
    if (filterMode === "working")  ok = (a.status_alarm === "FUNCIONANDO");
    if (filterMode === "disabled") ok = (a.status_alarm !== "FUNCIONANDO");
    if (!ok) return false;

    if (!q) return true;
    return (
      (a.id_emergency_alarm||"").toLowerCase().includes(q) ||
      (a.type_alarm||"").toLowerCase().includes(q) ||
      (a.status_alarm||"").toLowerCase().includes(q) ||
      (a.id_location||"").toLowerCase().includes(q)
    );
  });
}

/** render tabla + paginación */
function render(){
  applyFilters();

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage-1)*perPage;
  const end   = start + perPage;
  const pageItems = filtered.slice(start,end);

  tbody.innerHTML = "";
  if (!pageItems.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Sin resultados</td></tr>`;
  } else {
    pageItems.forEach(a => tbody.appendChild(createRow(a)));
  }

  // paginadores
  pagerNumbers.innerHTML = "";
  for (let i=1;i<=totalPages;i++){
    const li = document.createElement("li");
    li.className = `page-item ${i===currentPage?'active':''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener("click", (e)=>{ e.preventDefault(); currentPage = i; render(); });
    pagerNumbers.appendChild(li);
  }
  prevPageBtn.classList.toggle("disabled", currentPage===1);
  nextPageBtn.classList.toggle("disabled", currentPage===totalPages);
}

/* =========================================================
   Cargas
   ========================================================= */
async function loadLocationsCombo(){
  try{
    const locs = await getAllLocation();
    if (!locs?.length){
      inputLocation.innerHTML = `<option value="">No hay Ubicaciones disponibles</option>`;
      return;
    }
    inputLocation.innerHTML = `<option selected disabled value="">Selecciona una Ubicación...</option>` +
      locs.map(l=>`<option value="${l.id_location}">${l.name_location}</option>`).join("");
  }catch{
    inputLocation.innerHTML = `<option value="">Error al cargar Ubicaciones</option>`;
  }
}
async function loadAlarms(){
  try{ alarms = await getAllEmergencyAlarm(); }
  catch{ alarms = []; }
}

/* =========================================================
   Eventos UI
   ========================================================= */
function wireEvents(){
  // nuevo
  btnAdd.addEventListener("click", async ()=>{
    if (!CAN_WRITE) return;
    await loadAlarms(); // para ID secuencial

    form.reset();
    FILE_SELECTED = null;
    setPreview(null);
    imgPreview.dataset.url = "";

    Input_ID.value    = nextAlarmId(alarms.map(a=>a.id_emergency_alarm));
    Input_ID.readOnly = true;
    IS_EDIT_MODE      = false;

    $("#status-group")?.classList.add("d-none");

    TitleModal.textContent = "Registrar nueva Alarma de Emergencia";
    btnSaveForm.innerHTML  = `<i class="fas fa-save me-2"></i> Registrar Alarma`;
    modal.show();
  });

  // file → preview
  inputImg.addEventListener("change", (e)=>{
    FILE_SELECTED = e.target.files?.[0] || null;
    if (FILE_SELECTED) setPreview(FILE_SELECTED);
    else setPreview(imgPreview.dataset.url || null);
  });

  // búsqueda
  SearchInput.addEventListener("input", (e)=>{
    searchQuery = e.target.value || "";
    currentPage = 1;
    render();
  });

  // filtros
  const buttons = [allBtn, workingBtn, disabledBtn].filter(Boolean);
  buttons.forEach(b=>{
    b.addEventListener("click", (e)=>{
      buttons.forEach(x=>x.classList.remove("selected-option"));
      e.currentTarget.classList.add("selected-option");
      filterMode = (e.currentTarget===workingBtn) ? "working" :
                   (e.currentTarget===disabledBtn) ? "disabled" : "all";
      currentPage = 1;
      render();
    });
  });
  allBtn?.classList.add("selected-option");

  // paginación prev/next
  prevPageBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    if (currentPage>1){ currentPage--; render(); }
  });
  nextPageBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    const totalPages = Math.max(1, Math.ceil(filtered.length/perPage));
    if (currentPage<totalPages){ currentPage++; render(); }
  });

  // tabla: editar / eliminar
  tbody.addEventListener("click", async (e)=>{
    const editBtn = e.target.closest(".btn-edit");
    const delBtn  = e.target.closest(".btn-del");

    if (editBtn){
      if (!CAN_WRITE) return;
      const tr = e.target.closest("tr");
      const id = tr.dataset.id;

      try{
        const resp = await getEmergencyAlarmById(id);
        if (!resp?.status){ swalErr(resp?.message || "Alarma no encontrada"); return; }
        const a = resp.data;

        form.reset();
        Input_ID.value    = a.id_emergency_alarm;
        Input_ID.readOnly = true;
        IS_EDIT_MODE      = true;

        inputType.value     = a.type_alarm;
        inputInstall.value  = a.installation_date;
        inputLocation.value = a.id_location;

        $("#status-group")?.classList.remove("d-none");
        inputStatus.value = a.status_alarm;

        FILE_SELECTED = null;
        imgPreview.dataset.url = a.img_alarm || "";
        setPreview(imgPreview.dataset.url || null);

        TitleModal.textContent = "Editar Alarma de Emergencia";
        btnSaveForm.innerHTML  = `<i class="fas fa-save me-2"></i> Actualizar Alarma`;
        modal.show();
      }catch{ swalErr("No se pudo abrir para editar."); }
    }

    if (delBtn){
      if (!CAN_WRITE) return;
      const tr = e.target.closest("tr");
      const id = tr.dataset.id;

      const ok = await swalAsk("¿Eliminar alarma?", "Esta acción no se puede deshacer.");
      if (!ok.isConfirmed) return;

      try{
        const r = await DeleteEmergencyAlarm(id);
        if (r?.success===false) throw new Error(r.message || "Error al eliminar");
        await swalOK("Alarma eliminada.");
        await updateDashboardCards();
        await loadAlarms();
        render();
      }catch(err){ swalErr(err.message || "No se pudo eliminar"); }
    }
  });

  // submit crear/editar
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if (!CAN_WRITE) return;

    const isEditing = IS_EDIT_MODE;

    const id_emergency_alarm = Input_ID.value.trim();
    const type_alarm         = inputType.value.trim();
    const installation_date  = inputInstall.value;
    const id_location        = inputLocation.value;
    const status_alarm       = isEditing ? (inputStatus.value || "FUNCIONANDO") : "FUNCIONANDO";

    if (!id_emergency_alarm || !type_alarm || !installation_date || !id_location){
      swalErr("Completa todos los campos requeridos."); return;
    }

    try{
      // subir imagen si hay nueva
      let imgUrl = imgPreview.dataset.url || null;
      if (FILE_SELECTED){
        const up = await UploadImage(FILE_SELECTED, { type: "emergency_alarm" });
        if (!up || up.success===false) throw new Error(up?.message || "Error al subir imagen");
        imgUrl = up.data;
      }

      const payload = {
        id_emergency_alarm,
        type_alarm,
        installation_date,
        img_alarm: imgUrl,
        id_location,
        status_alarm
      };

      if (isEditing){
        const r = await UpdatedEmergencyAlarm(id_emergency_alarm, payload);
        if (r?.success===false) throw new Error(r.message || "Error al actualizar");
        await swalOK("Alarma actualizada.");
      } else {
        const r = await InsertNewEmergencyAlarm(payload);
        if (r?.success===false) throw new Error(r.message || "Error al registrar");
        await swalOK("Alarma registrada.");
      }

      modal.hide();
      FILE_SELECTED = null;
      imgPreview.dataset.url = "";
      IS_EDIT_MODE = false;

      await updateDashboardCards();
      await loadAlarms();
      currentPage = 1;
      render();

    }catch(err){ swalErr(err.message || "Ocurrió un error"); }
  });

  // máscara ID (si algún día lo habilitas manual)
  Input_ID.addEventListener("input", (e)=>{
    let v = e.target.value;
    if (!v.startsWith("ALRM-")) v = "ALRM-"+v.replace(/^ALRM-?/, "");
    let numbers = v.replace("ALRM-","").replace(/[^0-9]/g,'').slice(0,3);
    e.target.value = "ALRM-"+numbers;
  });
}

/* =========================================================
   Arranque
   ========================================================= */
document.addEventListener("DOMContentLoaded", async ()=>{
  await loadAuthAndGate();
  if (!CAN_SEE) return;

  await loadLocationsCombo();
  await loadAlarms();

  // defaults
  searchQuery = "";
  filterMode  = "all";
  currentPage = 1;

  wireEvents();
  render();

  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape" && modalEl.classList.contains("show")) modal.hide();
  });

  updateDashboardCards().catch(()=>{});
});

/* =========================================================
   Tarjetas dashboard
   ========================================================= */
async function updateDashboardCards(){
  const totalEl    = document.querySelector("#TotalAlarmCard .card-title");
  const workingEl  = document.querySelector("#WorkingAlarmCard .card-title");
  const disabledEl = document.querySelector("#ExpiredAlarmCard .card-title"); // “Desactivadas”

  try{
    const list = await getAllEmergencyAlarm();
    if (!list?.length){
      totalEl.textContent = workingEl.textContent = disabledEl.textContent = "0";
      return;
    }
    const total    = list.length;
    const working  = list.filter(a=>a.status_alarm==="FUNCIONANDO").length;
    const disabled = list.filter(a=>a.status_alarm!=="FUNCIONANDO").length;

    totalEl.textContent    = total;
    workingEl.textContent  = working;
    disabledEl.textContent = disabled;
  }catch{
    totalEl.textContent = workingEl.textContent = disabledEl.textContent = "—";
  }
}
