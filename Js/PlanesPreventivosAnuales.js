/* PPA – demo con localStorage, Bootstrap5, SweetAlert y Animate.css */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const LS_PLANS = "PPA_PLANS_V1";
const LS_BANK  = "PPA_BANK_V1";

/* ===== Datos en memoria ===== */
let PLANS = [];
let BANK  = [];

/* ===== Utilidad SweetAlert ===== */
const swalOk  = (t) => Swal.fire({icon:"success", title:"Listo", text:t, confirmButtonColor:"#1aa890"});
const swalErr = (t) => Swal.fire({icon:"error", title:"Ups", text:t, confirmButtonColor:"#1aa890"});
const swalAsk = (t, tx, ok="Sí") => Swal.fire({icon:"question", title:t, text:tx, showCancelButton:true, confirmButtonText:ok, cancelButtonText:"Cancelar", confirmButtonColor:"#1aa890"});

/* ===== Seeds iniciales ===== */
(function seed(){
  const p = localStorage.getItem(LS_PLANS);
  const b = localStorage.getItem(LS_BANK);
  if (p && b){
    PLANS = JSON.parse(p); BANK = JSON.parse(b);
    return;
  }
  // Plan 2025 con actividades/acciones de ejemplo
  PLANS = [{
    year: 2025,
    activities: [
      {
        id: 1, name: "Trabajos en altura", description: "",
        actions: [
          { id: 1, title: "Inspección del Arnés", description: "Antes de usar, revisar correas, cortes o quemaduras.", state: "ACTIVO" },
          { id: 2, title: "Verificación del Punto de Anclaje", description: "Comprobar fijación antes de conectar líneas de vida.", state: "ACTIVO" },
          { id: 3, title: "Chequear Línea de Vida", description: "Verificar desgaste de cuerdas y mosquetones.", state: "DESACTIVADO" }
        ]
      },
      {
        id: 2, name: "Trabajos en Caliente", description: "",
        actions: [
          { id: 4, title: "Revisión de Escaleras", description: "Asegurar estabilidad y ausencia de fracturas.", state: "NUEVO" }
        ]
      }
    ]
  }];
  // Banco de soluciones demo
  BANK = [
    { id: 1, type: "ACTIVIDAD", name: "Trabajos en Alcantarilla", description: "Accesos, ventilación, medición de gases." },
    { id: 2, type: "ACCION",    name: "Uso obligatorio de guantes térmicos", description: "Para manipular materiales calientes.", targetActivityName: "Trabajos en Caliente" },
    { id: 3, type: "ACCION",    name: "Bloqueo/Etiquetado (LOTO)", description: "Previene energización accidental.", targetActivityName: "" }
  ];
  saveAll();
})();
function saveAll(){
  localStorage.setItem(LS_PLANS, JSON.stringify(PLANS));
  localStorage.setItem(LS_BANK,  JSON.stringify(BANK));
}

/* ===== Helpers ===== */
function activePlanYear(){
  return Number($("#planYear").textContent || 0);
}
function getPlanByYear(y){ return PLANS.find(p => p.year === Number(y)); }
function nextActivityId(plan){ return Math.max(0, ...plan.activities.map(a=>a.id)) + 1; }
function nextActionId(plan){
  const ids = plan.activities.flatMap(a => a.actions.map(x => x.id));
  return Math.max(0, ...ids) + 1;
}

/* ===== Render: Lista de años ===== */
function renderList(){
  $("#view-list").classList.remove("d-none");
  $("#view-plan").classList.add("d-none");
  $("#view-bank").classList.add("d-none");

  const box = $("#yearsContainer");
  box.innerHTML = "";
  const sorted = [...PLANS].sort((a,b)=>b.year-a.year);

  sorted.forEach(p=>{
    const div = document.createElement("div");
    div.className = "year-item animate__animated animate__fadeInUp";
    div.innerHTML = `
      <i class="bi bi-folder2 year-icon"></i>
      <button class="btn btn-link text-decoration-none p-0 fs-5" data-year="${p.year}">
        PPA-${p.year}
      </button>
    `;
    div.querySelector("button").onclick = () => openPlan(p.year);
    box.appendChild(div);
  });
}

