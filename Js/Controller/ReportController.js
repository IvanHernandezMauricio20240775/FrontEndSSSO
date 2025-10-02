import {
    getAllTypeReports,
    getAllReports,
    getAllReportsByNit,
    getReportById,
    insertReport,
    updateReport,
    deleteReport,
} from "../Service/CategoryReportService.js";

import {
    getAllLocation
} from "../Service/LocationService.js";

import {
    AuthStatus
} from "../Service/AuthService.js"

// El helper de JWT ya no es necesario ya que usaremos el método AuthService.AuthStatus
// Helper para leer una cookie por nombre (sin cambios)
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

document.addEventListener("DOMContentLoaded", init);

/* -------------------- Estado y Referencias -------------------- */
let typesCache = [];
let reportsCache = [];
let currentUserNit = null;
let currentUserRole = null;
let currentReportId = null;



/* -------------------- Elementos del DOM -------------------- */
let riskCardsContainer,
    riskFormModalElement,
    riskFormModal,
    riskReportForm,
    tipoRiesgoSelect,
    ubicacionSelect,
    codigoInput,
    probabilidadSelect,
    impactoSelect,
    nivelRiesgoInput,
    descripcionInput,
    evidenciaInputs,
    submitBtn,
    reportsList;

/* -------------------- Init -------------------- */
async function init() {
    // 1. Obtener datos del usuario del token JWT a través de AuthService
    const authStatus = await AuthStatus();
    if (authStatus.ok && authStatus.data) {
        currentUserNit = authStatus.data.nit;
        currentUserRole = authStatus.data.role;
    } else {
        console.warn("Rol o NIT de usuario no definido, no se cargarán reportes correctamente.");
        window.location.href = '/login.html';
    }

    // Cache de elementos
    riskCardsContainer = document.getElementById("risk-cards-container");
    riskFormModalElement = document.getElementById("riskFormModal");
    riskFormModal = new bootstrap.Modal(riskFormModalElement);
    riskReportForm = document.getElementById("risk-report-form");
    tipoRiesgoSelect = document.getElementById("tipoRiesgo");
    ubicacionSelect = document.getElementById("ubicacion");
    codigoInput = document.getElementById("codigo");
    probabilidadSelect = document.getElementById("probabilidad");
    impactoSelect = document.getElementById("impacto");
    nivelRiesgoInput = document.getElementById("nivelRiesgo");
    descripcionInput = document.getElementById("descripcion");
    evidenciaInputs = [
        document.getElementById("evidencia1"),
        document.getElementById("evidencia2"),
        document.getElementById("evidencia3"),
    ];
    submitBtn = document.getElementById("submit-btn");
    reportsList = document.getElementById("reports-list");

    // Listeners
    riskReportForm.addEventListener("submit", onSubmitForm);
    probabilidadSelect.addEventListener("change", onMatrixChange);
    impactoSelect.addEventListener("change", onMatrixChange);
    evidenciaInputs.forEach((inp) => inp.addEventListener("change", updateFilePreviewAndValidation));
    tipoRiesgoSelect.addEventListener("change", checkFormValidity);
    ubicacionSelect.addEventListener("change", checkFormValidity);
    descripcionInput.addEventListener("input", checkFormValidity);

    // Cargar catálogos y data
    await loadTypesAndRender();
    await fillUbicaciones();
    await loadReportsAndRender();
}

