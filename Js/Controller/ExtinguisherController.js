import {
  getAllExtinguisher,
  InsertNewExtinguisher,
  UpdatedExtinguisher,
  DeleteExtinguisher,
  getExtinguisherById,
  UploadImage,
} from "../Service/ExtinguisherService.js";

import { AuthStatus } from "../Service/AuthService.js";
import { getAllLocation } from "../Service/LocationService.js";

/* -------------------- helpers -------------------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const swalOK  = (msg) => Swal.fire({ icon:'success', title:'Éxito', text:msg, timer:1400, showConfirmButton:false });
const swalErr = (msg) => Swal.fire({ icon:'error', title:'Ups...', text:msg });
const swalAsk = (t='¿Eliminar?', d='Esta acción no se puede deshacer.') =>
  Swal.fire({ icon:'warning', title:t, text:d, showCancelButton:true, confirmButtonColor:'#d33', cancelButtonText:'Cancelar', confirmButtonText:'Eliminar' });

/* -------------------- estado -------------------- */
let AUTH = null;
let CAN_SEE = false;   // ver la página
let CAN_WRITE = false; // crear/editar/eliminar

let extinguisherList = []; // lista completa (para filtros/ID secuencial)
let filteredList = [];     // resultado de filtros+búsqueda

let currentPage = 1;
const itemsPerPage = 5;

let FILE_SELECTED = null;  // file imagen modal
let IS_EDIT_MODE = false;  // <--- flag para distinguir Crear vs Editar

// filtros
let filterMode = "all";  // all | expired | good
let searchQuery = "";

/* -------------------- elementos -------------------- */
const tbody            = $("#extintoresTableBody");
const btnAddExtinguisher = $("#openFormBtn");
const modalEl          = $("#ExtinguisherModal");
const modal            = new bootstrap.Modal(modalEl);
const form             = $("#ExtinguisherForm");

const Input_ID         = $("#ID_Extinguisher");
const titleModal       = $("#ExtinguisherModalLabel");
const btnSaveForm      = $("#saveButton");
const inputType        = $("#TypeExtinguisher");
const inputDate        = $("#DateExpiration");
const inputStatus      = $("#Status_CMB");
const inputLocation    = $("#TypeLocation_CMB");
const inputImg         = $("#ZoneIMG");
const imagePreview     = $("#departamentoImagePreview");

const OptionsSection   = $("#Options");
const DataSection      = $("#Data");
const WelcomeSection   = $("#Welcome");
const SearchInput      = $("#Search");

const allOptionsBtn    = $("#AllOptions");
const expiredOptionsBtn= $("#ExtinguisherExpiration");
const goodOptionsBtn   = $("#ExtinguisherGood");

const prevPageBtn      = $("#prevPageBtn");
const nextPageBtn      = $("#nextPageBtn");
const paginationNumbersContainer = $("#paginationNumbers");

/* Si no existe #NoAccessMsg en el HTML, lo creamos y lo insertamos */
let NoAccessMsg = $("#NoAccessMsg");
if (!NoAccessMsg) {
  NoAccessMsg = document.createElement("div");
  NoAccessMsg.id = "NoAccessMsg";
  NoAccessMsg.className = "text-center text-muted d-none py-5";
  NoAccessMsg.textContent = "No tienes acceso para ver esta información.";
  WelcomeSection?.insertAdjacentElement("afterend", NoAccessMsg);
}

/* =========================================================
   Permisos con AuthStatus
   ========================================================= */