/* ===== Abrir plan ===== */
function openPlan(year){
  $("#planYear").textContent = year;
  $("#bankYear").textContent = year;
  $("#view-list").classList.add("d-none");
  $("#view-bank").classList.add("d-none");
  $("#view-plan").classList.remove("d-none");
  $("#searchAction").value = "";
  renderPlan();
}

/* ===== Render de plan (actividades y acciones) ===== */
function renderPlan(){
  const plan = getPlanByYear(activePlanYear());
  const q = $("#searchAction").value.trim().toLowerCase();
  const wrap = $("#activitiesContainer");
  wrap.innerHTML = "";

  plan.activities.forEach(act=>{
    // filtrar por búsqueda (si no hay match, no se muestra el bloque)
    const match = (txt)=>txt && txt.toLowerCase().includes(q);
    const actions = act.actions.filter(a => {
      if (!q) return true;
      return match(a.title) || match(a.description) || match(act.name);
    });

    if (!actions.length) return;

    const block = document.createElement("div");
    block.className = "activity-block";

    block.innerHTML = `
      <div class="activity-title mb-1">
        <span class="dot"></span>
        <span>${act.name}</span>
        <div class="ms-auto d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" data-act="${act.id}" data-act-edit>
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm" data-act="${act.id}" data-act-del>
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
      <div class="activity-actions"></div>
    `;
    const grid = block.querySelector(".activity-actions");

    actions.forEach(a=>{
      const card = document.createElement("div");
      card.className = "action-card animate__animated animate__fadeInUp";
      card.innerHTML = `
        <span class="badge-state ${badgeClass(a.state)}"></span>
        <div class="action-title">${a.title}</div>
        <div class="action-desc mt-1">${a.description || ""}</div>
        <div class="action-toolbar">
          <button class="btn btn-outline-secondary" title="Editar" data-action-edit data-id="${a.id}" data-act="${act.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger" title="Eliminar" data-action-del data-id="${a.id}" data-act="${act.id}">
            <i class="bi bi-trash"></i>
          </button>
          <button class="btn btn-outline-warning" title="Activar / Desactivar" data-action-toggle data-id="${a.id}" data-act="${act.id}">
            <i class="bi bi-toggle2-on"></i>
          </button>
        </div>
        <div class="small text-muted mt-1">Estado: ${a.state}</div>
      `;
      grid.appendChild(card);
    });

    // listeners del bloque
    block.querySelector("[data-act-edit]").onclick = ()=>editActivity(act.id);
    block.querySelector("[data-act-del]").onclick  = ()=>deleteActivity(act.id);

    wrap.appendChild(block);
  });

  if (!wrap.children.length){
    wrap.innerHTML = `<div class="text-muted text-center py-5">No hay resultados</div>`;
  }

  // listeners de acciones
  $$("[data-action-edit]").forEach(btn=>{
    btn.onclick = ()=>editAction(Number(btn.dataset.act), Number(btn.dataset.id));
  });
  $$("[data-action-del]").forEach(btn=>{
    btn.onclick = ()=>deleteAction(Number(btn.dataset.act), Number(btn.dataset.id));
  });
  $$("[data-action-toggle]").forEach(btn=>{
    btn.onclick = ()=>toggleAction(Number(btn.dataset.act), Number(btn.dataset.id));
  });
}

function badgeClass(state){
  state = String(state || "").toUpperCase();
  if (state === "DESACTIVADO") return "state-desact";
  if (state === "NUEVO") return "state-nuevo";
  return "state-activo";
}