/* -------------------- Lógica de Carga y Roles -------------------- */
/* -------------------- Lógica de Carga y Roles -------------------- */
async function loadTypesAndRender() {
    try {
        const types = await getAllTypeReports();
        // Aquí se corrige el problema: el servicio ya no devuelve "data",
        // sino el array directamente.
        typesCache = types.map(item => ({
            idTypeRisk: item.ID_TYPERISK,
            nameTypeRisk: item.NAME_TYPERISK,
            descriptionTypeRisk: item.DESCRIPTION_TYPERISK
        }));
        renderRiskCards(typesCache);
        fillTiposToSelect(typesCache);
    } catch (err) {
        console.error("Error cargando tipos de riesgo:", err);
        riskCardsContainer.innerHTML = `<div class="text-danger small">No fue posible cargar los tipos de riesgo.</div>`;
    }
}
/* -------------------- Lógica de Carga y Roles -------------------- */
async function loadReportsAndRender() {
    try {
        let response;
        if (currentUserRole === "Administrador") {
            // Asume que getAllReports devuelve el array directamente
            response = await getAllReports();
        } else if (currentUserRole === "Usuario" && currentUserNit) {
            console.log(currentUserNit);
            // El servicio getAllReportsByNit ya devuelve el objeto JSON, no una Response
            response = await getAllReportsByNit(currentUserNit);
            console.log(response);

            // Revisa si la respuesta de la API indica un error
            if (response && !response.status) {
                throw new Error(response.message || 'Error al obtener los Reportes por NIT.');
            }
        } else {
            console.warn("Rol o NIT de usuario no definido, no se cargarán reportes.");
            reportsList.innerHTML = `<tr><td colspan="5" class="text-info small">Inicie sesión para ver sus reportes.</td></tr>`;
            return;
        }

        // Asigna el array de reportes desde la propiedad 'data' de la respuesta
        const reportsCache = response.data || [];
        renderReportsTable(reportsCache);

    } catch (err) {
        console.error("Error cargando reportes:", err);
        reportsList.innerHTML = `<tr><td colspan="5" class="text-danger small">No fue posible cargar los reportes.</td></tr>`;
    }
}

/* -------------------- Render Tarjetas y Tabla -------------------- */

function renderRiskCards(typeList = []) {
    riskCardsContainer.innerHTML = "";
    if (!Array.isArray(typeList) || typeList.length === 0) {
        riskCardsContainer.innerHTML = `<div class="text-muted small">No hay tipos de riesgo disponibles.</div>`;
        return;
    }
    const frag = document.createDocumentFragment();
    typeList.forEach((t) => {
        const card = document.createElement("div");
        card.className = "col-6 col-md-3";
        card.innerHTML = `
            <div class="card h-100 cursor-pointer" data-risk-type="${t.idTypeRisk}">
                <div class="card-body d-flex flex-column align-items-center text-center">
                    <div class="rounded-circle d-flex align-items-center justify-content-center mb-2" 
                         style="width:64px;height:64px;border:2px solid #20A2A0;font-weight:700;">
                        ${(t.nameTypeRisk || "?").trim().charAt(0).toUpperCase()}
                    </div>
                    <h6 class="card-title mb-1">${t.nameTypeRisk}</h6>
                </div>
            </div>
        `;
        card.querySelector('.card').addEventListener("click", () => openModalForCreate(t.idTypeRisk));
        frag.appendChild(card);
    });
    riskCardsContainer.appendChild(frag);
}

/* -------------------- Render Tarjetas y Tabla -------------------- */

function renderReportsTable(reports) {
    reportsList.innerHTML = "";
    if (!Array.isArray(reports) || reports.length === 0) {
        reportsList.innerHTML = `<tr><td colspan="5" class="text-muted text-center">No se encontraron reportes.</td></tr>`;
        return;
    }
    const frag = document.createDocumentFragment();
    reports.forEach((report) => {
        // Valida si report.typeRisk existe para evitar el error
    
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${report.ID_REPORTRISK}</td>
            <td>${new Date(report.DT_IDENTIFICATION).toLocaleDateString()}</td>
            <td>${report.ID_TYPERISK}</td> <td>${report.STATUSRISK}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-info view-btn" data-id="${report.ID_REPORTRISK}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-primary edit-btn" data-id="${report.ID_REPORTRISK}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${report.ID_REPORTRISK}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        frag.appendChild(row);
    });
    reportsList.appendChild(frag);
    document.querySelectorAll(".edit-btn").forEach(btn => btn.addEventListener("click", onEditReport));
    document.querySelectorAll(".delete-btn").forEach(btn => btn.addEventListener("click", onDeleteReport));
    document.querySelectorAll(".view-btn").forEach(btn => btn.addEventListener("click", onViewReport));
}

