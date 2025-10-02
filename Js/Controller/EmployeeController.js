
import {
  getPageEmployee,
  RegisterNewEmployeeAndUser,
  UpdateEmployeeAndUser,
  DeleteEmployeeAndUser,
  GetALlRolForUser,
  UploadImage
} from "../Service/EmployeeService.js";

import { getAllDepartment } from "../Service/DepartmentService.js";
import { AuthStatus } from "../Service/AuthService.js";

/* ---------- helpers UI ---------- */
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const swalOK  = (t) => Swal.fire({icon:'success', title:'Éxito', text:t, timer:1400, showConfirmButton:false});
const swalErr = (t) => Swal.fire({icon:'error', title:'Ups...', text:t});
const swalAsk = (t='¿Eliminar empleado?', d='Esta acción no se puede deshacer.') =>
  Swal.fire({icon:'warning', title:t, text:d, showCancelButton:true, confirmButtonColor:'#d33', cancelButtonText:'Cancelar', confirmButtonText:'Eliminar'});

/* ---------- estado ---------- */
let AUTH = null;
let CAN_SEE = false;
let CAN_WRITE = false;

let employees = [];   // página actual (para render)
let totalPages = 1;
let currentPage = 0;  // backend es 0-based
const pageSize = 8;

let FILE_SELECTED = null;
let IS_EDIT_MODE = false;

let searchQuery = "";
let filterMode  = "all"; // all | active | inactive

/* ---------- elementos ---------- */
const tbody           = $("#EmpleadosTableBody");
const btnAdd          = $("#openFormBtn");
const modalEl         = $("#employeeModal");
const modal           = new bootstrap.Modal(modalEl);
const form            = $("#employeeForm");

const inpNit          = $("#NIT_Employee");
const inpFirst        = $("#first_name");
const inpLast         = $("#last_name");
const inpBirth        = $("#birthday");
const inpEmail        = $("#email");
const inpPass         = $("#password");
const selDept         = $("#id_department");
const selState        = $("#state_employee");
const selRol          = $("#id_rol");
const imgHidden       = $("#img_user");
const imgPreview      = $("#previewImage");
const fileInput       = $("#photo");

const TitleModalLabel = $("#TitleModalLabel");
const saveBtn         = $("#saveButton");

const OptionsSection  = $("#Options");
const DataSection     = $("#DataEmployee");
const WelcomeSection  = $("#Welcome");
const SearchInput     = $("#Search");

const allBtn          = $("#AllOptions");
const activeBtn       = $("#ActiveEmployee");
const inactiveBtn     = $("#DesactiveEmployee");

const prevPageBtn     = $("#prevPageBtn");
const nextPageBtn     = $("#nextPageBtn");
const paginationNums  = $("#paginationNumbers");

let NoAccessMsg       = $("#NoAccessMsg");

/* =========================================================
   Auth / permisos
   ========================================================= */
async function loadAuthAndGate(){
  try{
    const raw = await AuthStatus();         // {ok,status,data:{...}} ó payload directo
    const u   = raw?.data ?? raw ?? {};

    const norm = (s) => String(s ?? "")
      .normalize("NFD").replace(/\p{Diacritic}/gu,"").trim().toLowerCase();

    const role      = norm(u.role);
    const committee = norm(u.committeeRole);

    const isAdmin = ["administrador","admin","administrator"].includes(role);
    const isUser  = ["usuario","user"].includes(role);
    const hasCommitteePower = ["presidente","vicepresidente","secretario"].includes(committee);

    CAN_WRITE = isAdmin || (isUser && hasCommitteePower);
    CAN_SEE   = CAN_WRITE;

    if (!CAN_SEE){
      OptionsSection?.classList.add("d-none");
      DataSection?.classList.add("d-none");
      btnAdd?.classList.add("d-none");
      NoAccessMsg?.classList.remove("d-none");
    }else{
      OptionsSection?.classList.remove("d-none");
      DataSection?.classList.remove("d-none");
      NoAccessMsg?.classList.add("d-none");
      if (CAN_WRITE) btnAdd?.classList.remove("d-none");
      else btnAdd?.classList.add("d-none");
    }
  }catch(e){
    CAN_SEE=false; CAN_WRITE=false;
    OptionsSection?.classList.add("d-none");
    DataSection?.classList.add("d-none");
    btnAdd?.classList.add("d-none");
    NoAccessMsg?.classList.remove("d-none");
    console.warn("AuthStatus falló:", e);
  }
}

