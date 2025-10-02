// SmokeDetectorController.js
import {
  getAllSmokeDetector,
  InsertNewSmokeDetector,
  getSmokeDetectorById,
  UploadImage,
  UpdateSmokeDetector,
  DeleteSmokeDetector,
} from "../Service/SmokeDetectorService.js";

import { AuthStatus } from "../Service/AuthService.js";
import { getAllLocation } from "../Service/LocationService.js";

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

let detectors = [];     // lista completa
let filtered = [];      // lista filtrada
let currentPage = 1;
const perPage = 8;

let FILE_SELECTED = null;   // file del modal
let IS_EDIT_MODE = false;   // flag crear/editar

// filtros
let filterMode = "all";     // all | disabled | working
let searchQuery = "";

/* -------------------- elementos -------------------- */
const tbody           = $("#SmokeDetectorTableBody");
const btnAdd          = $("#openFormBtn");
const modalEl         = $("#SmokeDetectorModal");
const modal           = new bootstrap.Modal(modalEl);
const form            = $("#SmokeDetectorForm");

const Input_ID        = $("#ID_SmokeDetector");
const inputType       = $("#TypeSmokeDetector");
const inputEnergy     = $("#EnergySource");
const inputInstall    = $("#DateInstalation");
const inputExpire     = $("#DateExpiration");
const inputLocation   = $("#TypeLocation_CMB");
const inputStatus     = $("#Status_CMB");
const inputImg        = $("#ZoneIMG");
const imgPreview      = $("#departamentoImagePreview");

const titleModal      = $("#SmokeDetectorModalLabel");
const btnSaveForm     = $("#saveButton");

const OptionsSection  = $("#Options");
const DataSection     = $("#Data");
const WelcomeSection  = $("#Welcome");
const SearchInput     = $("#Search");

const allBtn          = $("#AllOptions");
const disabledBtn     = $("#DetectorDisabled");
const workingBtn      = $("#DetectorWorking");

const prevPageBtn     = $("#prevPageBtn");
const nextPageBtn     = $("#nextPageBtn");
const pagerNumbers    = $("#paginationNumbers");

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
    const raw = await AuthStatus();       // {ok,status,data:{...}} o directamente payload
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
    CAN_SEE   = CAN_WRITE; // igual que Zonas/Extintores: full o nada

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
/** Siguiente SMKDT-### rellenando huecos */
function nextSmkId(existing){
  const nums = []; let maxDigits = 3;
  (existing||[]).forEach(id=>{
    const m = /^SMKDT-(\d+)$/.exec(id||"");
    if(m){ nums.push(parseInt(m[1],10)); maxDigits = Math.max(maxDigits, m[1].length); }
  });
  if(!nums.length) return `SMKDT-${pad(1,maxDigits)}`;
  nums.sort((a,b)=>a-b);
  let next=1;
  for(let i=0;i<nums.length;i++){
    if(nums[i]===next) next++;
    else if(nums[i]>next) break;
  }
  return `SMKDT-${pad(next,maxDigits)}`;
}

/** preview imagen */
function setPreview(fileOrUrl){
  if(!fileOrUrl){ imgPreview.src="https://placehold.co/120x120?text=IMG"; return; }
  if(typeof fileOrUrl === "string"){ imgPreview.src = fileOrUrl; return; }
  const r = new FileReader();
  r.onload = () => imgPreview.src = r.result;
  r.readAsDataURL(fileOrUrl);
}

/** fila en tabla (acciones condicionadas) */
function createRow(d){
  const tr = document.createElement("tr");
  tr.dataset.id  = d.id_smoke_detector;
  tr.dataset.img = d.img_detector || "";

  const actions = CAN_WRITE
    ? `<a href="#" class="action-btn me-2 btn-edit" title="Editar"><i class="fa-solid fa-pen-to-square"></i></a>
       <a href="#" class="action-btn text-danger btn-del" title="Eliminar"><i class="fa-solid fa-trash-can"></i></a>`
    : `<span class="text-muted small">—</span>`;

  tr.innerHTML = `
    <td class="px-3 text-center extintor-image-cell">
      <img src="${d.img_detector || 'https://placehold.co/80x52'}" alt="Imagen_Detector" class="extintor-image">
    </td>
    <td class="px-3 fw-bold text-muted">#${d.id_smoke_detector}</td>
    <td class="px-3">${d.type_detector}</td>
    <td class="px-3">${d.expiration_date}</td>
    <td class="px-3">${d.status_detector}</td>
    <td class="px-3">${d.energy_source}</td>
    <td class="px-3">${d.id_location}</td>
    <td class="px-3">${d.installation_date}</td>
    <td class="px-3">${actions}</td>
  `;
  return tr;
}

