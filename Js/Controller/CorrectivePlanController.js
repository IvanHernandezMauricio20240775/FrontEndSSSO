/*Importaciones del Service JS*/
import{
    GetAllPlans,
    GetAllPagePlans,
    GetAllPagePlansByDepartment,
    GetPlansByStatus,
    GetPlanByID,
    GetPlansByDepartment,
    GetActionsByPlan,
    InsertPlan,
    ActionsAdd,
    UpdatePlan,
    ActionsUpdate,
    ChangeStatus,
    Verify,
    ActionsProgress,
    ActionsDelete,
    DeletePlan
}from "../Service/CorrectivePlanService.js"

import{
    AuthStatus
}from "../Service/AuthService.js"

import{
    getAllDepartment
}from "../Service/DepartmentService.js"

let AUTH = null;
let PERM = {
  isAdmin: false,
  isCommitteeLeader: false,
  canFull: false,
  canViewAll: false,
  canDeletePlan: false,
  canEditInProceso: false,
};

let DEPTOS = [];   // [{id_department, name_department, ...}]
let PLANES = [];   // UI (mapeado desde API)
let currentPlan = null;

/* =========================
   HELPERS
   ========================= */
const $  = (sel, root=document)=> root.querySelector(sel);
const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));
const fmt = (iso)=> iso ? new Date(iso).toLocaleDateString() : '—';
const zp  = (n,w=3)=> String(n).padStart(w,'0');
async function confirmDialog(text){
  if(window.Swal){
    const r = await Swal.fire({title:'Confirmación', text, icon:'question', showCancelButton:true, confirmButtonText:'Sí', cancelButtonText:'No'});
    return r.isConfirmed;
  }
  return confirm(text);
}

/* =========================
   MAPEOS API <-> UI
   ========================= */
function planDtoToUi(p){
  return {
    id: p.id_plan_corrective,
    dtCreated: p.dt_created_plan ? new Date(p.dt_created_plan).toISOString() : null,
    dtDue:     p.dt_due_plan     ? new Date(p.dt_due_plan).toISOString()     : null,
    dtFinished:p.dt_finished_plan? new Date(p.dt_finished_plan).toISOString(): null,
    nombre: p.name_plan_corrective,
    descripcion: p.description_plan,
    status: p.status_plan,
    idDepartamento: p.id_department,
    acciones: []
  };
}
function actionDtoToUi(a){
  return {
    id: 'ACT-' + (a.id_action_corrective ?? Math.random().toString(36).slice(2,8).toUpperCase()), // uid visual
    backendId: a.id_action_corrective ?? null, // id real (NUMBER)
    nombre: a.name_action_corrective,
    descripcion: a.description_action_corrective,
    status: a.status_action_corrective,
    dtActionTake: a.dt_action_take ? new Date(a.dt_action_take).toISOString() : null,
    detalle: a.how_action_taken || ''
  };
}
function planUiToDto(p){
  return {
    id_plan_corrective: p.id,
    dt_created_plan:  p.dtCreated  ? p.dtCreated.slice(0,10)  : null,
    dt_due_plan:      p.dtDue      ? p.dtDue.slice(0,10)      : null,
    dt_finished_plan: p.dtFinished ? p.dtFinished.slice(0,10) : null,
    name_plan_corrective: p.nombre,
    description_plan: p.descripcion,
    status_plan: p.status,
    id_department: p.idDepartamento
  };
}
function actionUiToDto(a, planId){
  return {
    id_action_corrective: a.backendId ?? null,
    name_action_corrective: a.nombre,
    description_action_corrective: a.descripcion,
    status_action_corrective: a.status,
    dt_action_take: a.dtActionTake ? a.dtActionTake.slice(0,10) : null,
    how_action_taken: a.detalle || null,
    id_plan_corrective: planId
  };
}

/* =========================
   AUTH / PERMISOS
   ========================= */