/* ===== Crear nuevo PPA (heredando del último) ===== */
$("#btnNewPlan").addEventListener("click", async ()=>{
  const maxYear = Math.max(0, ...PLANS.map(p=>p.year));
  const { value: yearStr } = await Swal.fire({
    title: "Crear nuevo PPA",
    input: "number",
    inputLabel: "Año del plan",
    inputAttributes: { min: (maxYear+1).toString() },
    inputValue: maxYear ? (maxYear+1) : new Date().getFullYear(),
    confirmButtonText: "Crear",
    showCancelButton: true,
    confirmButtonColor: "#1aa890"
  });
  const year = Number(yearStr);
  if (!year) return;

  if (PLANS.some(p=>p.year===year)) return swalErr("Ya existe un plan para ese año.");

  const prev = [...PLANS].sort((a,b)=>b.year-a.year).find(p=>p.year<year);
  let activities = [];

  if (prev){
    // copiar actividades / acciones
    activities = prev.activities.map(a=>{
      return {
        id: a.id, // (los id’s son locales al año; no pasa nada si coinciden)
        name: a.name,
        description: a.description,
        actions: a.actions.map(x=>({
          id: x.id,
          title: x.title,
          description: x.description,
          state: (String(x.state).toUpperCase()==="NUEVO"?"ACTIVO":x.state)
        }))
      };
    });
  }

  PLANS.push({ year, activities });
  saveAll();
  await swalOk(`PPA-${year} creado${prev? " heredando del " + prev.year : ""}.`);
  renderList();
});

/* ===== Actividad: crear / editar / eliminar ===== */
$("#btnNewActivity").addEventListener("click", ()=>{
  $("#actName").value = "";
  $("#actDesc").value = "";
  $("#modalActivity").querySelector(".modal-title").textContent = "Nueva Actividad";
  $("#modalActivity").dataset.editing = "";
  bootstrap.Modal.getOrCreateInstance($("#modalActivity")).show();
});
$("#formActivity").addEventListener("submit", (e)=>{
  e.preventDefault();
  const plan = getPlanByYear(activePlanYear());
  const name = $("#actName").value.trim();
  const desc = $("#actDesc").value.trim();
  if (!name) return swalErr("El nombre de la actividad es requerido.");

  const editing = $("#modalActivity").dataset.editing;
  if (editing){
    const act = plan.activities.find(a=>a.id===Number(editing));
    act.name = name; act.description = desc;
  }else{
    plan.activities.push({ id: nextActivityId(plan), name, description: desc, actions: [] });
  }
  saveAll();
  bootstrap.Modal.getOrCreateInstance($("#modalActivity")).hide();
  renderPlan();
});

function editActivity(id){
  const plan = getPlanByYear(activePlanYear());
  const act = plan.activities.find(a=>a.id===id);
  $("#actName").value = act.name;
  $("#actDesc").value = act.description || "";
  $("#modalActivity").querySelector(".modal-title").textContent = "Editar Actividad";
  $("#modalActivity").dataset.editing = id;
  bootstrap.Modal.getOrCreateInstance($("#modalActivity")).show();
}

async function deleteActivity(id){
  const ok = await swalAsk("Eliminar actividad", "Se eliminarán también sus acciones.", "Eliminar");
  if (!ok.isConfirmed) return;
  const plan = getPlanByYear(activePlanYear());
  plan.activities = plan.activities.filter(a=>a.id!==id);
  saveAll(); renderPlan();
}

