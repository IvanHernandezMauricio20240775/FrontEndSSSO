import {
    getAllMaintenances,
    getAllPageMaintenances,
    getMaintenanceById,
    getAllTypesMaintenance,
    createNewMaintenance,
    updateMaintenance,
    deleteMaintenance,
    MaintenanceByMemberId
} from "../Service/MaintenanceService.js";

import {
    GetAllListMemberCommite
} from "../Service/CommiteService.js";

import {
    getAllLocation
} from "../Service/LocationService.js"

document.addEventListener("DOMContentLoaded", () => {
    // --- Referencias al DOM ---
    const modalElement = document.getElementById("modal-form");
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById("maintenance-form");

    const inputId = document.getElementById("assignment-code");
    const inputDate = document.getElementById("start-date");
    const selectType = document.getElementById("maintenance-type");
    const selectLocation = document.getElementById("location");

    const btnOpenModal = document.getElementById("asignFormBtn");
    const tableBody = document.getElementById("MaintenanceTableBody");
    const searchInput = document.getElementById("Search");
    const TableAnimate = document.getElementById("TableDiv");

    const openFormBtn = document.getElementById("openFormBtn")
    const maintenancesContainer = document.getElementById("maintenancesContainer");
    const modalMemberMaintenances = new bootstrap.Modal(document.getElementById("modalMemberMaintenances"));


    // Empleados (tarjetas)
    const employeeCardsWrapper = document.getElementById("employee-cards");
    const employeeSearchInput = document.getElementById("employee-search-input");
    const formDetail = document.getElementById("formDetailMaintenance");
    const modalDetail = new bootstrap.Modal(document.getElementById("modalDetailMaintenance"));

    // Estado de miembros y selección
    let membersAll = [];
    let membersFiltered = [];
    let selectedMemberId = null; // <- se enviará en la data si está seleccionado

    // Paginación
    let currentPage = 0;
    let totalPages = 0;
    const paginationNumbersContainer = document.getElementById("paginationNumbers");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");

    // --- Event listeners para el input del ID ---
    inputId.addEventListener('input', handleMaintenanceIdInput);
    inputId.addEventListener('paste', handleMaintenanceIdInput);


    // Animación de tabla
    function applyFadeInAnimation() {
        TableAnimate.classList.remove("animate__fadeIn");
        setTimeout(() => TableAnimate.classList.add("animate__fadeIn"), 10);
    }

    // Render paginación
    function renderPageNumbers() {
        paginationNumbersContainer.innerHTML = "";
        if (totalPages <= 1) return;

        for (let i = 0; i < totalPages; i++) {
            const li = document.createElement("li");
            li.className = `page-item ${i === currentPage ? "active" : ""}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i + 1}</a>`;
            paginationNumbersContainer.appendChild(li);
        }
    }
    
    // --- Lógica para restringir el formato del ID de mantenimiento ---
    function handleMaintenanceIdInput(e) {
        const input = e.target;
        // Solo permite editar el valor si no es de solo lectura (modo de creación)
        if (!input.readOnly) {
            let value = input.value.toUpperCase();
            if (!value.startsWith("MTTO-")) {
                value = "MTTO-" + value.replace("MTTO-", "");
            }
            const numbers = value.substring(5).replace(/[^0-9]/g, '');
            input.value = "MTTO-" + numbers.substring(0, 3);
        }
    }
    
    async function LoadTypesMaintenance() {
        try {
            // Resetear selects
            selectType.innerHTML = "";
            selectLocation.innerHTML = "";

            // Cargar Tipos de Mantenimiento
            const types = await getAllTypesMaintenance();
            types.forEach(t => {
                const option = document.createElement("option");
                option.value = t.id_type_maintenance;
                option.textContent = t.name_type;
                selectType.appendChild(option);
            });

            // Cargar Ubicaciones
            const locations = await getAllLocation();
            locations.forEach(loc => {
                const option = document.createElement("option");
                option.value = loc.id_location; 
                option.textContent = loc.name_location;
                selectLocation.appendChild(option);
            });

        } catch (error) {
            console.error("Error al cargar tipos o ubicaciones:", error);
        }
    }

    // --- Cargar miembros (tarjetas) ---
    async function LoadMemberCards() {
        try {
            employeeCardsWrapper.innerHTML = "";
            const list = await GetAllListMemberCommite();
            membersAll = (list || []).filter(m =>
                (m.position || "").toLowerCase() === "mantenimiento" &&
                (m.status || "").toLowerCase() === "activo"
            );
            membersFiltered = [...membersAll];
            renderMemberCards();
        } catch (error) {
            console.error("Error al cargar miembros del comité:", error);
            employeeCardsWrapper.innerHTML = `<div class="text-muted">No se pudieron cargar los miembros.</div>`;
        }
    }

    function renderMemberCards() {
        employeeCardsWrapper.innerHTML = "";

        if (!membersFiltered.length) {
            employeeCardsWrapper.innerHTML = `<div class="text-muted py-2">Sin resultados</div>`;
            return;
        }

        membersFiltered.forEach(m => {
            const card = document.createElement("div");
            card.className = "employee-card";
            card.dataset.id = m.id_member;

            if (String(m.id_member) === String(selectedMemberId)) {
                card.classList.add("selected");
            }

            card.innerHTML = `
                <div class="employee-card-inner d-flex align-items-center gap-3 p-2 border rounded-3 position-relative">
                    <img src="${m.image || 'https://via.placeholder.com/48'}" alt="${m.full_name || 'Empleado'}" class="rounded-circle" width="48" height="48">
                    <div class="flex-grow-1">
                        <div class="fw-semibold">${m.full_name || '—'}</div>
                        <div class="small text-muted">${m.department || 'Sin depto.'} • ${m.position || ''}</div>
                        <div class="small ${((m.status || '').toLowerCase() === 'activo') ? 'text-success' : 'text-muted'}">${m.status || ''}</div>
                    </div>
                    <button class="btn btn-sm btn-outline-secondary ms-auto select-btn">Seleccionar</button>
                    <button class="btn btn-sm btn-link text-danger position-absolute top-0 end-0 remove-selection" title="Quitar selección" style="display:${String(m.id_member) === String(selectedMemberId) ? 'block' : 'none'}">✕</button>
                </div>
            `;
            employeeCardsWrapper.appendChild(card);
        });
    }

    function highlightSelectedCard() {
        const cards = employeeCardsWrapper.querySelectorAll(".employee-card");
        cards.forEach(card => {
            const isSelected = String(card.dataset.id) === String(selectedMemberId);
            card.classList.toggle("selected", isSelected);
            const removeBtn = card.querySelector(".remove-selection");
            if (removeBtn) removeBtn.style.display = isSelected ? "block" : "none";
            const selectBtn = card.querySelector(".select-btn");
            if (selectBtn) selectBtn.textContent = isSelected ? "Seleccionado" : "Seleccionar";
        });
    }

    // Delegación de eventos en tarjetas
    employeeCardsWrapper.addEventListener("click", (e) => {
        const remove = e.target.closest(".remove-selection");
        const select = e.target.closest(".select-btn");
        const card = e.target.closest(".employee-card");
        if (!card) return;

        const id = card.dataset.id;

        if (remove) {
            selectedMemberId = null;
            highlightSelectedCard();
            return;
        }

        if (select || card) {
            selectedMemberId = id;
            highlightSelectedCard();
        }
    });

    // Búsqueda en tarjetas
    employeeSearchInput.addEventListener("input", () => {
        const q = employeeSearchInput.value.trim().toLowerCase();
        if (!q) {
            membersFiltered = [...membersAll];
        } else {
            membersFiltered = membersAll.filter(m =>
                String(m.id_member).toLowerCase().includes(q) ||
                (m.full_name || "").toLowerCase().includes(q) ||
                (m.department || "").toLowerCase().includes(q) ||
                (m.nit || "").toLowerCase().includes(q)
            );
        }
        renderMemberCards();
        highlightSelectedCard();
    });

    // --- Cargar mantenimientos en tabla ---
    async function LoadAllMaintenances() {
        applyFadeInAnimation();
        tableBody.innerHTML = "";
        try {
            const response = await getAllPageMaintenances(currentPage, 6);
            const maintenances = response.content || response.data?.content || [];
            totalPages = response.totalPages || response.data?.totalPages || 0;

            if (maintenances.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No hay mantenimientos registrados</td></tr>`;
                return;
            }

            maintenances.forEach(m => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td class="px-3">#${m.id_maintenance}</td>
                    <td class="px-3">${m.id_type_maintenance}</td>
                    <td class="px-3">${m.id_location || "-"}</td>
                    <td class="px-3">${m.id_member}</td>
                    <td class="px-3">${m.state_maintenance}</td>
                    <td class="px-3">
                        <a href="#" class="action-btn me-2 btn-edit-maintenance" data-id="${m.id_maintenance}"><i class="fa-solid fa-pen-to-square"></i></a>
                        <a href="#" class="action-btn text-danger btn-delete-maintenance" data-id="${m.id_maintenance}"><i class="fa-solid fa-trash-can"></i></a>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            renderPageNumbers();
        } catch (error) {
            console.error("Error al cargar mantenimientos:", error);
        }
    }
    
    // --- Lógica de validación del formulario ---
    function validateMaintenanceForm() {
        const isCreating = form.dataset.action === "create";
        
        // 1. Validar ID
        const id = inputId.value;
        if (isCreating) {
            const regex = /^MTTO-\d{3}$/;
            if (!regex.test(id)) {
                Swal.fire("Error de validación", "El código debe ser del formato MTTO-XXX, donde X son 3 dígitos. Ej: MTTO-001", "error");
                return false;
            }
        }

        // 2. Validar fecha
        const date = inputDate.value;
        if (!date) {
            Swal.fire("Error de validación", "La fecha de mantenimiento no puede estar vacía.", "error");
            return false;
        }
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Ignorar la hora para comparar solo el día

        if (selectedDate < today) {
            Swal.fire("Error de validación", "La fecha de mantenimiento no puede ser una fecha pasada.", "error");
            return false;
        }

        // 3. Validar otros campos
        if (!selectType.value) {
            Swal.fire("Error de validación", "Debe seleccionar un tipo de mantenimiento.", "error");
            return false;
        }

        if (!selectLocation.value) {
            Swal.fire("Error de validación", "Debe seleccionar una ubicación.", "error");
            return false;
        }
        
        if (!selectedMemberId) {
             Swal.fire("Error de validación", "Debe seleccionar un miembro del comité.", "error");
             return false;
        }
        
        return true;
    }


    // --- Abrir modal para nuevo mantenimiento ---
    btnOpenModal.addEventListener("click", () => {
        form.reset();
        inputId.value = "MTTO-";
        inputId.readOnly = false;
        form.dataset.action = "create";
        selectedMemberId = null;
        modal.show();
        LoadTypesMaintenance();
        LoadMemberCards();
    });

    // --- Guardar mantenimiento (crear/actualizar) ---
    form.addEventListener("submit", async e => {
        e.preventDefault();

        if (!validateMaintenanceForm()) {
            return;
        }
        
        const memberIdToSend = selectedMemberId;

        const data = {
            id_maintenance: inputId.value,
            date_maintenance: inputDate.value,
            state_maintenance: "PENDIENTE",
            id_member: parseInt(memberIdToSend, 10),
            id_location: selectLocation.value,
            id_type_maintenance: parseInt(selectType.value, 10)
        };

        try {
            if (form.dataset.action === "create") {
                await createNewMaintenance(data);
                Swal.fire("Éxito", "Mantenimiento creado correctamente", "success");
            } else {
                const id = form.dataset.id;
                await updateMaintenance(id, data);
                Swal.fire("Éxito", "Mantenimiento actualizado correctamente", "success");
            }
            modal.hide();
            LoadAllMaintenances();
        } catch (error) {
            console.error("Error al guardar:", error);
            Swal.fire("Error", error.message || "No se pudo guardar el mantenimiento", "error");
        }
    });

    // --- Editar mantenimiento ---
    tableBody.addEventListener("click", async e => {
        if (e.target.closest(".btn-edit-maintenance")) {
            const id = e.target.closest(".btn-edit-maintenance").dataset.id;
            try {
                const response = await getMaintenanceById(id);

                const m = response.data;

                form.reset();
                inputId.value = m.id_maintenance;
                inputId.readOnly = true;
                inputDate.value = m.date_maintenance ? m.date_maintenance.split("T")[0] : "";

                await LoadTypesMaintenance();

                selectLocation.value = m.id_location || "";
                selectType.value = m.id_type_maintenance;

                selectedMemberId = m.id_member ? String(m.id_member) : null;
                await LoadMemberCards();
                highlightSelectedCard();

                form.dataset.action = "update";
                form.dataset.id = id;
                modal.show();
            } catch (error) {
                console.error("Error al obtener mantenimiento:", error);
            }
        }
    });

    // --- Eliminar mantenimiento ---
    tableBody.addEventListener("click", async e => {
        if (e.target.closest(".btn-delete-maintenance")) {
            const id = e.target.closest(".btn-delete-maintenance").dataset.id;
            const confirm = await Swal.fire({
                title: "¿Eliminar?",
                text: "Este mantenimiento se eliminará permanentemente",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar"
            });

            if (confirm.isConfirmed) {
                try {
                    await deleteMaintenance(id);
                    Swal.fire("Eliminado", "Mantenimiento eliminado", "success");
                    LoadAllMaintenances();
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    Swal.fire("Error", "No se pudo eliminar el mantenimiento", "error");
                }
            }
        }
    });

    // --- Filtro búsqueda (tabla) ---
    searchInput.addEventListener("input", async () => {
        const query = searchInput.value.toLowerCase();
        try {
            const response = await getAllMaintenances();
            const filtered = response.filter(m =>
                (m.id_maintenance || "").toLowerCase().includes(query) ||
                (m.id_location || "").toLowerCase().includes(query) ||
                (m.state_maintenance || "").toLowerCase().includes(query)
            );

            tableBody.innerHTML = "";
            if (filtered.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No se encontraron resultados</td></tr>`;
                return;
            }

            filtered.forEach(m => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td class="px-3">#${m.id_maintenance}</td>
                    <td class="px-3">${m.id_type_maintenance}</td>
                    <td class="px-3">${m.id_location || "-"}</td>
                    <td class="px-3">${m.id_member}</td>
                    <td class="px-3">${m.state_maintenance}</td>
                    <td class="px-3">
                        <a href="#" class="action-btn me-2 btn-edit-maintenance" data-id="${m.id_maintenance}"><i class="fa-solid fa-pen-to-square"></i></a>
                        <a href="#" class="action-btn text-danger btn-delete-maintenance" data-id="${m.id_maintenance}"><i class="fa-solid fa-trash-can"></i></a>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            console.error("Error en búsqueda:", error);
        }
    });

    // --- Paginación ---
    paginationNumbersContainer.addEventListener("click", e => {
        if (e.target.tagName === "A") {
            e.preventDefault();
            currentPage = parseInt(e.target.dataset.page);
            LoadAllMaintenances();
        }
    });
    prevPageBtn.addEventListener("click", e => {
        e.preventDefault();
        if (currentPage > 0) {
            currentPage--;
            LoadAllMaintenances();
        }
    });
    nextPageBtn.addEventListener("click", e => {
        e.preventDefault();
        if (currentPage < totalPages - 1) {
            currentPage++;
            LoadAllMaintenances();
        }
    });

    // Inicial
    LoadAllMaintenances();


    async function loadMaintenancesByMember(idMember) {
        maintenancesContainer.innerHTML = "";
        const response = await MaintenanceByMemberId(idMember);

        if (!response.status || !response.data) {
            maintenancesContainer.innerHTML = `<div class="alert alert-warning">No tienes mantenimientos asignados</div>`;
            return;
        }

        response.data.forEach(m => {
            const card = document.createElement("div");
            card.className = "col-md-4";

            card.innerHTML = `
          <div class="card shadow-sm border-0 rounded-4 h-100">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title text-primary fw-bold">${m.id_type_maintenance}</h5>
              <p class="text-muted mb-1"><i class="bi bi-calendar-event"></i> ${m.date_maintenance}</p>
              <p class="mb-1"><i class="bi bi-geo-alt"></i> ${m.id_location}</p>
              <span class="badge ${m.state_maintenance === 'PENDIENTE' ? 'bg-warning text-dark' : 'bg-danger'} mb-3">
                ${m.state_maintenance}
              </span>
              <button class="btn btn-success mt-auto btn-empezar" data-id="${m.id_maintenance}">
                <i class="bi bi-play-circle"></i> Empezar
              </button>
            </div>
          </div>
        `;

            maintenancesContainer.appendChild(card);
        });

        document.querySelectorAll(".btn-empezar").forEach(btn => {
            btn.addEventListener("click", e => {
                const idMaintenance = e.target.closest("button").dataset.id;
                document.getElementById("inputIdAssignMaintenance").value = idMaintenance;
                formDetail.dataset.action = "create";
                modalDetail.show();
            });
        });
    }

    openFormBtn.addEventListener("click", () => {
        loadMaintenancesByMember(2);
        modalMemberMaintenances.show();
    });
});