/* =========================================================
   Cargas de combos
   ========================================================= */
async function loadCombos(){
  try{
    // departamentos
    const deps = await getAllDepartment();
    selDept.innerHTML = `<option value="" selected disabled>Selecciona el departamento que pertenece</option>` +
      deps.map(d => `<option value="${d.id_department}">${d.name_department}</option>`).join("");

    // roles
    const rols = await GetALlRolForUser();
    selRol.innerHTML = rols.map(r => `<option value="${r.ID_ROL}">${r.NAME_ROL}</option>`).join("");
  }catch(err){
    console.error("Error combos:", err);
    selDept.innerHTML = `<option value="">Error al cargar</option>`;
    selRol.innerHTML  = `<option value="">Error al cargar</option>`;
  }
}

/* =========================================================
   Tabla paginada
   ========================================================= */
function applyFiltersInMemory(list){
  const q = (searchQuery||"").toLowerCase().trim();
  return (list||[]).filter(e => {
    let ok = true;
    if (filterMode==="active")   ok = (e.state_employee === "TRUE");
    if (filterMode==="inactive") ok = (e.state_employee !== "TRUE");
    if (!ok) return false;

    if (!q) return true;
    return (
      (e.nit_employee||"").toLowerCase().includes(q) ||
      (e.first_name||"").toLowerCase().includes(q)  ||
      (e.last_name||"").toLowerCase().includes(q)   ||
      (e.email||"").toLowerCase().includes(q)       ||
      (e.id_department||"").toLowerCase().includes(q)
    );
  });
}