function fillTiposToSelect(typeList = []) {
    tipoRiesgoSelect.innerHTML = `<option value="" disabled selected>Seleccione</option>`;
    typeList.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.idTypeRisk;
        opt.textContent = t.nameTypeRisk;
        tipoRiesgoSelect.appendChild(opt);
    });
}

async function fillUbicaciones() {
    try {
        const locations = await getAllLocation();
        ubicacionSelect.innerHTML = `<option value="" disabled selected>Seleccione</option>`;
        locations.forEach((u) => {
            const opt = document.createElement("option");
            opt.value = u.id_location;
            opt.textContent = u.name_location;
            ubicacionSelect.appendChild(opt);
        });
    } catch (err) {
        console.error("Error al cargar ubicaciones:", err);
    }
}


/* -------------------- Lógica del Modal (CRUD) -------------------- */
function resetForm() {
    riskReportForm.reset();
    submitBtn.textContent = "Reportar Riesgo";
    codigoInput.value = "";
    currentReportId = null;
    tipoRiesgoSelect.disabled = false;
    nivelRiesgoInput.value = "";
    evidenciaInputs.forEach(input => {
        input.value = '';
        const preview = input.closest('.file-upload-wrapper').querySelector('.preview-image');
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        const icon = input.closest('.file-upload-wrapper').querySelector('.file-upload-button i');
        if (icon) {
            icon.style.display = 'block';
        }
    });
}

function openModalForCreate(riskTypeId = null) {
    resetForm();
    if (riskTypeId) {
        tipoRiesgoSelect.value = riskTypeId;
        tipoRiesgoSelect.disabled = true;
    } else {
        tipoRiesgoSelect.disabled = false;
    }
    onMatrixChange();
    riskFormModal.show();
}
async function onEditReport(e) {
    const reportId = e.currentTarget.dataset.id;
    console.log(reportId)
    try {
        const response = await getReportById(reportId);
        
        // CORRECCIÓN CLAVE: Accede al objeto 'data'
        const report = response.data; 

        if (!report) {
            alert("Error al cargar el reporte para editar. El reporte no contiene datos.");
            return;
        }
        
        resetForm();
        
        // Asignar los valores a los campos del formulario
        currentReportId = report.ID_REPORTRISK;
        submitBtn.textContent = "Actualizar Reporte";
        codigoInput.value = report.ID_REPORTRISK;
        tipoRiesgoSelect.value = report.ID_TYPERISK;
        tipoRiesgoSelect.disabled = true;
        ubicacionSelect.value = report.ID_LOCATION;
        descripcionInput.value = report.DESCRIPTIONRISK;
        probabilidadSelect.value = report.PROBABILITY_SCORE;
        impactoSelect.value = report.IMPACT_SCORE;
        onMatrixChange();
        
        // TODO: Llenar las evidencias si el backend las retorna
        
        riskFormModal.show();
    } catch (err) {
        console.error("Error al cargar reporte para edición:", err);
        alert("Ocurrió un error al cargar el reporte para editar. Inténtalo de nuevo.");
    }
}


async function onDeleteReport(e) {
    const reportId = e.currentTarget.dataset.id;
    if (confirm("¿Estás seguro de que quieres eliminar este reporte?")) {
        const response = await deleteReport(reportId);
        if (response.status) {
            alert("Reporte eliminado exitosamente.");
            await loadReportsAndRender();
        } else {
            alert("Error al eliminar el reporte: " + response.message);
        }
    }
}