async function initAuthAndPerms(){
  try{
    const auth = await AuthStatus();
    AUTH = auth?.data || auth || {};
    const role = (AUTH.role || '').toLowerCase();
    const cr   = (AUTH.committeeRole || '').toLowerCase();

    const isAdmin    = role === 'administrador' || role === 'administrado';
    const isLeader   = role === 'usuario' && ['presidente','vicepresidente','secretario'].includes(cr);

    PERM.isAdmin = isAdmin;
    PERM.isCommitteeLeader = isLeader;
    PERM.canFull = isAdmin || isLeader;
    PERM.canViewAll = PERM.canFull;
    PERM.canDeletePlan = PERM.canFull;
    PERM.canEditInProceso = PERM.canFull;

    $('#btnNuevoPlan')?.classList.toggle('d-none', !PERM.canFull);

    if(!PERM.canViewAll){
      $('#col-nuevo')?.closest('.kanban-col')?.classList.add('d-none');
      $('#col-verificacion')?.closest('.kanban-col')?.classList.add('d-none');
      $('#col-completado')?.closest('.kanban-col')?.classList.add('d-none');
    }
  }catch(e){ console.error('AuthStatus error', e); }
}

/* =========================
   DEPARTAMENTOS
   ========================= */
async function loadDepartments(){
  try{
    const res = await getAllDepartment();
    const arr = res?.data || res || [];
    DEPTOS = arr.map(d=>({
      id: d.id_department,
      nombre: d.name_department,
      descripcion: d.description_department,
      logo: d.logo_department
    }));
  }catch(e){
    console.error('getAllDepartment error', e);
    DEPTOS = [];
  }
}
function renderDepartmentCards(){
  const cont = $('#cp-departamentos'); if(!cont) return;
  cont.innerHTML = '';
  DEPTOS.forEach(d=>{
    const el = document.createElement('div');
    el.className = 'dept-card';
    el.innerHTML = `<div class="fw-semibold mb-1">${d.nombre}</div><div class="text-muted small">${d.id}</div>`;
    el.addEventListener('click', ()=>{
      $$('.dept-card', cont).forEach(x=>x.classList.remove('active'));
      el.classList.add('active');
      $('#cp-id-depto').value = d.id;
      $('#cp-depto-error').classList.add('d-none');
    });
    cont.appendChild(el);
  });
}

/* =========================
   PLANES
   ========================= */
const cols = {
  NUEVO: $('#col-nuevo'),
  'EN PROCESO': $('#col-proceso'),
  VERIFICACION: $('#col-verificacion'),
  COMPLETADO: $('#col-completado')
};
function stateClass(s){ return s==='NUEVO'?'nuevo':s==='EN PROCESO'?'proceso':s==='VERIFICACION'?'verif':'comp'; }

async function loadPlans(){
  try{
    let planDtos = [];
    if(PERM.canViewAll){
      const res = await GetAllPlans();
      planDtos = res?.data || res || [];
    }else{
      const res = await GetPlansByStatus('EN PROCESO');
      planDtos = res?.data || res || [];
    }

    PLANES = [];
    for(const p of planDtos){
      const ui = planDtoToUi(p);
      const acts = await GetActionsByPlan(ui.id);
      const actDtos = acts?.data || acts || [];
      ui.acciones = actDtos.map(actionDtoToUi);
      PLANES.push(ui);
    }
    renderBoard();
  }catch(e){ console.error('loadPlans error', e); }
}