async function loadPage(){
  try{
    const resp = await getPageEmployee(currentPage, pageSize);
    // resp => { status, message, data:{ content, totalPages, ... } }
    const data = resp?.data ?? {};
    totalPages = Math.max(1, data.totalPages ?? 1);
    employees  = data.content ?? [];

    renderTable();
    renderPagination();
  }catch(err){
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Error al cargar empleados.</td></tr>`;
  }
}

function renderTable(){
  const list = applyFiltersInMemory(employees);
  tbody.innerHTML = "";
  if (!list.length){
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Sin resultados</td></tr>`;
    return;
  }

  list.forEach(e => {
    const tr = document.createElement("tr");
    tr.dataset.id    = e.nit_employee?.replace(/-/g,"") || "";
    tr.dataset.email = e.email || "";
    tr.innerHTML = `
      <td class="px-3 text-center extintor-image-cell">
        <img src="${e.img_user || 'https://placehold.co/80x52'}" class="extintor-image" alt="Imagen_Usuario">
      </td>
      <td class="px-3 fw-bold text-muted">#${formatNit(e.nit_employee)}</td>
      <td class="px-3">${e.first_name || ''}</td>
      <td class="px-3">${e.last_name || ''}</td>
      <td class="px-3">${e.email || ''}</td>
      <td class="px-3">${e.state_employee || ''}</td>
      <td class="px-3">${e.role_name || e.id_rol || ''}</td>
      <td class="px-3">
        ${ CAN_WRITE ? `
          <a href="#" class="action-btn me-2 btn-edit" title="Editar"><i class="fa-solid fa-pen-to-square"></i></a>
          <a href="#" class="action-btn text-danger btn-del" title="Eliminar"><i class="fa-solid fa-trash-can"></i></a>
        ` : `<span class="text-muted small">—</span>` }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPagination(){
  // controles prev/next
  prevPageBtn.classList.toggle("disabled", currentPage===0);
  nextPageBtn.classList.toggle("disabled", currentPage>=totalPages-1);

  // números
  paginationNums.innerHTML = "";
  const max = 5;
  let start = Math.max(0, currentPage - Math.floor(max/2));
  let end   = Math.min(totalPages-1, start + max - 1);
  if (end - start + 1 < max) start = Math.max(0, end - max + 1);

  if (start > 0) {
    const li = document.createElement("li");
    li.className = "page-item disabled";
    li.innerHTML = `<a class="page-link" href="#">...</a>`;
    paginationNums.appendChild(li);
  }

  for (let i=start; i<=end; i++){
    const li = document.createElement("li");
    li.className = `page-item ${i===currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i+1}</a>`;
    li.addEventListener("click", (ev)=>{
      ev.preventDefault();
      if (i!==currentPage){ currentPage = i; loadPage(); }
    });
    paginationNums.appendChild(li);
  }

  if (end < totalPages-1) {
    const li = document.createElement("li");
    li.className = "page-item disabled";
    li.innerHTML = `<a class="page-link" href="#">...</a>`;
    paginationNums.appendChild(li);
  }
}

/* =========================================================
   Eventos UI
   ========================================================= */
function wireEvents(){
  // abrir modal (nuevo)
  btnAdd.addEventListener("click", ()=>{
    if(!CAN_WRITE) return;

    form.reset();
    FILE_SELECTED = null;
    IS_EDIT_MODE  = false;
    imgPreview.src = "https://placehold.co/180x140?text=Foto";
    imgHidden.value = "";

    // crear: oculto Estado y Rol
    $("#state-wrapper")?.classList.add("d-none");
    $("#rol-wrapper")?.classList.add("d-none");

    TitleModalLabel.textContent = "REGISTRO DE EMPLEADO";
    saveBtn.innerHTML = `<i class="fas fa-save me-2"></i> Registrar Empleado`;

    // habilito NIT y Email
    inpNit.readOnly   = false;
    inpEmail.readOnly = false;
    modal.show();
  });

  // archivo → preview
  fileInput.addEventListener("change", (e)=>{
    FILE_SELECTED = e.target.files?.[0] || null;
    if (!FILE_SELECTED) {
      imgPreview.src = "https://placehold.co/180x140?text=Foto";
      return;
    }
    const r = new FileReader();
    r.onload = () => imgPreview.src = r.result;
    r.readAsDataURL(FILE_SELECTED);
  });

  // click en la imagen para seleccionar
  imgPreview.addEventListener("click", ()=> fileInput.click());

  // búsqueda
  SearchInput.addEventListener("input", (e)=>{
    searchQuery = e.target.value || "";
    renderTable();  // filtramos la página cargada
  });

  // filtros
  const buttons = [allBtn, activeBtn, inactiveBtn].filter(Boolean);
  buttons.forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      buttons.forEach(b=>b.classList.remove("selected-option"));
      e.currentTarget.classList.add("selected-option");
      filterMode = (e.currentTarget===activeBtn) ? "active" : (e.currentTarget===inactiveBtn) ? "inactive" : "all";
      renderTable();
    });
  });
  allBtn?.classList.add("selected-option");

  // paginación prev/next
  prevPageBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    if (currentPage>0){ currentPage--; loadPage(); }
  });
  nextPageBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    if (currentPage<totalPages-1){ currentPage++; loadPage(); }
  });

  // tabla: editar/eliminar
  tbody.addEventListener("click", async (e)=>{
    const editBtn = e.target.closest(".btn-edit");
    const delBtn  = e.target.closest(".btn-del");

    if (editBtn){
      if(!CAN_WRITE) return;
      const tr = e.target.closest("tr");
      const nit = tr.dataset.id; // sin guion

      // Busca en la página cargada
      const emp = employees.find(x => (x.nit_employee||"").replace(/-/g,"") === nit);
      if (!emp){ swalErr("Empleado no encontrado."); return; }

      form.reset();
      IS_EDIT_MODE = true;
      FILE_SELECTED = null;

      inpNit.value   = formatNit(emp.nit_employee);
      inpFirst.value = emp.first_name || "";
      inpLast.value  = emp.last_name || "";
      inpBirth.value = emp.birth_day || emp.birthday || "";
      inpEmail.value = emp.email || "";
      selDept.value  = emp.id_department || "";
      selState.value = emp.state_employee || "TRUE";
      imgHidden.value = emp.img_user || "";
      imgPreview.src = emp.img_user || "https://placehold.co/180x140?text=Foto";

      // intento pre-seleccionar rol por nombre o id
      // (si backend no devuelve role_name, se queda por id)
      const options = Array.from(selRol.options);
      const byName  = options.find(o => (o.text || "").toLowerCase() === (emp.role_name||"").toLowerCase());
      if (byName) selRol.value = byName.value;

      // edición: muestro Estado y Rol
      $("#state-wrapper")?.classList.remove("d-none");
      $("#rol-wrapper")?.classList.remove("d-none");

      TitleModalLabel.textContent = "EDITAR EMPLEADO";
      saveBtn.innerHTML = `<i class="fas fa-save me-2"></i> Actualizar Empleado`;

      // bloquear claves
      inpNit.readOnly   = true;
      inpEmail.readOnly = true;

      modal.show();
    }

    if (delBtn){
      if(!CAN_WRITE) return;
      const tr = e.target.closest("tr");
      const nit = tr.dataset.id;

      const ok = await swalAsk();
      if (!ok.isConfirmed) return;
      try{
        const r = await DeleteEmployeeAndUser(nit);
        if (r?.success === false) throw new Error(r.message || "Error al eliminar");
        await swalOK("Empleado eliminado.");
        await loadPage();
      }catch(err){ swalErr(err.message || "No se pudo eliminar"); }
    }
  });

  // submit crear/editar
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(!CAN_WRITE) return;

    // Validaciones ligeras
    const nitRaw = (inpNit.value || "").replace(/[^0-9]/g,"");
    if (nitRaw.length !== 9){ swalErr("El NIT debe contener 9 dígitos."); return; }

    const email = (inpEmail.value || "").trim().toLowerCase();
    if (!email.endsWith("@gmail.com") && !email.endsWith("@ricaldone.edu.sv")){
      swalErr("El correo debe terminar en @gmail.com o @ricaldone.edu.sv"); return;
    }

    // subir imagen si hay
    let imgUrl = imgHidden.value || "";
    if (FILE_SELECTED){
      try{
        const up = await UploadImage(FILE_SELECTED, { type:"employee" });
        if (!up || up.success===false) throw new Error(up?.message || "Error al subir imagen");
        imgUrl = up.data;
      }catch(err){ swalErr(err.message || "No se pudo subir la foto"); return; }
    }

    // id_rol por defecto a "Usuario" cuando creamos
    let rolId = selRol.value;
    if (!IS_EDIT_MODE){
      const optUsuario = Array.from(selRol.options).find(o => (o.text||"").trim().toLowerCase()==="usuario");
      rolId = optUsuario ? optUsuario.value : (rolId || 2);
    }

    const payloadCreate = {
      nit_employee: formatNitToServer(inpNit.value),
      first_name:   inpFirst.value.trim(),
      last_name:    inpLast.value.trim(),
      birth_day:    inpBirth.value,
      email:        email,
      id_department: selDept.value,
      state_employee: "TRUE",                    // por defecto en creación
      password:     inpPass.value,               // SIN generación automática
      img_user:     imgUrl || "https://placehold.co/300x300",
      id_rol:       parseInt(rolId,10)
    };

    const payloadUpdate = {
      first_name:   inpFirst.value.trim(),
      last_name:    inpLast.value.trim(),
      birth_day:    inpBirth.value,
      email:        email,
      id_department: selDept.value,
      img_user:     imgUrl || "https://placehold.co/300x300",
      id_rol:       parseInt(selRol.value || rolId,10)
    };

    try{
      if (IS_EDIT_MODE){
        const r = await UpdateEmployeeAndUser(nitRaw, payloadUpdate);
        if (r?.success===false) throw new Error(r.message || "Error al actualizar");
        await swalOK("Empleado actualizado.");
      }else{
        const r = await RegisterNewEmployeeAndUser(payloadCreate);
        if (r?.success===false) throw new Error(r.message || "Error al registrar");
        await swalOK("Empleado registrado.");
      }
      modal.hide();
      FILE_SELECTED = null;
      await loadPage();
    }catch(err){ swalErr(err.message || "Ocurrió un error"); }
  });

  // máscara NIT
  inpNit.addEventListener("input", (e)=>{
    let v = e.target.value.replace(/[^0-9]/g,'');
    if (v.length > 9) v = v.slice(0,9);
    if (v.length > 8) v = v.slice(0,8) + "-" + v.slice(8);
    e.target.value = v;
  });
}

/* =========================================================
   Utils
   ========================================================= */
function formatNit(nit){ if(!nit) return ""; const s = nit.replace(/[^0-9]/g,''); return s.length===9 ? `${s.slice(0,8)}-${s.slice(8)}` : nit; }
function formatNitToServer(nit){ return (nit||"").replace(/[^0-9]/g,''); }

/* =========================================================
   Arranque
   ========================================================= */
document.addEventListener("DOMContentLoaded", async ()=>{
  await loadAuthAndGate();
  if (!CAN_SEE) return;

  await loadCombos();
  wireEvents();

  // defaults
  currentPage = 0;
  searchQuery = "";
  filterMode  = "all";

  await loadPage();
});
