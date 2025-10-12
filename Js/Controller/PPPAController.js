import * as PPA_Actions from "../Service/PPPAService.js";
import { AuthStatus } from "../Service/AuthService.js";


const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const swalOk  = (t) => Swal.fire({ icon: "success", title: "Listo", text: t, confirmButtonColor: "#1aa890" });
const swalErr = (t) => Swal.fire({ icon: "error", title: "Ups", text: t, confirmButtonColor: "#1aa890" });
const swalAsk = (t, tx, ok = "Sí") =>
  Swal.fire({ icon: "question", title: t, text: tx, showCancelButton: true, confirmButtonText: ok, cancelButtonText: "Cancelar", confirmButtonColor: "#1aa890" });

//Estados
let CLAIMS = null;
let CAN_EDIT = false;     // controla botones y acciones
let CUR_YEAR = null;      // año del plan abierto
let YEAR_TO_ID = new Map(); // year -> id_ppa (para delete)

/** Plan actual (PpaPlanViewDTO) */
let PLAN_VIEW = {
  year: null,
  activities: [] // [{ id_activity, name_activity, description, actions: [{id_action, name_action, description, state_action}] }]
};

let BANK = [];

async function initAuth() {
  try {
    const me = await AuthStatus();
    console.log("[AuthStatus] =>", me);
    CLAIMS = me?.data || null;

    const role = (CLAIMS?.role || "").toString();
    const cRole = (CLAIMS?.committeeRole || "").toString();
    const BOARD = new Set(["Presidente", "Vicepresidente", "Secretario"]);
    CAN_EDIT = role === "Administrador" || (role === "Usuario" && BOARD.has(cRole));

    if (!CAN_EDIT) {
      // Bloquear toda la UI de PPA
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div id="noAccessOverlay" style="
            position:fixed; inset:0; background:#fff; z-index:9999; display:flex;
            align-items:center; justify-content:center; text-align:center; padding:2rem;">
            <div class="animate__animated animate__fadeIn">
              <i class="bi bi-shield-lock" style="font-size:3rem;color:#dc3545"></i>
              <h3 class="mt-3">No tienes acceso a esta información</h3>
              <p class="text-muted">Contacta al administrador si crees que se trata de un error.</p>
            </div>
         </div>`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("AuthStatus error:", err);
    await swalErr("No se pudo verificar tu sesión.");
    return false;
  }
}

/* =========================================================
   Carga de lista (años)
   ========================================================= */
async function loadYears() {
  const res = await PPA_Actions.getAllPpa(); // ApiResponse<List<PpaDTO>>
  console.log("[getAllPpa] =>", res);
  const list = res?.data || [];
  YEAR_TO_ID = new Map(list.map(x => [x.year_ppa, x.id_ppa]));
  return list.sort((a, b) => b.year_ppa - a.year_ppa);
}

async function renderList() {
  $("#view-list")?.classList.remove("d-none");
  $("#view-plan")?.classList.add("d-none");
  $("#view-bank")?.classList.add("d-none");

  const box = $("#yearsContainer");
  if (!box) return;
  box.innerHTML = "";

  try {
    const years = await loadYears();
    if (!years.length) {
      box.innerHTML = `<div class="text-muted text-center py-5">No hay planes creados aún.</div>`;
      return;
    }
    years.forEach(p => {
      const div = document.createElement("div");
      div.className = "year-item animate__animated animate__fadeInUp";
      div.innerHTML = `
        <i class="bi bi-folder2 year-icon"></i>
        <button class="btn btn-link text-decoration-none p-0 fs-5" data-year="${p.year_ppa}">
          PPA-${p.year_ppa}
        </button>
      `;
      div.querySelector("button").onclick = () => openPlan(p.year_ppa);
      box.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="text-danger text-center py-5">Error al cargar PPA</div>`;
  }
}

/* =========================================================
   Plan por año
   ========================================================= */
async function openPlan(year) {
  CUR_YEAR = Number(year);
  $("#planYear") && ($("#planYear").textContent = String(year));
  $("#bankYear") && ($("#bankYear").textContent = String(year));
  $("#view-list")?.classList.add("d-none");
  $("#view-bank")?.classList.add("d-none");
  $("#view-plan")?.classList.remove("d-none");
  $("#searchAction") && ($("#searchAction").value = "");

  // aseguramos botón "Eliminar PPA"
  ensureDeletePlanButton();

  await refreshPlan();
}

async function refreshPlan() {
  try {
    const res = await PPA_Actions.getPlanView(CUR_YEAR);
    console.log("[getPlanView] =>", res);
    PLAN_VIEW = res?.data || { year: CUR_YEAR, activities: [] };
    renderPlan();
  } catch (err) {
    console.error(err);
    await swalErr("Error al cargar el plan preventivo.");
  }
}

function renderPlan() {
  const wrap = $("#activitiesContainer");
  if (!wrap) return;

  const q = ($("#searchAction")?.value || "").trim().toLowerCase();
  wrap.innerHTML = "";

  const canEditCls = CAN_EDIT ? "" : "d-none";

  PLAN_VIEW.activities.forEach(act => {
    const match = (txt) => (txt || "").toLowerCase().includes(q);
    const actions = (act.actions || []).filter(a => {
      if (!q) return true;
      return match(a.name_action) || match(a.description) || match(act.name_activity);
    });
    if (!actions.length) return;

    const block = document.createElement("div");
    block.className = "activity-block";
    block.innerHTML = `
      <div class="activity-title mb-1">
        <span class="dot"></span>
        <span>${act.name_activity}</span>
        <div class="ms-auto d-flex gap-2 ${canEditCls}">
          <button class="btn btn-outline-secondary btn-sm" data-act-edit data-id="${act.id_activity}">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm" data-act-del data-id="${act.id_activity}">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
      <div class="activity-actions"></div>
    `;
    const grid = block.querySelector(".activity-actions");

    actions.forEach(a => {
      const card = document.createElement("div");
      card.className = "action-card animate__animated animate__fadeInUp";
      card.innerHTML = `
        <span class="badge-state ${badgeClass(a.state_action)}"></span>
        <div class="action-title">${a.name_action}</div>
        <div class="action-desc mt-1">${a.description || ""}</div>
        <div class="action-toolbar ${canEditCls}">
          <button class="btn btn-outline-secondary" title="Editar" data-action-edit data-id="${a.id_action}" data-act="${act.id_activity}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger" title="Eliminar" data-action-del data-id="${a.id_action}">
            <i class="bi bi-trash"></i>
          </button>
          <button class="btn btn-outline-warning" title="Activar / Desactivar" data-action-toggle data-id="${a.id_action}" data-state="${a.state_action}">
            <i class="bi bi-toggle2-on"></i>
          </button>
        </div>
        <div class="small text-muted mt-1">Estado: ${a.state_action}</div>
      `;
      grid.appendChild(card);
    });

    wrap.appendChild(block);
  });

  if (!wrap.children.length) {
    wrap.innerHTML = `<div class="text-muted text-center py-5">No hay resultados</div>`;
  }

  // Listeners de actividad
  $$("[data-act-edit]").forEach(btn => btn.onclick = () => onEditActivity(Number(btn.dataset.id)));
  $$("[data-act-del]").forEach(btn => btn.onclick = () => onDeleteActivity(Number(btn.dataset.id)));

  // Listeners de acciones
  $$("[data-action-edit]").forEach(btn => btn.onclick = () => onEditAction(Number(btn.dataset.act), Number(btn.dataset.id)));
  $$("[data-action-del]").forEach(btn => btn.onclick = () => onDeleteAction(Number(btn.dataset.id)));
  $$("[data-action-toggle]").forEach(btn => btn.onclick = () => onToggleAction(Number(btn.dataset.id), String(btn.dataset.state || "")));
}

function badgeClass(state) {
  state = String(state || "").toUpperCase();
  if (state === "DESACTIVADO") return "state-desact";
  if (state === "NUEVO") return "state-nuevo";
  return "state-activo";
}

/* =========================================================
   Crear nuevo PPA
   ========================================================= */
$("#btnNewPlan")?.addEventListener("click", async () => {
  if (!CAN_EDIT) return;
  const years = await loadYears();
  const maxYear = years.length ? Math.max(...years.map(y => y.year_ppa)) : new Date().getFullYear();
  const { value: yearStr } = await Swal.fire({
    title: "Crear nuevo PPA",
    input: "number",
    inputLabel: "Año del plan",
    inputAttributes: { min: (maxYear + 1).toString() },
    inputValue: (maxYear + 1),
    confirmButtonText: "Crear",
    showCancelButton: true,
    confirmButtonColor: "#1aa890"
  });
  const year = Number(yearStr);
  if (!year) return;

  try {
    console.log("[createPpa] payload =>", { year_ppa: year });
    const res = await PPA_Actions.createPpa(year);
    console.log("[createPpa] response =>", res);
    await swalOk(`PPA-${year} creado.`);
    await renderList();
  } catch (err) {
    console.error(err);
    await swalErr(err.message || "Error al crear el PPA.");
  }
});

/* =========================================================
   Eliminar PPA
   ========================================================= */
function ensureDeletePlanButton() {
  // Si existe en el HTML, sólo asignamos el listener; si no, lo creamos junto a #btnBackToList
  let btn = $("#btnDeletePpa");
  if (!btn) {
    const anchor = $("#btnBackToList")?.parentElement || $("#view-plan")?.querySelector(".plan-toolbar") || $("#view-plan");
    if (anchor) {
      const span = document.createElement("span");
      span.innerHTML = `
        <button id="btnDeletePpa" class="btn btn-outline-danger btn-sm ms-2">
          <i class="bi bi-trash3"></i>
        </button>`;
      anchor.appendChild(span);
      btn = $("#btnDeletePpa");
    }
  }
  if (btn) {
    btn.classList.toggle("d-none", !CAN_EDIT);
    btn.onclick = onDeletePpa;
  }
}
async function onDeletePpa() {
  if (!CAN_EDIT) return;
  const ok = await swalAsk(`Eliminar PPA-${CUR_YEAR}`, "Este plan y su contenido serán eliminados.", "Eliminar");
  if (!ok.isConfirmed) return;

  try {
    const idPpa = YEAR_TO_ID.get(CUR_YEAR);
    if (!idPpa) throw new Error("No se encontró el ID del PPA.");
    console.log("[deletePpa] =>", { id_ppa: idPpa, year: CUR_YEAR });
    const res = await PPA_Actions.deletePpa(idPpa);
    console.log("[deletePpa] response =>", res);
    await swalOk("PPA eliminado.");
    CUR_YEAR = null;
    await renderList();
  } catch (err) {
    console.error(err);
    await swalErr(err.message || "Error al eliminar el PPA.");
  }
}

/* =========================================================
   Actividad: crear / editar / eliminar
   ========================================================= */
$("#btnNewActivity")?.addEventListener("click", () => {
  if (!CAN_EDIT) return;
  $("#actName").value = "";
  $("#actDesc").value = "";
  $("#modalActivity").querySelector(".modal-title").textContent = "Nueva Actividad";
  $("#modalActivity").dataset.editing = "";
  bootstrap.Modal.getOrCreateInstance($("#modalActivity")).show();
});

$("#formActivity")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!CAN_EDIT) return;
  const name = $("#actName").value.trim();
  const description = $("#actDesc").value.trim();
  if (!name) return swalErr("El nombre de la actividad es requerido.");

  try {
    const editing = $("#modalActivity").dataset.editing;
    if (editing) {
      console.log("[updateActivity] payload =>", { id_activity: Number(editing), name_activity: name, description });
      const res = await PPA_Actions.updateActivity(Number(editing), { name_activity: name, description });
      console.log("[updateActivity] response =>", res);
      await swalOk("Actividad actualizada.");
    } else {
      const id_ppa = YEAR_TO_ID.get(CUR_YEAR);
      console.log("[insertActivity] payload =>", { id_ppa, name_activity: name, description });
      const res = await PPA_Actions.insertActivity({ id_ppa, name_activity: name, description });
      console.log("[insertActivity] response =>", res);
      await swalOk("Actividad creada.");
    }
    bootstrap.Modal.getOrCreateInstance($("#modalActivity")).hide();
    await refreshPlan();
  } catch (err) {
    console.error(err);
    await swalErr(err.message || "Error al guardar la actividad.");
  }
});