async function onViewReport(e) {
    const reportId = e.currentTarget.dataset.id;
    alert("Función de ver reporte no implementada. ID del reporte: " + reportId);
}

async function onSubmitForm(event) {
    event.preventDefault();

    if (!currentUserNit) {
        alert("Error: No se pudo identificar al usuario. Por favor, inicie sesión de nuevo.");
        return;
    }

    const probabilidad = parseInt(probabilidadSelect.value);
    const impacto = parseInt(impactoSelect.value);
    const nivelRiesgoName = nivelRiesgoInput.value;
    const hasAtLeastOneEvidence = Array.from(evidenciaInputs).some(input => input.files.length > 0);
    
    if (!hasAtLeastOneEvidence && currentReportId === null) {
        alert("Debes adjuntar al menos una evidencia.");
        return;
    }
    
    // Construir el objeto de datos con las claves EXACTAMENTE como en el DTO
    const reportData = {
        "DESCRIPTIONRISK": descripcionInput.value,
        "PROBABILITY_SCORE": probabilidad,
        "IMPACT_SCORE": impacto,
        "ID_LOCATION": ubicacionSelect.value,

        "DT_IDENTIFICATION": new Date().toISOString().split('T')[0],
        "STATUSRISK": "PENDIENTE",
        "IDENTIFIEDBY": currentUserNit,
        "ID_TYPERISK": tipoRiesgoSelect.value,
        
        "RISK_LEVEL_NAME": nivelRiesgoName,
        "RISK_LEVEL_SCORE": probabilidad * impacto
    };
    
    try {
        let response;
        console.log("Enviando los siguientes datos:", reportData);
        
        if (currentReportId === null) {
            response = await insertReport(reportData);
        } else {
            response = await updateReport(currentReportId, reportData);
        }

        if (response.status) {
            alert("Operación exitosa: " + response.message);
            riskFormModal.hide();
            await loadReportsAndRender();
        } else {
            alert("Error en la operación: " + response.message);
        }

    } catch (err) {
        console.error("Error al procesar el formulario:", err);
        alert("Ocurrió un error. Verifica que los datos sean correctos e inténtalo de nuevo.");
    }
}

/* -------------------- Lógica de la Matriz de Riesgos -------------------- */
function onMatrixChange() {
    const probabilidad = parseInt(probabilidadSelect.value);
    const impacto = parseInt(impactoSelect.value);
    if (probabilidad && impacto) {
        const score = probabilidad * impacto;
        let riskLevelName;
        if (score === 1 || score === 2) {
            riskLevelName = "MUY BAJO";
        } else if (score === 3 || score === 4) {
            riskLevelName = "BAJO";
        } else if (score === 5 || score === 6 || score === 8 || score === 9) {
            riskLevelName = "MEDIO";
        } else if (score === 10 || score === 12 || score === 15) {
            riskLevelName = "ALTO";
        } else if (score === 16 || score === 20) {
            riskLevelName = "MUY ALTO";
        } else if (score === 25) {
            riskLevelName = "EXTREMO";
        }
        nivelRiesgoInput.value = riskLevelName;
    } else {
        nivelRiesgoInput.value = "";
    }
    checkFormValidity();
}

function checkFormValidity() {
    const isFormValid = riskReportForm.checkValidity();
    const hasAtLeastOneEvidence = Array.from(evidenciaInputs).some(input => input.files.length > 0);
    const isCreate = currentReportId === null;
    submitBtn.disabled = !(isFormValid && (isCreate && hasAtLeastOneEvidence) || !isCreate);
}

function updateFilePreviewAndValidation(event) {
    const input = event.target;
    const preview = input.closest('.file-upload-wrapper').querySelector('.preview-image');
    const icon = input.closest('.file-upload-wrapper').querySelector('.file-upload-button i');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            icon.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.src = '';
        preview.style.display = 'none';
        icon.style.display = 'block';
    }
    checkFormValidity();
}