/** aplica filtro + búsqueda */
function applyFilters(){
  const q = (searchQuery || "").toLowerCase().trim();
  filtered = (detectors||[]).filter(d=>{
    let ok = true;
    if (filterMode === "working")  ok = (d.status_detector === "FUNCIONANDO");
    if (filterMode === "disabled") ok = (d.status_detector !== "FUNCIONANDO");
    if (!ok) return false;

    if (!q) return true;
    return (
      (d.id_smoke_detector||"").toLowerCase().includes(q) ||
      (d.type_detector||"").toLowerCase().includes(q) ||
      (d.status_detector||"").toLowerCase().includes(q) ||
      (d.energy_source||"").toLowerCase().includes(q) ||
      (d.id_location||"").toLowerCase().includes(q)
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
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Sin resultados</td></tr>`;
  } else {
    pageItems.forEach(d => tbody.appendChild(createRow(d)));
  }

  // paginadores
  pagerNumbers.innerHTML = "";
  for (let i=1; i<=totalPages; i++){
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
    if (!locs?.length) {
      inputLocation.innerHTML = `<option value="">No hay Ubicaciones disponibles</option>`;
      return;
    }
    inputLocation.innerHTML = `<option selected disabled value="">Selecciona la Ubicación...</option>` +
      locs.map(l=>`<option value="${l.id_location}">${l.name_location}</option>`).join("");
  }catch{
    inputLocation.innerHTML = `<option value="">Error al cargar Ubicaciones</option>`;
  }
}
async function loadDetectors(){
  try{ detectors = await getAllSmokeDetector(); }
  catch{ detectors = []; }
}

/* =========================================================
   Eventos UI
   ========================================================= */
function wireEvents(){
  // nuevo
  btnAdd.addEventListener("click", async ()=>{
    if(!CAN_WRITE) return;
    await loadDetectors();                  // para ID secuencial

    form.reset();
    FILE_SELECTED = null;
    setPreview(null);
    imgPreview.dataset.url = "";

    Input_ID.value    = nextSmkId(detectors.map(d=>d.id_smoke_detector));
    Input_ID.readOnly = true;
    IS_EDIT_MODE      = false;

    // oculto estado en creación
    $("#status-group")?.classList.add("d-none");

    titleModal.textContent = "Registrar Nuevo Detector";
    btnSaveForm.innerHTML  = `<i class="fas fa-save me-2"></i> Registrar Detector`;
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
  const buttons = [allBtn, disabledBtn, workingBtn].filter(Boolean);
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

  // tabla: editar/eliminar
  tbody.addEventListener("click", async (e)=>{
    const editBtn = e.target.closest(".btn-edit");
    const delBtn  = e.target.closest(".btn-del");

    if (editBtn){
      if(!CAN_WRITE) return;
      const tr = e.target.closest("tr");
      const id = tr.dataset.id;

      try{
        const resp = await getSmokeDetectorById(id);
        if (!resp?.status){ swalErr(resp?.message || "Detector no encontrado"); return; }
        const d = resp.data;

        form.reset();
        Input_ID.value    = d.id_smoke_detector;
        Input_ID.readOnly = true;
        IS_EDIT_MODE      = true;

        inputType.value     = d.type_detector;
        inputEnergy.value   = d.energy_source;
        inputInstall.value  = d.installation_date;
        inputExpire.value   = d.expiration_date;
        inputLocation.value = d.id_location;

        $("#status-group")?.classList.remove("d-none");
        inputStatus.value = d.status_detector;

        FILE_SELECTED = null;
        imgPreview.dataset.url = d.img_detector || "";
        setPreview(imgPreview.dataset.url || null);

        titleModal.textContent = "Editar Detector";
        btnSaveForm.innerHTML  = `<i class="fas fa-save me-2"></i> Actualizar Detector`;
        modal.show();
      }catch{ swalErr("No se pudo abrir para editar."); }
    }

    if (delBtn){
      if(!CAN_WRITE) return;
      const tr = e.target.closest("tr");
      const id = tr.dataset.id;

      const ok = await swalAsk("¿Eliminar detector?", "Esta acción no se puede deshacer.");
      if (!ok.isConfirmed) return;

      try{
        const r = await DeleteSmokeDetector(id);
        if (r?.success===false) throw new Error(r.message || "Error al eliminar");
        await swalOK("Detector eliminado.");
        await updateDashboardCards();
        await loadDetectors();
        render();
      }catch(err){ swalErr(err.message || "No se pudo eliminar"); }
    }
  });

  // submit crear/editar
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(!CAN_WRITE) return;

    const isEditing = IS_EDIT_MODE;

    const id_smoke_detector = Input_ID.value.trim();
    const type_detector     = inputType.value.trim();
    const energy_source     = inputEnergy.value.trim();
    const installation_date = inputInstall.value;
    const expiration_date   = inputExpire.value;
    const id_location       = inputLocation.value;
    const status_detector   = isEditing ? (inputStatus.value || "FUNCIONANDO") : "FUNCIONANDO";

    if(!id_smoke_detector || !type_detector || !energy_source || !installation_date || !expiration_date || !id_location){
      swalErr("Completa todos los campos requeridos."); return;
    }

    try{
      // subir imagen si hay nueva
      let imgUrl = imgPreview.dataset.url || null;
      if (FILE_SELECTED){
        const up = await UploadImage(FILE_SELECTED, { type:"smoke_detector" });
        if (!up || up.success===false) throw new Error(up?.message || "Error al subir imagen");
        imgUrl = up.data;
      }

      const payload = {
        id_smoke_detector,
        type_detector,
        energy_source,
        installation_date,
        expiration_date,
        img_detector: imgUrl,
        id_location,
        status_detector
      };

      if (isEditing){
        const r = await UpdateSmokeDetector(id_smoke_detector, payload);
        if (r?.success===false) throw new Error(r.message || "Error al actualizar");
        await swalOK("Detector actualizado.");
      } else {
        const r = await InsertNewSmokeDetector(payload);
        if (r?.success===false) throw new Error(r.message || "Error al registrar");
        await swalOK("Detector registrado.");
      }

      modal.hide();
      FILE_SELECTED = null;
      imgPreview.dataset.url = "";
      IS_EDIT_MODE = false;

      await updateDashboardCards();
      await loadDetectors();
      currentPage = 1;
      render();

    }catch(err){ swalErr(err.message || "Ocurrió un error"); }
  });

  // máscara ID (si algún día lo habilitas)
  Input_ID.addEventListener("input", (e)=>{
    let v = e.target.value;
    if(!v.startsWith("SMKDT-")) v = "SMKDT-"+v.replace(/^SMKDT-?/, "");
    let numbers = v.replace("SMKDT-","").replace(/[^0-9]/g,'').slice(0,3);
    e.target.value = "SMKDT-"+numbers;
  });
}

/* =========================================================
   Arranque
   ========================================================= */
document.addEventListener("DOMContentLoaded", async ()=>{
  await loadAuthAndGate();
  if (!CAN_SEE) return;

  await loadLocationsCombo();
  await loadDetectors();

  // defaults
  searchQuery = "";
  filterMode  = "all";
  currentPage = 1;

  wireEvents();
  render();

  document.addEventListener("keydown", (e)=>{
    if (e.key==="Escape" && modalEl.classList.contains("show")) modal.hide();
  });

  updateDashboardCards().catch(()=>{});
});

/* =========================================================
   Tarjetas dashboard
   ========================================================= */
async function updateDashboardCards(){
  const totalEl   = document.querySelector("#TotalSmokeDetectorCard .card-title");
  const workEl    = document.querySelector("#WorkingSmokeDetectorCard .card-title");
  const disabledEl= document.querySelector("#ExpiredSmokeDetectorCard .card-title"); // etiqueta “vencidos” en UI, aquí tratamos como “no funcionando”

  try{
    const list = await getAllSmokeDetector();
    if (!list?.length){
      totalEl.textContent = "0";
      workEl.textContent = "0";
      disabledEl.textContent = "0";
      return;
    }
    const total    = list.length;
    const working  = list.filter(d=>d.status_detector==="FUNCIONANDO").length;
    const disabled = list.filter(d=>d.status_detector!=="FUNCIONANDO").length;

    totalEl.textContent    = total;
    workEl.textContent     = working;
    disabledEl.textContent = disabled;
  }catch{
    totalEl.textContent = workEl.textContent = disabledEl.textContent = "—";
  }
}
