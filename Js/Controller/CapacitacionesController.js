// Controller/CapacitacionesController.js
import { GetAllTraining, ProgramNewTraining, UpdatedTraining, DeleteTraining } from "../Service/CapacitacionesService.js";
import { getAllBrigades } from "../Service/BrigadeService.js";
import { AuthStatus } from "../Service/AuthService.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ====== DOM refs ======
  const mainTimeline = document.getElementById("main-timeline");
  const formCapacitacion = document.getElementById("form-capacitacion");
  const modalCapacitacion = new bootstrap.Modal(document.getElementById("modal-capacitacion"));
  const btnProgramTraining = document.getElementById("BtnProgramTraining");
  const btnSubmitForm = document.getElementById("submit-btn");
  const brigadaOptionsContainer = document.querySelector(".brigada-options");
  const asignarTodasSwitch = document.getElementById("asignar-todas");
  const pendientesCount = document.getElementById("pendientes-count");
  const completadasCount = document.getElementById("completadas-count");
  const searchInput = document.getElementById("search-input");
  const btnPendientes = document.getElementById("btn-pendientes");
  const btnCompletadas = document.getElementById("btn-completadas");

  const inputID = document.getElementById("ID_Training");
  const inputNombre = document.getElementById("nombre-capacitacion");
  const inputFecha = document.getElementById("fecha-ejecucion");
  const inputHora = document.getElementById("hora-capacitacion");
  const inputDescripcion = document.getElementById("descripcion-capacitacion");
  const inputStatus = document.getElementById("estado-capacitacion"); // select/text PENDIENTE|COMPLETADA

  // ====== Estado ======
  let allTrainings = [];
  let allBrigades = [];
  let currentFilter = "PENDIENTE";
  let canManage = false;
  let countdownTimer = null;

  // ====== Utils ======
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  function handleResponseError(error, customMessage) {
    console.error(error);
    const errorMessage = error?.message || "Ocurrió un error inesperado.";
    Swal.fire({ icon: "error", title: "¡Error!", text: `${customMessage || "Hubo un problema con la operación."} Detalles: ${errorMessage}`, confirmButtonColor: "#169b87" });
  }

  const normalize = (s) => (s || "").toString().toLowerCase().trim();
  const pad3 = (n) => String(n).padStart(3, "0");
  const extractNumFromId = (id) => { const m = /^CPT-(\d{1,})$/i.exec(id || ""); return m ? parseInt(m[1], 10) : null; };
  const getNextTrainingId = (arr) => `CPT-${pad3(arr.map(t => extractNumFromId(t?.id_training)).filter(Number.isInteger).reduce((a,b)=>Math.max(a,b),0) + 1)}`;

  // Combina fecha y hora (local)
  const getStartDate = (training) => {
    const date = (training?.date_training || "").trim();        // YYYY-MM-DD
    const time = (training?.time_training || "00:00").trim();   // HH:mm
    const iso = `${date}T${time.length === 5 ? time : time.slice(0,5)}`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatCountdown = (msDiff) => {
    const abs = Math.abs(msDiff);
    const sec = Math.floor(abs / 1000) % 60;
    const min = Math.floor(abs / (1000 * 60)) % 60;
    const hr  = Math.floor(abs / (1000 * 60 * 60)) % 24;
    const day = Math.floor(abs / (1000 * 60 * 60 * 24));
    return { day, hh: String(hr).padStart(2,"0"), mm: String(min).padStart(2,"0"), ss: String(sec).padStart(2,"0"), future: msDiff > 0 };
  };

  const countdownLabel = (startDate) => {
    if (!startDate) return "";
    const now = new Date();
    const diff = startDate.getTime() - now.getTime();
    const { day, hh, mm, ss, future } = formatCountdown(diff);
    return future ? `Faltan ${day} día${day!==1?"s":""} ${hh}:${mm}:${ss}` : `Inició hace ${day} día${day!==1?"s":""} ${hh}:${mm}:${ss}`;
  };

  function startCountdownTicker() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      document.querySelectorAll("[data-countdown-id]").forEach(el => {
        const id = el.getAttribute("data-countdown-id");
        const tr = allTrainings.find(t => t.id_training === id);
        const start = getStartDate(tr);
        el.textContent = start ? countdownLabel(start) : "";
      });
    }, 1000);
  }

  // Muestra/oculta el campo de estado según modo
  function toggleStatusVisibility(mode /* 'insert' | 'update' */) {
    if (!inputStatus) return;
    const wrapper = inputStatus.closest(".form-group, .mb-3, .col-12, .form-floating, .input-group") || inputStatus;
    // En crear (insert) se oculta; en update se muestra
    wrapper.classList.toggle("d-none", mode === "insert");
  }

  // ====== Auth & permisos (LEYENDO DESDE .data) ======
  async function enforceAuth() {
    try {
      const meResp = await AuthStatus();
      const me = meResp?.data ?? meResp; // <-- soporta .data o plano

      const role = (me?.role || "").toString().toUpperCase();
      const rawCommittee = me?.committeRole ?? me?.committeeRole ?? null;
      const committeeArray = Array.isArray(rawCommittee) ? rawCommittee : [rawCommittee].filter(Boolean);
      const committeeUpper = committeeArray.map(x => (x || "").toString().toUpperCase());

      const elevatedCommittee = ["PRESIDENTE", "SECRETARIO", "VICEPRESIDENTE"];
      const isElevatedCommittee = committeeUpper.some(c => elevatedCommittee.includes(c));

      canManage = (role === "ADMINISTRADOR") || (role === "USUARIO" && isElevatedCommittee);

      if (btnProgramTraining) {
        if (canManage) { btnProgramTraining.classList.remove("d-none"); btnProgramTraining.disabled = false; }
        else { btnProgramTraining.classList.add("d-none"); btnProgramTraining.disabled = true; }
      }
    } catch {
      canManage = false;
      if (btnProgramTraining) { btnProgramTraining.classList.add("d-none"); btnProgramTraining.disabled = true; }
      console.warn("AuthStatus falló; modo solo lectura.");
    }
  }

  // ====== Data ======
  async function loadData() {
    try {
      allBrigades = await getAllBrigades();
      renderBrigadeOptions(allBrigades);
      allTrainings = await GetAllTraining();
      renderTrainings(allTrainings);
      updateMetrics();
      startCountdownTicker();
    } catch (error) {
      handleResponseError(error, "No se pudieron cargar los datos iniciales.");
    }
  }

  function renderBrigadeOptions(brigades) {
    brigadaOptionsContainer.innerHTML = "";
    brigades.forEach(brigade => {
      brigadaOptionsContainer.insertAdjacentHTML("beforeend", `
        <div class="brigada-card d-flex align-items-center gap-2">
          <img src="${brigade.img_Brigade || 'img/default.png'}" alt="${brigade.name_Brigade}" class="brigada-icon" />
          <span class="flex-grow-1">${brigade.name_Brigade}</span>
          <input class="form-check-input ms-auto" type="checkbox" name="brigada" value="${brigade.ID_brigade}" />
        </div>
      `);
    });
  }

  asignarTodasSwitch?.addEventListener("change", (e) => {
    brigadaOptionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = e.target.checked);
  });

  function renderTrainings(trainings) {
    mainTimeline.innerHTML = "";

    const term = normalize(searchInput?.value);
    const filtered = trainings.filter(training => {
      const matchesStatus = training?.Status_Training === currentFilter;

      const nameMatch = normalize(training?.name_training).includes(term);
      const idMatch   = normalize(training?.id_training).includes(term);

      const brigNames = (training?.list_brigades_id || [])
        .map(id => allBrigades.find(b => b.ID_brigade === id)?.name_Brigade || "")
        .join(" | ")
        .toLowerCase();
      const brigMatch = brigNames.includes(term);

      return matchesStatus && (term === "" || nameMatch || idMatch || brigMatch);
    });

    if (!filtered.length) {
      mainTimeline.innerHTML = `<p class="text-center text-muted">No hay capacitaciones para mostrar.</p>`;
      return;
    }

    filtered.forEach(training => {
      const brigadesNames = (training.list_brigades_id || [])
        .map(id => allBrigades.find(b => b.ID_brigade === id)?.name_Brigade || "Brigada Desconocida")
        .join(", ");

      const start = getStartDate(training);
      const countdownText = start ? countdownLabel(start) : "";

      const actionsHtml = canManage ? `
        <button class="btn btn-sm btn-outline-info edit-btn" data-id="${training.id_training}">Editar</button>
        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${training.id_training}">Eliminar</button>
      ` : "";

      const badgeClass = training.Status_Training === "COMPLETADA" ? "bg-success" : "bg-warning text-dark";

      mainTimeline.insertAdjacentHTML("beforeend", `
        <div class="entry">
          <div class="content">
            <h3 class="mb-1">${training.name_training}</h3>
            <p class="mb-2">${training.description || ""}</p>
            <div class="d-flex flex-wrap gap-3 small text-muted mb-2">
              <span class="fecha">📅 Fecha: ${training.date_training}</span>
              <span class="Time">🕒 Hora: ${training.time_training}</span>
              <span>🧑‍⚕️ Brigadas: ${brigadesNames}</span>
            </div>
            <div class="d-flex align-items-center justify-content-between">
              <div class="actions d-flex gap-2">
                ${actionsHtml}
                <span class="badge ${badgeClass} align-self-center">${training.Status_Training}</span>
              </div>
              <small class="text-muted" data-countdown-id="${training.id_training}">${countdownText}</small>
            </div>
          </div>
        </div>
      `);
    });
  }

  function updateMetrics() {
    const pendientes = allTrainings.filter(t => t.Status_Training === "PENDIENTE").length;
    const completadas = allTrainings.filter(t => t.Status_Training === "COMPLETADA").length;
    if (pendientesCount) pendientesCount.textContent = pendientes;
    if (completadasCount) completadasCount.textContent = completadas;
  }

  // ====== Filtros y búsqueda ======
  btnPendientes?.addEventListener("click", () => {
    currentFilter = "PENDIENTE";
    btnPendientes.classList.add("active");
    btnCompletadas?.classList.remove("active");
    renderTrainings(allTrainings);
  });

  btnCompletadas?.addEventListener("click", () => {
    currentFilter = "COMPLETADA";
    btnCompletadas.classList.add("active");
    btnPendientes?.classList.remove("active");
    renderTrainings(allTrainings);
  });

  searchInput?.addEventListener("input", debounce(() => renderTrainings(allTrainings), 200));

  // ====== Programar (crear) ======
  btnProgramTraining?.addEventListener("click", () => {
    if (!canManage) {
      return Swal.fire({ icon: "warning", title: "Sin permisos", text: "No cuentas con permisos para programar capacitaciones.", confirmButtonColor: "#169b87" });
    }
    formCapacitacion.reset();
    btnSubmitForm.textContent = "Programar Capacitación";
    btnSubmitForm.dataset.mode = "insert";

    const nextId = getNextTrainingId(allTrainings);
    inputID.value = nextId;
    inputID.disabled = true;

    // Estado por defecto y oculto en crear
    if (inputStatus) inputStatus.value = "PENDIENTE";
    toggleStatusVisibility("insert");

    asignarTodasSwitch && (asignarTodasSwitch.checked = false);
    brigadaOptionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => (cb.checked = false));

    modalCapacitacion.show();
  });

  // ====== Submit (insert/update) ======
  formCapacitacion?.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canManage) {
      return Swal.fire({ icon: "warning", title: "Sin permisos", text: "No cuentas con permisos para realizar esta acción.", confirmButtonColor: "#169b87" });
    }

    if (!formCapacitacion.checkValidity()) {
      formCapacitacion.classList.add("was-validated");
      return;
    }

    const mode = btnSubmitForm.dataset.mode;
    const selectedBrigades = Array
      .from(document.querySelectorAll('input[name="brigada"]:checked'))
      .map(cb => cb.value);

    if (selectedBrigades.length === 0) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "Debes seleccionar al menos una brigada para la capacitación.", confirmButtonColor: "#169b87" });
    }

    // *** Validación de FECHA/HORA pasada SOLO EN CREAR ***
    if (mode === "insert") {
      const dateStr = (inputFecha.value || "").trim();   // YYYY-MM-DD
      const timeStr = (inputHora.value || "").trim();    // HH:mm
      const start = getStartDate({ date_training: dateStr, time_training: timeStr });
      const now = new Date();
      if (!start || isNaN(start.getTime())) {
        return Swal.fire({ icon: "warning", title: "Fecha/Hora inválida", text: "Revisa la fecha y la hora de la capacitación.", confirmButtonColor: "#169b87" });
      }
      if (start.getTime() <= now.getTime()) {
        return Swal.fire({ icon: "warning", title: "Fecha pasada", text: "No puedes programar una capacitación en una fecha u hora pasada.", confirmButtonColor: "#169b87" });
      }
    }

    const trainingData = {
      id_training: inputID.value,
      name_training: inputNombre.value,
      date_training: inputFecha.value,
      time_training: inputHora.value,
      img_training: "https://ejemplo.com/imagen.png", // placeholder
      description: inputDescripcion.value,
      // En crear siempre PENDIENTE; en update usa el valor del select
      Status_Training: mode === "update" ? (inputStatus?.value || "PENDIENTE") : "PENDIENTE",
      list_brigades_id: selectedBrigades,
    };

    try {
      if (mode === "insert") {
        await ProgramNewTraining(trainingData);
        Swal.fire({ icon: "success", title: "¡Éxito!", text: "Capacitación programada correctamente.", confirmButtonColor: "#169b87" });
      } else {
        await UpdatedTraining(trainingData.id_training, trainingData);
        Swal.fire({ icon: "success", title: "¡Éxito!", text: "Capacitación actualizada correctamente.", confirmButtonColor: "#169b87" });
      }
      modalCapacitacion.hide();
      formCapacitacion.classList.remove("was-validated");
      await loadData();
    } catch (error) {
      handleResponseError(error, "No se pudo completar la operación.");
    }
  });

  // ====== Acciones en tarjetas ======
  mainTimeline?.addEventListener("click", async (e) => {
    // Editar
    if (e.target.classList.contains("edit-btn")) {
      if (!canManage) {
        return Swal.fire({ icon: "warning", title: "Sin permisos", text: "No cuentas con permisos para editar esta capacitación.", confirmButtonColor: "#169b87" });
      }
      const trainingId = e.target.dataset.id;
      const tr = allTrainings.find(t => t.id_training === trainingId);
      if (tr) {
        inputID.value = tr.id_training; inputID.disabled = true;
        inputNombre.value = tr.name_training;
        inputFecha.value = tr.date_training;
        inputHora.value = tr.time_training;
        inputDescripcion.value = tr.description || "";

        if (inputStatus) inputStatus.value = tr.Status_Training;
        toggleStatusVisibility("update"); // <-- mostrar estado en edición

        const cbs = brigadaOptionsContainer.querySelectorAll('input[name="brigada"]');
        cbs.forEach(cb => cb.checked = (tr.list_brigades_id || []).includes(cb.value));

        btnSubmitForm.textContent = "Actualizar Capacitación";
        btnSubmitForm.dataset.mode = "update";
        modalCapacitacion.show();
      }
    }

    // Eliminar
    if (e.target.classList.contains("delete-btn")) {
      if (!canManage) {
        return Swal.fire({ icon: "warning", title: "Sin permisos", text: "No cuentas con permisos para eliminar esta capacitación.", confirmButtonColor: "#169b87" });
      }
      const trainingId = e.target.dataset.id;
      const result = await Swal.fire({
        title: "¿Estás seguro?",
        text: "¡No podrás revertir esto!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });
      if (result.isConfirmed) {
        try {
          await DeleteTraining(trainingId);
          Swal.fire({ icon: "success", title: "¡Eliminado!", text: "La capacitación ha sido eliminada.", confirmButtonColor: "#169b87" });
          await loadData();
        } catch (error) {
          handleResponseError(error, "No se pudo eliminar la capacitación.");
        }
      }
    }
  });

  // ====== Boot ======
  await enforceAuth();
  await loadData();
});