async function loadAuthAndGate() {
  try {
    const raw = await AuthStatus();          // puede venir {ok,status,data:{...}} o directamente el payload
    const u   = raw?.data ?? raw ?? {};

    // normaliza: minúsculas y sin tildes
    const norm = (s) =>
      String(s ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .toLowerCase();

    const role      = norm(u.role);             // "administrador" | "usuario" | ...
    const committee = norm(u.committeeRole);    // "inspector", "presidente", etc.

    const isAdmin = ["administrador","admin","administrator"].includes(role);
    const isUser  = ["usuario","user"].includes(role);
    const hasCommitteePower = ["presidente","vicepresidente","secretario"].includes(committee);

    // Para esta vista: sólo full acceso o nada (igual que Zonas)
    CAN_WRITE = isAdmin || (isUser && hasCommitteePower);
    CAN_SEE   = CAN_WRITE;

    if (!CAN_SEE) {
      OptionsSection?.classList.add("d-none");
      DataSection?.classList.add("d-none");
      btnAddExtinguisher?.classList.add("d-none");
      NoAccessMsg?.classList.remove("d-none");
    } else {
      OptionsSection?.classList.remove("d-none");
      DataSection?.classList.remove("d-none");
      NoAccessMsg?.classList.add("d-none");
      if (CAN_WRITE) btnAddExtinguisher?.classList.remove("d-none");
      else btnAddExtinguisher?.classList.add("d-none");
    }
  } catch (e) {
    CAN_SEE = false; CAN_WRITE = false;
    OptionsSection?.classList.add("d-none");
    DataSection?.classList.add("d-none");
    btnAddExtinguisher?.classList.add("d-none");
    NoAccessMsg?.classList.remove("d-none");
    console.warn("AuthStatus falló:", e);
  }
}

/* =========================================================
   Utilidades
   ========================================================= */
function pad(n, w=3){ const s = `${n}`; return s.length>=w ? s : "0".repeat(w-s.length)+s; }
/** Siguiente EXT-### rellenando huecos */
function nextExtId(existingIds){
  const nums=[]; let maxDigits=3;
  (existingIds||[]).forEach(id=>{
    const m=/^EXT-(\d+)$/.exec(id||"");
    if(m){ nums.push(parseInt(m[1],10)); maxDigits=Math.max(maxDigits,m[1].length); }
  });
  if(!nums.length) return `EXT-${pad(1,maxDigits)}`;
  nums.sort((a,b)=>a-b);
  let next=1;
  for(let i=0;i<nums.length;i++){
    if(nums[i]===next) next++;
    else if(nums[i]>next) break;
  }
  return `EXT-${pad(next,maxDigits)}`;
}

/** pinta preview desde file o desde url */
function setPreview(fileOrUrl){
  if(!fileOrUrl){ imagePreview.src="https://placehold.co/120x120?text=IMG"; return; }
  if(typeof fileOrUrl==="string"){ imagePreview.src=fileOrUrl; return; }
  const r=new FileReader();
  r.onload=()=> imagePreview.src=r.result;
  r.readAsDataURL(fileOrUrl);
}

/** fila según permisos */
function createRow(ext){
  const tr=document.createElement("tr");
  tr.dataset.id  = ext.id_extinguisher;
  tr.dataset.img = ext.img_extinguisher || "";

  const actions = CAN_WRITE
    ? `<a href="#" class="action-btn me-2 btn-edit-zone" title="Editar"><i class="fa-solid fa-pen-to-square"></i></a>
       <a href="#" class="action-btn text-danger btn-delete-zone" title="Eliminar"><i class="fa-solid fa-trash-can"></i></a>`
    : `<span class="text-muted small">—</span>`;

  tr.innerHTML = `
    <td class="px-3 text-center extintor-image-cell">
      <img src="${ext.img_extinguisher || 'https://placehold.co/80x52'}" alt="Imagen_Extintor" class="extintor-image">
    </td>
    <td class="px-3 fw-bold text-muted">#${ext.id_extinguisher}</td>
    <td class="px-3">${ext.type_extinguisher}</td>
    <td class="px-3">${ext.status_extinguisher}</td>
    <td class="px-3">${ext.expiration_date}</td>
    <td class="px-3">${ext.id_location}</td>
    <td class="px-3">${actions}</td>
  `;
  return tr;
}

/** aplica filtros + búsqueda */
function applyFilters(){
  const q=(searchQuery||"").toLowerCase().trim();
  const today=new Date(); today.setHours(0,0,0,0);

  filteredList=(extinguisherList||[]).filter(ext=>{
    // filtro por modo
    let okMode=true;
    const exp=new Date(ext.expiration_date); exp.setHours(0,0,0,0);
    if(filterMode==="expired") okMode = (exp<=today);
    if(filterMode==="good")    okMode = (ext.status_extinguisher==="FUNCIONANDO" && exp>today);
    if(!okMode) return false;

    // búsqueda
    if(!q) return true;
    return (
      (ext.id_extinguisher || "").toLowerCase().includes(q) ||
      (ext.type_extinguisher || "").toLowerCase().includes(q) ||
      (ext.status_extinguisher || "").toLowerCase().includes(q) ||
      (ext.id_location || "").toLowerCase().includes(q)
    );
  });
}

/** render tabla + paginación */
function render(){
  applyFilters();

  const totalPages = Math.max(1, Math.ceil(filteredList.length/itemsPerPage));
  if(currentPage>totalPages) currentPage=totalPages;

  const start=(currentPage-1)*itemsPerPage;
  const end=start+itemsPerPage;
  const pageItems = filteredList.slice(start,end);

  tbody.innerHTML="";
  if(!pageItems.length){
    tbody.innerHTML=`<tr><td colspan="7" class="text-center text-muted py-4">Sin resultados</td></tr>`;
  }else{
    pageItems.forEach(ext=> tbody.appendChild(createRow(ext)));
  }

  paginationNumbersContainer.innerHTML="";
  for(let i=1;i<=totalPages;i++){
    const li=document.createElement("li");
    li.className=`page-item ${i===currentPage?'active':''}`;
    li.innerHTML=`<a class="page-link" href="#">${i}</a>`;
    li.addEventListener("click",(e)=>{ e.preventDefault(); currentPage=i; render(); });
    paginationNumbersContainer.appendChild(li);
  }
  prevPageBtn.classList.toggle("disabled", currentPage===1);
  nextPageBtn.classList.toggle("disabled", currentPage===totalPages);
}

/* =========================================================
   Cargas iniciales
   ========================================================= */
async function loadLocationsCombo(){
  try{
    const locs=await getAllLocation();
    if(!locs?.length){
      inputLocation.innerHTML=`<option value="">No hay Ubicaciones disponibles</option>`;
      return;
    }
    inputLocation.innerHTML = `<option selected disabled value="">Selecciona una Ubicación...</option>` +
      locs.map(l=>`<option value="${l.id_location}">${l.name_location}</option>`).join("");
  }catch(e){
    inputLocation.innerHTML=`<option value="">Error al cargar Ubicaciones</option>`;
  }
}
async function loadExtinguishers(){
  try{ extinguisherList=await getAllExtinguisher(); }
  catch(e){ extinguisherList=[]; }
}

/* =========================================================
   Eventos UI
   ========================================================= */
function wireEvents(){
  // NUEVO
  btnAddExtinguisher.addEventListener("click", async ()=>{
    if(!CAN_WRITE) return;
    await loadExtinguishers();            // para ID secuencial
    form.reset();
    FILE_SELECTED=null;
    setPreview(null);
    imagePreview.dataset.url="";

    const nextId=nextExtId(extinguisherList.map(x=>x.id_extinguisher));
    Input_ID.value=nextId;
    Input_ID.readOnly=true;               // se mantiene lectura
    IS_EDIT_MODE=false;                   // <--- modo CREAR

    $("#status-group").style.display='none'; // estado se asigna por defecto

    titleModal.textContent="Registrar Nuevo Extintor";
    btnSaveForm.innerHTML=`<i class="fas fa-save me-2"></i> Registrar Extintor`;
    modal.show();
  });

  // file → preview
  inputImg.addEventListener("change",(e)=>{
    FILE_SELECTED = e.target.files?.[0] || null;
    if(FILE_SELECTED) setPreview(FILE_SELECTED);
    else setPreview(imagePreview.dataset.url || null);
  });

  // buscar
  SearchInput.addEventListener("input",(e)=>{
    searchQuery = e.target.value || "";
    currentPage = 1;
    render();
  });

  // filtros (visual + lógico)
  const botones=[allOptionsBtn,expiredOptionsBtn,goodOptionsBtn].filter(Boolean);
  botones.forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      botones.forEach(b=>b.classList.remove('selected-option'));
      e.currentTarget.classList.add('selected-option');
      filterMode = (e.currentTarget===expiredOptionsBtn) ? 'expired' :
                   (e.currentTarget===goodOptionsBtn) ? 'good' : 'all';
      currentPage=1;
      render();
    });
  });
  allOptionsBtn?.classList.add('selected-option');

  // paginación
  prevPageBtn.addEventListener("click",(e)=>{ e.preventDefault(); if(currentPage>1){ currentPage--; render(); } });
  nextPageBtn.addEventListener("click",(e)=>{
    e.preventDefault();
    const totalPages = Math.max(1, Math.ceil(filteredList.length/itemsPerPage));
    if(currentPage<totalPages){ currentPage++; render(); }
  });

  // editar/eliminar (delegación)
  tbody.addEventListener("click", async (e)=>{
    const editBtn = e.target.closest(".btn-edit-zone");
    const delBtn  = e.target.closest(".btn-delete-zone");

    // EDITAR
    if(editBtn){
      if(!CAN_WRITE) return;
      const row=e.target.closest("tr");
      const id=row.dataset.id;

      try{
        const resp=await getExtinguisherById(id);
        if(!resp?.status){ swalErr(resp?.message || "Extintor no encontrado"); return; }
        const ext=resp.data;

        form.reset();
        Input_ID.value=ext.id_extinguisher;
        Input_ID.readOnly=true;
        IS_EDIT_MODE=true;                         // <--- modo EDITAR

        inputType.value=ext.type_extinguisher;
        inputDate.value=ext.expiration_date;
        inputLocation.value=ext.id_location;

        $("#status-group").style.display='block';
        inputStatus.value=ext.status_extinguisher;

        FILE_SELECTED=null;
        imagePreview.dataset.url=ext.img_extinguisher || "";
        setPreview(imagePreview.dataset.url || null);

        titleModal.textContent="Editar Extintor";
        btnSaveForm.innerHTML=`<i class="fas fa-save me-2"></i> Actualizar Extintor`;
        modal.show();
      }catch(err){ swalErr("No se pudo abrir para editar."); }
    }

    // ELIMINAR
    if(delBtn){
      if(!CAN_WRITE) return;
      const row=e.target.closest("tr");
      const id=row.dataset.id;
      const ok=await swalAsk("¿Eliminar extintor?","Esta acción no se puede deshacer.");
      if(!ok.isConfirmed) return;

      try{
        const r=await DeleteExtinguisher(id);
        if(r?.success===false) throw new Error(r.message || "Error al eliminar");
        await swalOK("Extintor eliminado.");
        await updateDashboardCards();
        await loadExtinguishers();
        render();
      }catch(err){ swalErr(err.message || "No se pudo eliminar"); }
    }
  });

  // SUBMIT crear/editar
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(!CAN_WRITE) return;

    const isEditing = IS_EDIT_MODE;  // <--- usar flag, NO readOnly
    const id_extinguisher   = Input_ID.value.trim();
    const type_extinguisher = inputType.value.trim();
    const expiration_date   = inputDate.value;
    const id_location       = inputLocation.value;
    const status_extinguisher = isEditing ? (inputStatus.value || "FUNCIONANDO") : "FUNCIONANDO";

    if(!id_extinguisher || !type_extinguisher || !expiration_date || !id_location){
      swalErr("Completa todos los campos requeridos.");
      return;
    }

    try{
      // Subir imagen si hay nueva
      let imgUrl = imagePreview.dataset.url || null;
      if(FILE_SELECTED){
        const up = await UploadImage(FILE_SELECTED, { type:"extinguisher" });
        if(!up || up.success===false) throw new Error(up?.message || "Error al subir imagen");
        imgUrl = up.data;
      }

      const payload = {
        id_extinguisher,
        type_extinguisher,
        img_extinguisher: imgUrl,
        expiration_date,
        status_extinguisher,
        id_location
      };

      if(isEditing){
        const r=await UpdatedExtinguisher(id_extinguisher, payload);
        if(r?.success===false) throw new Error(r.message || "Error al actualizar");
        await swalOK("Extintor actualizado.");
      }else{
        const r=await InsertNewExtinguisher(payload);
        if(r?.success===false) throw new Error(r.message || "Error al registrar");
        await swalOK("Extintor registrado.");
      }

      modal.hide();
      FILE_SELECTED=null;
      imagePreview.dataset.url="";
      IS_EDIT_MODE=false;  // reset

      await updateDashboardCards();
      await loadExtinguishers();
      filterMode = filterMode || "all";
      currentPage=1;
      render();

    }catch(err){ swalErr(err.message || "Ocurrió un error"); }
  });

  // máscara del ID por si algún día lo habilitas manual
  Input_ID.addEventListener("input",(e)=>{
    let v=e.target.value;
    if(!v.startsWith("EXT-")) v="EXT-"+v.replace(/^EXT-?/, "");
    let numbers=v.replace("EXT-","").replace(/[^0-9]/g,'').slice(0,3);
    e.target.value="EXT-"+numbers;
  });
}