/* ===== Acción: crear / editar / eliminar / togglear ===== */
$("#btnNewAction").addEventListener("click", ()=>{
  const plan = getPlanByYear(activePlanYear());
  if (!plan.activities.length) return swalErr("Primero crea una actividad.");
  fillActivitySelect("#actSelect", plan);
  $("#actionTitle").value = ""; $("#actionDesc").value = "";
  $("#formAction").dataset.editing = "";
  $("#modalAction").querySelector(".modal-title").textContent = "Nueva Acción Preventiva";
  bootstrap.Modal.getOrCreateInstance($("#modalAction")).show();
});
function fillActivitySelect(sel, plan){
  const s = $(sel);
  s.innerHTML = plan.activities.map(a=>`<option value="${a.id}">${a.name}</option>`).join("");
}
$("#formAction").addEventListener("submit", (e)=>{
  e.preventDefault();
  const plan = getPlanByYear(activePlanYear());
  const actId = Number($("#actSelect").value);
  const title = $("#actionTitle").value.trim();
  const desc = $("#actionDesc").value.trim();
  if (!title) return swalErr("El título es requerido.");

  const editing = $("#formAction").dataset.editing;
  if (editing){
    const { act, action } = findAction(plan, Number(editing));
    action.title = title; action.description = desc;
    if (act.id !== actId){
      // mover de actividad
      act.actions = act.actions.filter(x=>x.id!==action.id);
      const newAct = plan.activities.find(a=>a.id===actId);
      newAct.actions.push(action);
    }
  }else{
    const act = plan.activities.find(a=>a.id===actId);
    act.actions.push({ id: nextActionId(plan), title, description: desc, state: "NUEVO" });
  }
  saveAll();
  bootstrap.Modal.getOrCreateInstance($("#modalAction")).hide();
  renderPlan();
});

function findAction(plan, actionId){
  for (const act of plan.activities){
    const a = act.actions.find(x=>x.id===actionId);
    if (a) return {act, action:a};
  }
  return {};
}
function editAction(actId, actionId){
  const plan = getPlanByYear(activePlanYear());
  fillActivitySelect("#actSelect", plan);
  const { action } = findAction(plan, actionId);
  $("#actionTitle").value = action.title;
  $("#actionDesc").value  = action.description || "";
  $("#formAction").dataset.editing = actionId;
  $("#modalAction").querySelector(".modal-title").textContent = "Editar Acción";
  $("#actSelect").value = actId;
  bootstrap.Modal.getOrCreateInstance($("#modalAction")).show();
}
async function deleteAction(actId, actionId){
  const ok = await swalAsk("Eliminar acción", "Esta acción se borrará del plan actual.", "Eliminar");
  if (!ok.isConfirmed) return;
  const plan = getPlanByYear(activePlanYear());
  const act = plan.activities.find(a=>a.id===actId);
  act.actions = act.actions.filter(x=>x.id!==actionId);
  saveAll(); renderPlan();
}
function toggleAction(actId, actionId){
  const plan = getPlanByYear(activePlanYear());
  const { action } = findAction(plan, actionId);
  const cur = String(action.state).toUpperCase();
  // ciclo simple: ACTIVO <-> DESACTIVADO, si era NUEVO pasa a DESACTIVADO
  let next = "DESACTIVADO";
  if (cur==="DESACTIVADO") next = "ACTIVO";
  if (cur==="NUEVO") next = "DESACTIVADO";
  action.state = next;
  saveAll(); renderPlan();
}

/* ===== Banco de Soluciones ===== */
$("#btnOpenBank").addEventListener("click", ()=>{
  $("#view-plan").classList.add("d-none");
  $("#view-bank").classList.remove("d-none");
  $("#searchBank").value = "";
  renderBank();
});
$("#btnBackToPlan").addEventListener("click", ()=>{
  $("#view-bank").classList.add("d-none");
  $("#view-plan").classList.remove("d-none");
});