function onEditActivity(idActivity) {
  if (!CAN_EDIT) return;
  const act = (PLAN_VIEW.activities || []).find(a => a.id_activity === idActivity);
  if (!act) return;
  $("#actName").value = act.name_activity;
  $("#actDesc").value = act.description || "";
  $("#modalActivity").querySelector(".modal-title").textContent = "Editar Actividad";
  $("#modalActivity").dataset.editing = idActivity;
  bootstrap.Modal.getOrCreateInstance($("#modalActivity")).show();
}

async function onDeleteActivity(idActivity) {
  if (!CAN_EDIT) return;
  const ok = await swalAsk("Eliminar actividad", "Se eliminarán también sus acciones.", "Eliminar");
  if (!ok.isConfirmed) return;

  try {
    console.log("[deleteActivity] =>", { id_activity: idActivity });
    const res = await PPA_Actions.deleteActivity(idActivity);
    console.log("[deleteActivity] response =>", res);
    await swalOk("Actividad eliminada.");
    await refreshPlan();
  } catch (err) {
    console.error(err);
    await swalErr(err.message || "Error al eliminar la actividad.");
  }
}

/* =========================================================
   Acción: crear / editar / eliminar / togglear
   ========================================================= */
$("#btnNewAction")?.addEventListener("click", () => {
  if (!CAN_EDIT) return;
  if (!(PLAN_VIEW.activities || []).length) return swalErr("Primero crea una actividad.");
  fillActivitySelect("#actSelect", PLAN_VIEW.activities);
  $("#actionTitle").value = "";
  $("#actionDesc").value = "";
  $("#formAction").dataset.editing = "";
  $("#modalAction").querySelector(".modal-title").textContent = "Nueva Acción Preventiva";
  bootstrap.Modal.getOrCreateInstance($("#modalAction")).show();
});