function renderBoard(filterText=''){
  Object.values(cols).forEach(c=> c && (c.innerHTML=''));
  const filtered = PLANES.filter(p=>{
    if(!filterText) return true;
    const t = filterText.toLowerCase();
    return p.id.toLowerCase().includes(t) || p.nombre.toLowerCase().includes(t) || p.descripcion.toLowerCase().includes(t);
  });

  const count = {NUEVO:0,'EN PROCESO':0,VERIFICACION:0,COMPLETADO:0};

  for(const plan of filtered){
    if(!PERM.canViewAll && plan.status!=='EN PROCESO') continue;

    const card = document.createElement('div');
    card.className = `d-flex card-plan align-items-stretch state-${stateClass(plan.status)}`;
    card.innerHTML = `
      <div class="left-bar"></div>
      <div class="content w-100">
        <div class="d-flex justify-content-between align-items-start">
          <div class="title">${plan.id}: ${plan.nombre}</div>
          ${(PERM.canDeletePlan && (plan.status==='NUEVO'||plan.status==='COMPLETADO')) ? `
            <button class="btn btn-sm btn-outline-danger" data-delete="${plan.id}" title="Eliminar plan"><i class="bi bi-trash"></i></button>
          `:''}
        </div>
        <div class="meta">Depto: ${DEPTOS.find(d=>d.id===plan.idDepartamento)?.nombre || '—'}</div>
        <div class="meta">Creado: ${fmt(plan.dtCreated)} · Fin: ${fmt(plan.dtFinished)}</div>
        <div class="meta">Acciones: ${plan.acciones.length}</div>
      </div>
    `;
    card.addEventListener('click', (ev)=>{
      if(ev.target.closest('[data-delete]')) return;
      openPlanModal(plan.id);
    });
    const del = card.querySelector('[data-delete]');
    if(del){
      del.addEventListener('click', async (ev)=>{
        ev.stopPropagation();
        const ok = await confirmDialog(`¿Eliminar el plan ${plan.id}?`);
        if(!ok) return;
        try{
          await DeletePlan(plan.id);
          PLANES = PLANES.filter(p=>p.id!==plan.id);
          renderBoard();
        }catch(e){ console.error('DeletePlan error', e); alert('No se pudo eliminar.'); }
      });
    }
    cols[plan.status]?.appendChild(card);
    count[plan.status]++;
  }

  $('#stat-nuevos')     && ($('#stat-nuevos').textContent = count.NUEVO);
  $('#stat-proceso')    && ($('#stat-proceso').textContent = count['EN PROCESO']);
  $('#stat-verificacion')&&($('#stat-verificacion').textContent = count.VERIFICACION);
  $('#stat-completados')&&($('#stat-completados').textContent = count.COMPLETADO);
}

/* =========================
   CREAR PLAN
   ========================= */
// siguiente PAC-XXX = menor faltante
function computeNextPlanId(){
  const used = new Set();
  PLANES.forEach(p=>{
    const m = /^PAC-(\d+)$/.exec(p.id || '');
    if(m) used.add(parseInt(m[1],10));
  });
  let n=1; while(used.has(n)) n++;
  return `PAC-${zp(n)}`;
}
function preloadCreateModal(){
  // limpia formulario
  $('#formCrearPlan')?.reset();
  $('#cp-acciones').innerHTML='';
  $('#cp-depto-error').classList.add('d-none');
  // id secuencial
  $('#cp-codigo').value = computeNextPlanId();
  // render deptos (cada apertura)
  renderDepartmentCards();
}
function collectCreatePlanPayloadFromForm(){
  const idPlan   = $('#cp-codigo').value.trim() || computeNextPlanId();
  const nombre   = $('#cp-nombre').value.trim();
  const desc     = $('#cp-descripcion').value.trim();
  const idDepto  = $('#cp-id-depto').value;
  const dueStr   = $('#cp-fecha-fin')?.value || null;
  const created  = new Date().toISOString().slice(0,10);
  const dueDate  = dueStr || new Date(Date.now()+7*86400000).toISOString().slice(0,10);

  const acciones = [];
  $$('#cp-acciones .chip').forEach(ch=>{
    acciones.push({
      id: 'ACT-'+Math.random().toString(36).slice(2,8).toUpperCase(),
      backendId: null,
      nombre: ch.dataset.nombre,
      descripcion: ch.dataset.descripcion || '—',
      status:'PENDIENTE', dtActionTake:null, detalle:''
    });
  });

  const planUi = {
    id: idPlan, dtCreated: new Date().toISOString(), dtDue: new Date(dueDate).toISOString(),
    dtFinished: null, nombre, descripcion: desc, status:'NUEVO', idDepartamento:idDepto, acciones
  };
  return { planUi, body:{ plan: planUiToDto(planUi), actions: acciones.map(a=> actionUiToDto(a, idPlan)) } };
}
async function submitCrearPlan(ev){
  ev.preventDefault();
  const form = ev.currentTarget;
  if(!form.checkValidity()){ form.classList.add('was-validated'); return; }
  if(!$('#cp-id-depto').value){ $('#cp-depto-error').classList.remove('d-none'); return; }

  try{
    const { body } = collectCreatePlanPayloadFromForm();
    await InsertPlan(body);
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalCrearPlan')) ||
                  new bootstrap.Modal(document.getElementById('modalCrearPlan'));
    modal.hide();
    await loadPlans();
  }catch(e){ console.error('InsertPlan', e); alert('No se pudo crear el plan.'); }
}