function renderBank(){
  const q = $("#searchBank").value.trim().toLowerCase();
  const cont = $("#bankContainer");
  cont.innerHTML = "";

  const data = BANK.filter(s=>{
    if (!q) return true;
    const t = (s.type||"") + " " + (s.name||"") + " " + (s.description||"") + " " + (s.targetActivityName||"");
    return t.toLowerCase().includes(q);
  });

  if (!data.length){
    cont.innerHTML = `<div class="text-muted text-center py-5">No hay sugerencias</div>`;
    return;
  }

  data.forEach(s=>{
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-4";
    col.innerHTML = `
      <div class="bank-card animate__animated animate__fadeInUp">
        <div class="d-flex align-items-center justify-content-between">
          <div class="bank-type">Tipo: ${s.type}</div>
          <span class="badge bg-light text-dark">${s.year || ""}</span>
        </div>
        <div class="fw-semibold mt-1">${s.name}</div>
        <div class="text-muted small mb-2">${s.description || ""}</div>
        ${s.type==="ACCION" && s.targetActivityName ? `<div class="small"><b>Actividad:</b> ${s.targetActivityName}</div>` : ""}
        <div class="mt-2 d-flex gap-2">
          <button class="btn btn-success btn-sm" data-add="${s.id}">
            <i class="bi bi-plus-circle me-1"></i>Añadir al plan
          </button>
          <button class="btn btn-outline-danger btn-sm" data-del="${s.id}">
            <i class="bi bi-trash3 me-1"></i>Eliminar
          </button>
        </div>
      </div>
    `;
    cont.appendChild(col);
  });

  // listeners
  $$("[data-del]").forEach(btn=>{
    btn.onclick = async ()=>{
      const id = Number(btn.dataset.del);
      const ok = await swalAsk("Eliminar sugerencia", "Esta sugerencia se borrará del banco.", "Eliminar");
      if (!ok.isConfirmed) return;
      BANK = BANK.filter(x=>x.id!==id);
      saveAll(); renderBank();
    };
  });
  $$("[data-add]").forEach(btn=>{
    btn.onclick = ()=>addSolutionToPlan(Number(btn.dataset.add));
  });
}

function addSolutionToPlan(solId){
  const plan = getPlanByYear(activePlanYear());
  const s = BANK.find(x=>x.id===solId);
  if (!s) return;

  if (s.type === "ACTIVIDAD"){
    const newAct = { id: nextActivityId(plan), name: s.name, description: s.description || "", actions: [] };
    // opcional: crear una acción inicial "NUEVO" con el mismo nombre de la actividad
    // newAct.actions.push({ id: nextActionId(plan), title: s.name, description: s.description || "", state: "NUEVO" });
    plan.activities.push(newAct);
    saveAll();
    swalOk("Actividad añadida al plan.");
    renderPlan();
  }else{
    // Acción: si trae actividad destino, buscarla; si no, pedirla
    let target = null;
    if (s.targetActivityName){
      target = plan.activities.find(a=>a.name.toLowerCase() === s.targetActivityName.toLowerCase());
    }
    if (target){
      target.actions.push({ id: nextActionId(plan), title: s.name, description: s.description || "", state: "NUEVO" });
      saveAll(); swalOk("Acción añadida al plan."); renderPlan();
    }else{
      // pedir actividad por modal
      fillActivitySelect("#pickActivitySelect", plan);
      $("#hiddenSolutionId").value = String(solId);
      bootstrap.Modal.getOrCreateInstance($("#modalPickActivity")).show();
    }
  }
}
$("#formPickActivity").addEventListener("submit", (e)=>{
  e.preventDefault();
  const plan = getPlanByYear(activePlanYear());
  const actId = Number($("#pickActivitySelect").value);
  const sId = Number($("#hiddenSolutionId").value);
  const s = BANK.find(x=>x.id===sId);
  const act = plan.activities.find(a=>a.id===actId);
  act.actions.push({ id: nextActionId(plan), title: s.name, description: s.description || "", state: "NUEVO" });
  saveAll();
  bootstrap.Modal.getOrCreateInstance($("#modalPickActivity")).hide();
  swalOk("Acción añadida al plan.");
  renderPlan();
});

/* ===== Buscar ===== */
$("#searchAction").addEventListener("input", renderPlan);
$("#searchBank").addEventListener("input", renderBank);

/* ===== Volver a lista ===== */
$("#btnBackToList").addEventListener("click", renderList);

/* ===== PDF (stub) ===== */
$("#btnExportPdf").addEventListener("click", ()=>{
  Swal.fire({icon:"info", title:"En construcción", text:"Exportar a PDF estará disponible pronto.", confirmButtonColor:"#1aa890"});
});

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", renderList);