function fillActivitySelect(sel, activities) {
  const s = $(sel);
  if (!s) return;
  s.innerHTML = (activities || [])
    .map(a => `<option value="${a.id_activity}">${a.name_activity}</option>`)
    .join("");
}

$("#formAction")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!CAN_EDIT) return;

  const id_activity = Number($("#actSelect").value);
  const name_action = $("#actionTitle").value.trim();
  const description = $("#actionDesc").value.trim();
  if (!name_action) return swalErr("El título es requerido.");

  try {
    const editing = $("#formAction").dataset.editing;
    if (editing) {
      // NOTA: tu API no permite mover una acción de actividad; si cambia de actividad:
      const original = findActionById(Number(editing));
      const changedActivity = original?.act?.id_activity !== id_activity;

      if (changedActivity) {
        console.log("[updateAction -> MOVE] => delete + insert", { id_action: Number(editing), to_id_activity: id_activity });
        await PPA_Actions.deleteAction(Number(editing));
        await PPA_Actions.insertAction({ id_activity, name_action, description, state_action: "NUEVO" });
      } else {
        console.log("[updateAction] payload =>", { id_action: Number(editing), name_action, description });
        await PPA_Actions.updateAction(Number(editing), { name_action, description });
      }
      await swalOk("Acción guardada.");
    } else {
      console.log("[insertAction] payload =>", { id_activity, name_action, description, state_action: "NUEVO" });
      await PPA_Actions.insertAction({ id_activity, name_action, description, state_action: "NUEVO" });
      await swalOk("Acción creada.");
    }
    bootstrap.Modal.getOrCreateInstance($("#modalAction")).hide();
    await refreshPlan();
  } catch (err) {
    console.error(err);
    await swalErr(err.message || "Error al guardar la acción.");
  }
});