/* =========================================================
   Arranque
   ========================================================= */
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadAuthAndGate();
  if(!CAN_SEE) return;        // sin acceso, no continuamos

  await loadLocationsCombo();
  await loadExtinguishers();

  // valores iniciales
  searchQuery = "";
  filterMode  = "all";
  currentPage = 1;

  wireEvents();
  render();

  // ESC cierra modal
  document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape" && modalEl.classList.contains("show")) modal.hide();
  });

  // tarjetas
  updateDashboardCards().catch(()=>{});
});

/* =========================================================
   Tarjetas dashboard
   ========================================================= */
async function updateDashboardCards(){
  const totalExtinguishersCard   = document.querySelector("#TotalExtinguishersCard .card-title");
  const workingExtinguishersCard = document.querySelector("#WorkingExtinguishersCard .card-title");
  const expiredExtinguishersCard = document.querySelector("#ExpiredExtinguishersCard .card-title");

  try{
    const extinguishers=await getAllExtinguisher();
    if(!extinguishers?.length){
      totalExtinguishersCard.textContent="0";
      workingExtinguishersCard.textContent="0";
      expiredExtinguishersCard.textContent="0";
      return;
    }
    const total=extinguishers.length;
    const today=new Date(); today.setHours(0,0,0,0);
    const working = extinguishers.filter(x=>x.status_extinguisher==="FUNCIONANDO").length;
    const expired = extinguishers.filter(x=> new Date(x.expiration_date).setHours(0,0,0,0)<=today ).length;

    totalExtinguishersCard.textContent   = total;
    workingExtinguishersCard.textContent = working;
    expiredExtinguishersCard.textContent = expired;
  }catch{
    totalExtinguishersCard.textContent   = "—";
    workingExtinguishersCard.textContent = "—";
    expiredExtinguishersCard.textContent = "—";
  }
}