/* =========================
   MODALES POR ESTADO
   ========================= */
async function openPlanModal(id){
  currentPlan = PLANES.find(p=>p.id===id);
  if(!currentPlan){ await loadPlans(); currentPlan = PLANES.find(p=>p.id===id); if(!currentPlan) return; }
  try{
    const acts = await GetActionsByPlan(currentPlan.id);
    const actDtos = acts?.data || acts || [];
    currentPlan.acciones = actDtos.map(actionDtoToUi);
  }catch(e){ console.warn('refresh actions', e); }

  if(currentPlan.status==='NUEVO') openModalNuevo();
  else if(currentPlan.status==='EN PROCESO') openModalProceso();
  else if(currentPlan.status==='VERIFICACION') openModalVerificacion();
  else openModalCompletado();
}

/* ---------- NUEVO ---------- */
function openModalNuevo(){
  const modalEl = document.getElementById('modalNuevo');
  const box = $('#nuevo-acciones'); if(!box) return;
  box.innerHTML='';

  // backup ids reales para detectar deletes
  currentPlan._originalBackendIds = new Set(currentPlan.acciones.filter(a=>a.backendId!=null).map(a=>a.backendId));

  const list = document.createElement('div'); list.className='list-actions';
  currentPlan.acciones.forEach(a=>{
    const item = document.createElement('div');
    item.className='action-item';
    item.dataset.uid = a.id;                 // << clave para identificar en DOM
    item.innerHTML = `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="nv-${a.id}" checked>
        <label class="form-check-label fw-semibold" for="nv-${a.id}">${a.nombre}</label>
      </div>
      <div class="text-muted small ms-4">${a.descripcion}</div>
      <div class="text-end mt-2">
        <button class="btn btn-sm btn-outline-danger" data-remove="${a.id}"><i class="bi bi-trash"></i> Descartar</button>
      </div>
    `;
    // descartar
    item.querySelector('[data-remove]').addEventListener('click', ()=>{
      item.remove(); updateNuevoEnviarBtn();
    });
    // toggle enable
    item.querySelector('input').addEventListener('change', updateNuevoEnviarBtn);
    list.appendChild(item);
  });
  box.appendChild(list);
  updateNuevoEnviarBtn();

  // agregar nuevas acciones
  $('#btnNuevoAddAccion').onclick = ()=>{
    const n=$('#nuevo-accion-nombre').value.trim();
    const d=$('#nuevo-accion-desc').value.trim();
    if(!n||!d) return;
    const a = { id:'ACT-'+Math.random().toString(36).slice(2,8).toUpperCase(), backendId:null, nombre:n, descripcion:d, status:'PENDIENTE', dtActionTake:null, detalle:'' };
    currentPlan.acciones.push(a);
    openModalNuevo(); // re-render
    $('#nuevo-accion-nombre').value=''; $('#nuevo-accion-desc').value='';
  };

  // enviar a proceso (corregido: preventDefault y dataset.uid)
  $('#btnEnviarAProceso').onclick = async (ev)=>{
    ev.preventDefault();
    // uids de acciones marcadas
    const keepUids = $$('#nuevo-acciones .action-item input[type="checkbox"]:checked')
      .map(ch=> ch.closest('.action-item').dataset.uid);
    if(keepUids.length===0){ return; } // no dejar sin acciones

    // keeps reales
    const keeps = currentPlan.acciones.filter(a=> keepUids.includes(a.id));

    try{
      // DELETE: las que estaban y ya no
      const keepsBackendIds = new Set(keeps.filter(a=>a.backendId!=null).map(a=>a.backendId));
      for(const oldId of currentPlan._originalBackendIds){
        if(!keepsBackendIds.has(oldId)){ await ActionsDelete(oldId); }
      }
      // ADD: nuevas sin backendId
      for(const a of keeps){
        if(a.backendId==null){
          const resp = await ActionsAdd(currentPlan.id, actionUiToDto(a, currentPlan.id));
          a.backendId = (resp?.data||resp)?.id_action_corrective ?? null;
        }
      }
      // estado plan -> EN PROCESO
      await ChangeStatus(currentPlan.id, { status_plan:'EN PROCESO' });
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
      await loadPlans();
    }catch(e){ console.error('-> EN PROCESO', e); alert('No se pudo pasar a EN PROCESO.'); }
  };

  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
}
function updateNuevoEnviarBtn(){
  const any = $$('#nuevo-acciones .action-item input[type="checkbox"]:checked').length > 0;
  $('#btnEnviarAProceso').disabled = !any;
}