function findActionById(idAction) {
  for (const act of (PLAN_VIEW.activities || [])) {
    const a = (act.actions || []).find(x => x.id_action === idAction);
    if (a) return { act, action: a };
  }
  return null;
}

function onEditAction(actId, actionId) {
  if (!CAN_EDIT) return;
  fillActivitySelect("#actSelect", PLAN_VIEW.activities);
  const found = findActionById(actionId);
  if (!found) return;

  $("#actionTitle").value = found.action.name_action;
  $("#actionDesc").value = found.action.description || "";
  $("#formAction").dataset.editing = actionId;
  $("#modalAction").querySelector(".modal-title").textContent = "Editar Acción";
  $("#actSelect").value = String(actId);
  bootstrap.Modal.getOrCreateInstance($("#modalAction")).show();
}

async function onDeleteAction(idAction) {
  if (!CAN_EDIT) return;
  const ok = await swalAsk("Eliminar acción", "Esta acción se borrará del plan actual.", "Eliminar");
  if (!ok.isConfirmed) return;
  try {
    console.log("[deleteAction] =>", { id_action: idAction });
    await PPA_Actions.deleteAction(idAction);
    await swalOk("Acción eliminada.");
    await refreshPlan();
  } catch (err) {
    console.error(err);
    await swalErr(err.message || "Error al eliminar la acción.");
  }
}

async function onToggleAction(idAction, currentState) {
  if (!CAN_EDIT) return;
  const cur = String(currentState || "").toUpperCase();
  try {
    if (cur === "ACTIVO") {
      console.log("[deactivateAction] =>", { id_action: idAction });
      await PPA_Actions.deactivateAction(idAction);
    } else if (cur === "DESACTIVADO") {
      console.log("[updateAction -> ACTIVO] =>", { id_action: idAction });
      await PPA_Actions.updateAction(idAction, { state_action: "ACTIVO" });
    } else if (cur === "NUEVO") {
      console.log("[updateAction -> DESACTIVADO] =>", { id_action: idAction });
      await PPA_Actions.updateAction(idAction, { state_action: "DESACTIVADO" });
    }
    await refreshPlan();
  } catch (err) {
    console.error(err);
    await swalErr(err.message || "Error al cambiar el estado.");
  }
}

/* =========================================================
   Banco de soluciones
   ========================================================= */
$("#btnOpenBank")?.addEventListener("click", async () => {
  $("#view-plan")?.classList.add("d-none");
  $("#view-bank")?.classList.remove("d-none");
  $("#searchBank") && ($("#searchBank").value = "");
  await renderBank();
});
$("#btnBackToPlan")?.addEventListener("click", () => {
  $("#view-bank")?.classList.add("d-none");
  $("#view-plan")?.classList.remove("d-none");
});

async function renderBank() {
  const cont = $("#bankContainer");
  if (!cont) return;
  cont.innerHTML = "";

  try {
    const res = await PPA_Actions.getSolutionBankByYear(CUR_YEAR);
    console.log("[getSolutionBankByYear] =>", res);
    BANK = res?.data || [];
  } catch (err) {
    console.error(err);
    BANK = [];
  }

  const q = ($("#searchBank")?.value || "").trim().toLowerCase();
  const filtered = BANK.filter(s => {
    if (!q) return true;
    const t = `${s.type_item || ""} ${s.name_item || ""} ${s.description || ""} ${s.target_activity_name || ""}`;
    return t.toLowerCase().includes(q);
  });

  if (!filtered.length) {
    cont.innerHTML = `<div class="text-muted text-center py-5">No hay sugerencias</div>`;
    return;
  }

  filtered.forEach(s => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-4";
    col.innerHTML = `
      <div class="bank-card animate__animated animate__fadeInUp">
        <div class="d-flex align-items-center justify-content-between">
          <div class="bank-type">Tipo: ${s.type_item}</div>
          <span class="badge bg-light text-dark">${s.year_context || ""}</span>
        </div>
        <div class="fw-semibold mt-1">${s.name_item}</div>
        <div class="text-muted small mb-2">${s.description || ""}</div>
        ${s.type_item === "ACCION" && s.target_activity_name ? `<div class="small"><b>Actividad:</b> ${s.target_activity_name}</div>` : ""}
        <div class="mt-2 d-flex gap-2 ${CAN_EDIT ? "" : "d-none"}">
          <button class="btn btn-success btn-sm" data-add="${s.id_solution}">
            <i class="bi bi-plus-circle me-1"></i>Añadir al plan
          </button>
          <button class="btn btn-outline-danger btn-sm" data-del="${s.id_solution}">
            <i class="bi bi-trash3 me-1"></i>Eliminar
          </button>
        </div>
      </div>
    `;
    cont.appendChild(col);
  });

  $$("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.del);
      const ok = await swalAsk("Eliminar sugerencia", "Esta sugerencia se borrará del banco.", "Eliminar");
      if (!ok.isConfirmed) return;
      try {
        console.log("[deleteSolutionBank] =>", { id_solution: id });
        const res = await PPA_Actions.deleteSolutionBank(id);
        console.log("[deleteSolutionBank] response =>", res);
        await renderBank();
      } catch (err) {
        console.error(err);
        await swalErr(err.message || "Error al eliminar la solución.");
      }
    };
  });

  $$("[data-add]").forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.add);
      try {
        console.log("[applySolutionToPpa] =>", { id_solution: id, year: CUR_YEAR });
        const res = await PPA_Actions.applySolutionToPpa(id, CUR_YEAR);
        console.log("[applySolutionToPpa] response =>", res);
        await swalOk("Solución aplicada al plan.");
        await refreshPlan();
        await renderBank();
      } catch (err) {
        console.error(err);
        await swalErr(err.message || "Error al aplicar la solución.");
      }
    };
  });
}