/* ---------- EN PROCESO ---------- */
function openModalProceso(){
  const modalEl = document.getElementById('modalProceso');
  const box = $('#proceso-acciones'); if(!box) return;
  box.innerHTML='';
  const list = document.createElement('div'); list.className='list-actions';

  currentPlan.acciones.forEach(a=>{
    const checked = a.status==='COMPLETADO';
    const item = document.createElement('div'); item.className='action-item';
    item.innerHTML = `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="pr-${a.id}" ${checked?'checked':''} ${!PERM.canEditInProceso?'disabled':''}>
        <label class="form-check-label fw-semibold" for="pr-${a.id}">${a.nombre}</label>
      </div>
      <div class="text-muted small ms-4">${a.descripcion}</div>
      <div class="form-check-description mt-2">
        <label class="form-label small">Descripción de cómo se realizó</label>
        <textarea class="form-control" id="pr-desc-${a.id}" rows="2" ${(!PERM.canEditInProceso || !checked)?'disabled':''}>${a.detalle||''}</textarea>
      </div>
    `;
    const chk = item.querySelector(`#pr-${a.id}`);
    const txt = item.querySelector(`#pr-desc-${a.id}`);
    if(PERM.canEditInProceso){
      chk.addEventListener('change', ()=>{
        txt.disabled = !chk.checked;
        if(!chk.checked) txt.value='';
        updateProcesoButtons();
      });
      txt.addEventListener('input', updateProcesoButtons);
    }
    list.appendChild(item);
  });
  box.appendChild(list);
  updateProcesoButtons();

  // guardado parcial al cerrar
  $('#btnCerrarProceso')?.addEventListener('click', async ()=>{
    if(!PERM.canEditInProceso){ (bootstrap.Modal.getInstance(modalEl)||new bootstrap.Modal(modalEl)).hide(); return; }
    const hasCheckedWithDesc = currentPlan.acciones.some(a=>{
      const chk = $(`#pr-${a.id}`), txt = $(`#pr-desc-${a.id}`);
      return chk?.checked && txt?.value.trim().length>0;
    });
    if(!hasCheckedWithDesc){ (bootstrap.Modal.getInstance(modalEl)||new bootstrap.Modal(modalEl)).hide(); return; }

    const ok = await confirmDialog('¿Guardar el progreso marcado?');
    if(!ok){ (bootstrap.Modal.getInstance(modalEl)||new bootstrap.Modal(modalEl)).hide(); return; }

    try{
      for(const a of currentPlan.acciones){
        const chk = $(`#pr-${a.id}`), txt = $(`#pr-desc-${a.id}`);
        if(chk?.checked && txt?.value.trim()){
          await ActionsProgress(a.backendId, {
            id_action_corrective: a.backendId,
            name_action_corrective: a.nombre,
            description_action_corrective: a.descripcion,
            status_action_corrective: 'COMPLETADO',
            dt_action_take: new Date().toISOString().slice(0,10),
            how_action_taken: txt.value.trim(),
            id_plan_corrective: currentPlan.id
          });
        }
      }
      (bootstrap.Modal.getInstance(modalEl)||new bootstrap.Modal(modalEl)).hide();
      await loadPlans();
    }catch(e){ console.error('save parcial', e); alert('No se pudo guardar el progreso.'); }
  });

  // enviar a verificación
  $('#btnEnviarAVerificacion').onclick = async ()=>{
    if(!PERM.canEditInProceso) return;
    const allOk = currentPlan.acciones.every(a=>{
      const chk = $(`#pr-${a.id}`), txt = $(`#pr-desc-${a.id}`);
      return chk?.checked && txt?.value.trim().length>0;
    });
    if(!allOk) return;

    try{
      for(const a of currentPlan.acciones){
        await ActionsProgress(a.backendId, {
          id_action_corrective: a.backendId,
          name_action_corrective: a.nombre,
          description_action_corrective: a.descripcion,
          status_action_corrective: 'COMPLETADO',
          dt_action_take: new Date().toISOString().slice(0,10),
          how_action_taken: $(`#pr-desc-${a.id}`).value.trim(),
          id_plan_corrective: currentPlan.id
        });
      }
      await ChangeStatus(currentPlan.id, { status_plan:'VERIFICACION' });
      (bootstrap.Modal.getInstance(modalEl)||new bootstrap.Modal(modalEl)).hide();
      await loadPlans();
    }catch(e){ console.error('to VERIFICACION', e); alert('No se pudo enviar a verificación.'); }
  };

  if(!PERM.canEditInProceso){ $('#btnEnviarAVerificacion')?.setAttribute('disabled','disabled'); }
  (bootstrap.Modal.getInstance(modalEl)||new bootstrap.Modal(modalEl)).show();
}
function updateProcesoButtons(){
  const btn = $('#btnEnviarAVerificacion'); if(!btn) return;
  const allOk = currentPlan?.acciones?.every(a=>{
    const chk = $(`#pr-${a.id}`), txt = $(`#pr-desc-${a.id}`);
    return chk && chk.checked && txt && txt.value.trim().length>0;
  });
  btn.disabled = !allOk || !PERM.canEditInProceso;
}

/* ---------- VERIFICACIÓN ---------- */
function openModalVerificacion(){
  const modalEl = document.getElementById('modalVerificacion');
  const box = $('#verif-acciones'); if(!box) return;
  box.innerHTML='';
  const list = document.createElement('div'); list.className='list-actions';

  currentPlan.acciones.forEach(a=>{
    const item = document.createElement('div'); item.className='action-item';
    item.innerHTML = `
      <div class="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div class="fw-semibold">${a.nombre}</div>
          <div class="text-muted small">Cómo se realizó: ${a.detalle||'—'}</div>
          <div class="text-muted small">Fecha de ejecución: ${fmt(a.dtActionTake)}</div>
        </div>
        ${PERM.canFull ? `
        <div class="form-check mt-1">
          <input class="form-check-input" type="checkbox" id="vf-${a.id}">
          <label class="form-check-label" for="vf-${a.id}">No cumple</label>
        </div>`:''}
      </div>
    `;
    list.appendChild(item);
  });
  box.appendChild(list);

  $('#btnRechazarVolverProceso').onclick = async ()=>{
    if(!PERM.canFull) return;
    // ids REALES (NUMBER) de acciones no conformes
    const notOkBackendIds = currentPlan.acciones
      .filter(a=> $(`#vf-${a.id}`)?.checked)
      .map(a=> a.backendId)
      .filter(id=> id!=null);

    if(notOkBackendIds.length===0){ alert('Marca al menos una acción como "No cumple".'); return; }

    try{
      await Verify(currentPlan.id, { not_compliant_actions: notOkBackendIds, notes: 'Observaciones de verificación' });
      (bootstrap.Modal.getInstance(modalEl)||new bootstrap.Modal(modalEl)).hide();
      await loadPlans(); // ahora debe estar en EN PROCESO
    }catch(e){ console.error('Verify -> EN PROCESO', e); alert('No se pudo devolver a EN PROCESO.'); }
  };

  $('#btnFinalizarPlan').onclick = async ()=>{
    if(!PERM.canFull) return;
    const anyNoCumple = currentPlan.acciones.some(a=> $(`#vf-${a.id}`)?.checked);
    if(anyNoCumple){ alert('Hay acciones "No cumple". Devuelve a Proceso.'); return; }
    try{
      await ChangeStatus(currentPlan.id, { status_plan:'COMPLETADO', dt_finished_plan: new Date().toISOString().slice(0,10) });
      (bootstrap.Modal.getInstance(modalEl)||new bootstrap.Modal(modalEl)).hide();
      await loadPlans();
    }catch(e){ console.error('Finalizar', e); alert('No se pudo finalizar.'); }
  };

  if(!PERM.canFull){
    $('#btnRechazarVolverProceso')?.setAttribute('disabled','disabled');
    $('#btnFinalizarPlan')?.setAttribute('disabled','disabled');
  }
  (bootstrap.Modal.getInstance(modalEl)||new bootstrap.Modal(modalEl)).show();
}