$("#searchAction")?.addEventListener("input", () => renderPlan());
$("#searchBank")?.addEventListener("input", () => renderBank());
$("#btnBackToList")?.addEventListener("click", () => renderList());

/* =========================================================
   Exportar PDF
   ========================================================= */
$("#btnExportPdf")?.addEventListener("click", () => exportPlanPdf());

async function exportPlanPdf() {
  try {
    // Cargar jsPDF on-demand
    if (!window.jspdf) {
      await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
    }
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) throw new Error("jsPDF no disponible");

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;

    const title = `PLAN PREVENTIVO - ${CUR_YEAR || new Date().getFullYear()}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, margin, y);
    y += 24;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    for (const act of (PLAN_VIEW.activities || [])) {
      // Actividad
      const actTitle = `• ${act.name_activity}`;
      const actLines = doc.splitTextToSize(actTitle, width);
      doc.setFont("helvetica", "bold");
      y = addLines(doc, actLines, margin, y, width);

      if (act.description) {
        doc.setFont("helvetica", "normal");
        const dLines = doc.splitTextToSize(`  ${act.description}`, width);
        y = addLines(doc, dLines, margin, y, width);
      }

      // Acciones
      for (const acc of (act.actions || [])) {
        doc.setFont("helvetica", "normal");
        const head = `  - ${acc.name_action}  (${acc.state_action})`;
        const hLines = doc.splitTextToSize(head, width);
        y = addLines(doc, hLines, margin, y, width);

        if (acc.description) {
          const aDesc = doc.splitTextToSize(`     ${acc.description}`, width);
          y = addLines(doc, aDesc, margin, y, width);
        }
      }
      y += 8;
      // salto de página si hace falta
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage(); y = margin;
      }
    }

    const filename = `PLANPREVENTIVO-${CUR_YEAR || new Date().getFullYear()}.pdf`;
    doc.save(filename);
  } catch (err) {
    console.warn("Fallo PDF, abriendo versión para imprimir:", err);
    // Fallback: ventana imprimible
    const w = window.open("", "_blank");
    const head = `<title>PLAN PREVENTIVO - ${CUR_YEAR}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;font-size:12px;padding:24px}
      h1{font-size:18px;margin:0 0 12px} h3{margin:12px 0 6px}</style>`;
    let body = `<h1>PLAN PREVENTIVO - ${CUR_YEAR}</h1>`;
    for (const act of (PLAN_VIEW.activities || [])) {
      body += `<h3>• ${act.name_activity}</h3>`;
      if (act.description) body += `<div>${act.description}</div>`;
      body += `<ul>`;
      for (const acc of (act.actions || [])) {
        body += `<li><b>${acc.name_action}</b> (${acc.state_action})<br>${acc.description || ""}</li>`;
      }
      body += `</ul>`;
    }
    w.document.write(`<html><head>${head}</head><body>${body}</body></html>`);
    w.document.close(); w.focus(); w.print();
  }
}
function addLines(doc, lines, x, y, width) {
  const lineHeight = 14;
  for (const ln of lines) {
    if (y > doc.internal.pageSize.getHeight() - 48) {
      doc.addPage(); y = 48;
    }
    doc.text(ln, x, y);
    y += lineHeight;
  }
  return y;
}
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("No se pudo cargar " + src));
    document.head.appendChild(s);
  });
}

/* =========================================================
   Eventos de búsqueda
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const ok = await initAuth();
  if (!ok) return;
  await renderList();

  // Mostrar/ocultar botones según permisos
  ["#btnNewPlan", "#btnNewActivity", "#btnNewAction", "#btnOpenBank"]
    .forEach(sel => $(sel)?.classList.toggle("d-none", !CAN_EDIT));
});