/* ---------- COMPLETADO (solo lectura) ---------- */
function openModalCompletado(){
  const modalEl = document.getElementById('modalCompletado');
  const box = $('#detalle-completado'); if(!box) return;
  const depto = DEPTOS.find(d=>d.id===currentPlan.idDepartamento)?.nombre || '—';
  box.innerHTML = `
    <div class="mb-3">
      <div class="h5 mb-1">${currentPlan.id}: ${currentPlan.nombre}</div>
      <div class="text-muted">${currentPlan.descripcion}</div>
    </div>
    <div class="row g-3">
      <div class="col-md-6">
        <div class="list-group">
          <div class="list-group-item d-flex justify-content-between"><span>Departamento</span><strong>${depto}</strong></div>
          <div class="list-group-item d-flex justify-content-between"><span>Creado</span><strong>${fmt(currentPlan.dtCreated)}</strong></div>
          <div class="list-group-item d-flex justify-content-between"><span>Finalizado</span><strong>${fmt(currentPlan.dtFinished)}</strong></div>
          <div class="list-group-item d-flex justify-content-between"><span>Acciones</span><strong>${currentPlan.acciones.length}</strong></div>
        </div>
      </div>
      <div class="col-md-6">
        <ul class="list-group">
          ${currentPlan.acciones.map(a=>`
            <li class="list-group-item">
              <div class="fw-semibold">${a.nombre}</div>
              <div class="text-muted small">Descripción: ${a.descripcion}</div>
              <div class="text-muted small">Detalle ejecución: ${a.detalle||'—'}</div>
              <div class="text-muted small">Estado: ${a.status} · Fecha: ${fmt(a.dtActionTake)}</div>
            </li>`).join('')}
        </ul>
      </div>
    </div>
  `;
  (bootstrap.Modal.getInstance(modalEl)||new bootstrap.Modal(modalEl)).show();
}

/* =========================
   INIT
   ========================= */
document.addEventListener('DOMContentLoaded', async ()=>{
  await initAuthAndPerms();
  await loadDepartments();
  await loadPlans();

  // buscar
  $('#searchInput')?.addEventListener('input', e=> renderBoard(e.target.value.trim()));

  // abrir crear plan (preload secuencial + deptos)
  $('#btnNuevoPlan')?.addEventListener('click', ()=>{
    if(!PERM.canFull) return;
    preloadCreateModal();
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalCrearPlan')) ||
                  new bootstrap.Modal(document.getElementById('modalCrearPlan'));
    modal.show();
  });

  // chips en crear
  $('#btnAddAccionChip')?.addEventListener('click', ()=>{
    const n = $('#cp-accion-nombre').value.trim();
    const d = $('#cp-accion-desc').value.trim();
    if(!n || !d) return;
    const wrap = $('#cp-acciones');
    const chip = document.createElement('span');
    chip.className='chip';
    chip.innerHTML = `<i class="bi bi-check2-circle"></i><span class="chip-text">${n}</span><span class="text-muted">– ${d}</span> <i class="bi bi-x-lg remove"></i>`;
    chip.dataset.nombre=n; chip.dataset.descripcion=d;
    chip.querySelector('.remove').addEventListener('click', ()=> chip.remove());
    wrap.appendChild(chip);
    $('#cp-accion-nombre').value=''; $('#cp-accion-desc').value='';
  });

  // submit crear
  $('#formCrearPlan')?.addEventListener('submit', submitCrearPlan);
});
