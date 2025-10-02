import {
    AssignInspection,
    getAllAssignInspection,
    getAssignInspectionsByNit,
    getAssignsImplementAndTypeByInspection,
    UpdateAssignInspection,
    getAssignPendingInspection,
    RegisterDetailExtinguisher,
    UpdateDetailExtinguisher,
    RegisterDetailSmokeDetector,
    UpdateDetailSmokeDetector,
    RegisterDetailLocation,
    UpdateDetailLocation
} from "../Service/InspectionService.js";

import {
    AuthStatus
} from "../Service/AuthService.js";

import {
    getSmokeDetectorByLocation
} from "../Service/SmokeDetectorService.js";

import {
    getExtinguishersByLocation
} from "../Service/ExtinguisherService.js";

import {
    GetAllListMemberCommite
} from "../Service/CommiteService.js";

import {
    getAllLocation
} from "../Service/LocationService.js";


// ----------------------------------------------------------------
// --- DECLARACIÓN DE VARIABLES GLOBALES ---
// ----------------------------------------------------------------

// --- Referencias a elementos del DOM ---
const form = document.getElementById('inspection-form');
const codigoInput = document.getElementById('codigo');
const employeeListContainer = document.getElementById('employee-list-container');
const ubicacionSelect = document.getElementById('ubicacion');
const checkboxes = document.querySelectorAll('input[name="type_implement"]');
const modalList = document.querySelector('.implement-modal-list');
const saveBtn = document.getElementById('save-implements-btn');

const tableBody = document.getElementById('inspectionTableBody');
const tableHeader = document.querySelector('.TableInspection thead tr');
const assignInspectionBtn = document.querySelector('[data-bs-target="#asignInspectionModal"]');
const myInspectionBtn = document.querySelector('[data-bs-target="#MyInspectionModal"]');


// --- VARIABLES para almacenar instancias de Modales ---
// Se declaran como 'let' con valor inicial 'null'
let modal = null;
let assignInspectionModal = null;
let myInspectionModal = null; // AÑADIDO: Instancia del modal de inspecciones pendientes
let extinguisherDetailModal = null;
let detectorDetailModal = null;
let locationDetailModal = null;

// --- Variables de estado de la aplicación ---
let selectedEmployee = null;
let selectedImplements = {};
let currentModalType = '';
let currentModalCheckbox = null;
let allInspectionsData = [];
let currentAssignmentData = null;
let currentInspectionId = null;


// ----------------------------------------------------------------
// --- EVENTO DOMContentLoaded (PUNTO CRÍTICO DE INICIALIZACIÓN) ---
// ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // Inicializar las modales *después* de que todo el script de Bootstrap se haya cargado
    modal = new bootstrap.Modal(document.getElementById('implementsModal'));
    assignInspectionModal = new bootstrap.Modal(document.getElementById('asignInspectionModal'));
    // CORRECCIÓN/ADICIÓN: Inicializar el modal de Mis Inspecciones
    myInspectionModal = new bootstrap.Modal(document.getElementById('MyInspectionModal'));
    extinguisherDetailModal = new bootstrap.Modal(document.getElementById('extinguisherDetailModal'));
    detectorDetailModal = new bootstrap.Modal(document.getElementById('detectorDetailModal'));
    locationDetailModal = new bootstrap.Modal(document.getElementById('locationDetailModal'));
    
    // Inicialización de datos
    codigoInput.value = 'INSP-' + Math.floor(Math.random() * 10000);
    AuthInspection();
    fetchEmployeesAndRender();
    fetchLocationsAndRender();
    
    // AÑADIDO: Lógica de carga de inspecciones pendientes al abrir el modal
    setupMyInspectionModalListener();
});


// ----------------------------------------------------------------
// --- LÓGICA CLAVE DE CARGA Y RENDERIZADO DE TARJETAS PENDIENTES ---
// ----------------------------------------------------------------

/**
 * Configura el listener para cargar las tarjetas al abrir el modal del inspector.
 */
function setupMyInspectionModalListener() {
    if (!myInspectionBtn) return;
    
    myInspectionBtn.addEventListener('click', async (event) => {
        event.preventDefault(); // Previene la acción por defecto del botón (si la tiene)

        // Asumimos que la sesión ya está cargada y tenemos el NIT del inspector.
        // Si no tienes el NIT disponible globalmente, deberás hacer la llamada a AuthStatus() aquí.
        const userNit = allInspectionsData.length > 0 && allInspectionsData[0].encargado ? allInspectionsData[0].encargado : null; 
        
        if (!userNit) {
             const session = await AuthStatus();
             if (session.ok) {
                 const nit = session.data.nit;
                 if (nit) {
                      await fetchAndRenderPendingCards(nit);
                 } else {
                     Swal.fire('Error', 'No se pudo obtener el NIT del usuario para cargar las inspecciones.', 'error');
                 }
             }
        } else {
             await fetchAndRenderPendingCards(userNit);
        }
    });
    
    // AÑADIDO: Listener para los botones de las tarjetas dentro del modal.
    document.getElementById('MyInspectionModal').addEventListener('click', (event) => {
        const targetBtn = event.target.closest('.perform-detail-btn');
        if (!targetBtn) return;
        
        const assignmentData = {
            idAssing: targetBtn.dataset.idassing,
            tipoImplemento: targetBtn.dataset.type,
            idImplement: targetBtn.dataset.idimplement || null,
            codigoInspeccion: targetBtn.dataset.codigoinspeccion,
            // Estos campos son necesarios para openPerformInspectionModal, se asume que los obtuviste previamente o necesitas una nueva llamada.
            // Para simplicidad, usaremos el mismo código de inspección. En producción, el objeto debe ser completo.
            nombreUbicacion: "Ubicación Desconocida", // DEBES REEMPLAZAR ESTO con la lógica para obtener la ubicación de la tarjeta.
        };
        
        // La llamada original en la tabla tiene un JSON.parse(row.dataset.assignmentData) completo.
        // Si solo tienes estos datos, tendrás que hacer un fetch para obtener el objeto completo si los forms lo requieren.
        // Por ahora, usamos lo que tenemos en el data-set de la tarjeta:
        openPerformInspectionModal(assignmentData);
        myInspectionModal.hide(); // Ocultar el modal de lista
    });
}

/**
 * Obtiene los datos pendientes y llama a la función de renderizado de tarjetas.
 * @param {string} userNit - El NIT del inspector.
 */
async function fetchAndRenderPendingCards(userNit) {
    try {
        const response = await getAssignPendingInspection(userNit);
        const pendingData = response.data;
        
        console.log("Realizar Inspecciones (PENDIENTES):", pendingData.length);
        console.log("Detalles de las inspecciones pendientes:", pendingData);

        renderPendingInspectionCards(pendingData);
        myInspectionModal.show();
    } catch (error) {
        console.error("Error al cargar las inspecciones pendientes:", error);
        Swal.fire('Error', 'No se pudieron cargar sus inspecciones pendientes.', 'error');
    }
}


/**
 * Renderiza las tarjetas de inspección pendientes en el modal de 'Mis Inspecciones'.
 * @param {Array<Object>} pendingAssignments - La lista completa de asignaciones pendientes.
 */
function renderPendingInspectionCards(pendingAssignments) {
    // 1. Limpiar contenedores antes de empezar
    const extinguisherContainer = document.getElementById('extinguisher-cards');
    const detectorContainer = document.getElementById('detector-cards');
    const generalContainer = document.getElementById('general-cards');

    if (!extinguisherContainer || !detectorContainer || !generalContainer) {
        console.error("ERROR: No se encontraron los contenedores de tarjetas en el modal.");
        return; 
    }

    extinguisherContainer.innerHTML = '';
    detectorContainer.innerHTML = '';
    generalContainer.innerHTML = '';

    // 2. Filtrar por tipo de implemento (Coincide con tu log)
    const extinguishers = pendingAssignments.filter(a => a.tipoImplemento === 'EXTINTOR');
    const detectors = pendingAssignments.filter(a => a.tipoImplemento === 'DETECTOR DE HUMO');
    // Si no tiene implemento, o el tipo es 'GENERAL' (o similar), va a la sección general.
    const generals = pendingAssignments.filter(a => !a.idImplement || a.tipoImplemento === 'GENERAL' || a.tipoImplemento === 'LOCACIÓN'); 
    
    // Opcional: Ocultar secciones si no hay datos
    document.getElementById('extinguisher-section').style.display = extinguishers.length > 0 ? 'block' : 'none';
    document.getElementById('detector-section').style.display = detectors.length > 0 ? 'block' : 'none';
    document.getElementById('general-section').style.display = generals.length > 0 ? 'block' : 'none';


    // 3. Renderizar cada grupo
    appendCards(extinguisherContainer, extinguishers);
    appendCards(detectorContainer, detectors);
    appendCards(generalContainer, generals);
}

/**
 * Función auxiliar para generar y añadir las tarjetas al contenedor.
 * @param {HTMLElement} container - El elemento DOM donde se añadirán las tarjetas.
 * @param {Array<Object>} items - La lista filtrada de asignaciones.
 */
function appendCards(container, items) {
    if (items.length === 0) {
        container.innerHTML = `<div class="alert alert-info p-2 mt-2" role="alert">
                                   No hay inspecciones pendientes en esta categoría.
                               </div>`;
        return;
    }

    items.forEach(item => {
        const fechaFormatted = item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : 'N/A';
        
        // Determinar qué código mostrar (Implemento para EXT/DET, o Inspección para General/Locación)
        const codeDisplay = item.idImplement 
            ? `<span class="fw-bold">${item.idImplement}</span>` 
            : `<span class="fw-bold">${item.codigoInspeccion}</span>`;
            
        const implementName = item.tipoImplemento || 'LOCACIÓN/GENERAL';

        const cardHtml = `
            <div class="inspection-card shadow-sm p-3 mb-3 bg-light rounded" 
                 data-idassing="${item.idAssing}" 
                 data-type="${implementName}"
                 data-idimplement="${item.idImplement || ''}"
                 data-codigoinspeccion="${item.codigoInspeccion}">
                
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1 text-primary">${implementName}</h6>
                        <p class="mb-0 small text-muted">Ubicación: ${item.nombreUbicacion}</p>
                        <p class="mb-0 small text-muted">${item.idImplement ? 'Implemento' : 'Inspección'}: ${codeDisplay}</p>
                        <p class="mb-0 small text-danger">Fecha: ${fechaFormatted}</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-success perform-detail-btn" 
                                data-idassing="${item.idAssing}"
                                data-type="${implementName}"
                                data-idimplement="${item.idImplement || ''}"
                                data-codigoinspeccion="${item.codigoInspeccion}">
                            Realizar
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHtml;
    });
}

// ----------------------------------------------------------------
// --- EVENT LISTENER PRINCIPAL PARA ACCIONES DE LA TABLA ---
// ----------------------------------------------------------------
document.getElementById('inspectionTableBody').addEventListener('click', (event) => {
    const targetBtn = event.target.closest('button');
    if (!targetBtn) return;

    // LÓGICA DEL INSPECTOR: Botón "Realizar" (clase perform-btn, usa data-idassing)
    if (targetBtn.classList.contains('perform-btn')) {
        const row = targetBtn.closest('tr');
        if (row && row.dataset.assignmentData) {
             const assignmentData = JSON.parse(row.dataset.assignmentData);
             openPerformInspectionModal(assignmentData);
        }
        return; // Detener la ejecución para evitar que caiga en la lógica Admin
    }

    // LÓGICA DEL ADMINISTRADOR: Botones "Editar" y "Eliminar" (usan data-id)
    const inspectionId = targetBtn.dataset.id;
    if (!inspectionId) return;

    if (targetBtn.classList.contains('btn-outline-primary')) {
        // Lógica de edición
        const inspectionToEdit = allInspectionsData.find(insp => insp.codigo_inspeccion == inspectionId);
        if (inspectionToEdit) {
            openUpdateModal(inspectionToEdit);
        }
    } else if (targetBtn.classList.contains('btn-outline-danger')) {
        // Lógica de eliminación (debes implementar la llamada al servicio real)
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esto!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                console.log(`Deleting assignment with ID: ${inspectionId}`);
                // Aquí iría tu llamada a la API para eliminar
                Swal.fire(
                    '¡Eliminado!',
                    'La asignación ha sido eliminada.',
                    'success'
                );
            }
        });
    }
});


// ----------------------------------------------------------------
// --- LÓGICA DE DETALLE Y APERTURA DE FORMULARIOS ---
// ----------------------------------------------------------------

function openPerformInspectionModal(assignmentData) {
    console.log("Abriendo modal para realizar inspección:", assignmentData);
    
    currentAssignmentData = assignmentData; // Guarda la data de la asignación activa

    const type = assignmentData.tipoImplemento;
    const implementId = assignmentData.idImplement || 'GENERAL';

    let modalToOpen;
    let title;

    if (type === 'EXTINTOR') {
        modalToOpen = extinguisherDetailModal;
        title = `Extintor: ${implementId} - ${assignmentData.nombreUbicacion}`;
        renderExtinguisherForm(assignmentData);
    } else if (type === 'DETECTOR DE HUMO') {
        modalToOpen = detectorDetailModal;
        title = `Detector: ${implementId} - ${assignmentData.nombreUbicacion}`;
        renderDetectorForm(assignmentData);
    } else if (type === 'GENERAL' || type === 'LOCACIÓN') {
        modalToOpen = locationDetailModal;
        title = `Locación: ${assignmentData.nombreUbicacion}`;
        renderLocationForm(assignmentData);
    } else {
        Swal.fire('Error', `Tipo de implemento no reconocido: ${type}`, 'error');
        return;
    }

    // Asegúrate de que los modales de detalle tienen un elemento con ID 'extinguisherDetailModalTitle', etc.
    const modalTitleElement = document.getElementById(modalToOpen._element.id + 'Title');
    if (modalTitleElement) {
        modalTitleElement.textContent = `Realizar Inspección (${type}): ${title}`;
    }

    modalToOpen.show();
}

function renderExtinguisherForm(assignment) {
    // Asume que tienes un campo oculto en el formulario del extintor con ID 'extinguisher_id_assing'
    const idAssingInput = document.getElementById('extinguisher_id_assing');
    if (idAssingInput) {
        idAssingInput.value = assignment.idAssing;
    }
    // Si tienes un campo para el ID del implemento:
    const idImplementInput = document.getElementById('extinguisher_id_implement');
    if (idImplementInput) {
        idImplementInput.value = assignment.idImplement;
    }
    document.getElementById('extinguisherDetailForm').reset();
}

function renderDetectorForm(assignment) {
    // Asume que tienes un campo oculto en el formulario del detector con ID 'detector_id_assing'
    const idAssingInput = document.getElementById('detector_id_assing');
    if (idAssingInput) {
        idAssingInput.value = assignment.idAssing;
    }
    // Si tienes un campo para el ID del implemento:
    const idImplementInput = document.getElementById('detector_id_implement');
    if (idImplementInput) {
        idImplementInput.value = assignment.idImplement;
    }
    document.getElementById('detectorDetailForm').reset();
}

function renderLocationForm(assignment) {
    // Asume que tienes un campo oculto en el formulario de locación con ID 'location_id_assing'
    const idAssingInput = document.getElementById('location_id_assing');
    if (idAssingInput) {
        idAssingInput.value = assignment.idAssing;
    }
    document.getElementById('locationDetailForm').reset();
}

// ----------------------------------------------------------------
// --- LÓGICA DE AUTENTICACIÓN Y CARGA DE LA TABLA ---
// ----------------------------------------------------------------
async function AuthInspection() {
    try {
        const session = await AuthStatus();
        console.log("Sesión de usuario:", session);

        assignInspectionBtn.style.display = 'none';
        myInspectionBtn.style.display = 'none';

        if (session.ok) {
            const userRole = session.data.role;
            const userCommitteeRole = session.data.committeeRole;
            // OBTENER NIT para la consulta
            const userNit = session.data.nit; 
            let inspections = [];

            if (userRole === "Administrador" || userCommitteeRole === "Presidente") {
                // Admin/Presidente: Ven todas las asignaciones
                inspections = await getAllAssignInspection();
                assignInspectionBtn.style.display = 'block';
                renderTableHeaders(true);
            } else if (userRole === "Usuario" && userCommitteeRole === "Inspector") {
                // INSPECTOR: SOLO VE ASIGNACIONES PENDIENTES USANDO EL ENDPOINT ESPECÍFICO
                const response = await getAssignPendingInspection(userNit); 
                inspections = response.data; // La data son los AssignmentSummaryDTO PENDIENTES
                myInspectionBtn.style.display = 'block';
                renderTableHeaders(false);
            } else {
                renderNoAccessMessage();
                return;
            }

            if (inspections && inspections.length > 0) {
                // allInspectionsData se usa para la lógica de Editar/Eliminar (Admin/Presidente)
                // Para Inspector, es la lista de pendientes.
                allInspectionsData = inspections; 
                renderInspectionsTable(allInspectionsData);
            } else {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay inspecciones asignadas.</td></tr>';
            }
        } else {
            renderNoAccessMessage();
        }
    } catch (error) {
        console.error("Error en la autenticación o al cargar los datos:", error);
        renderNoAccessMessage();
    }
}

// ----------------------------------------------------------------
// --- RENDERIZADO DE TABLA ---
// ----------------------------------------------------------------
function renderTableHeaders(isAdmin) {
    let headers = `
        <th scope="col" class="px-3">#ID</th>
        <th scope="col" class="px-3">Ubicacion</th>
        <th scope="col" class="px-3">Tipo de Inspeccion</th>
        <th scope="col" class="px-3">Estado</th>
        <th scope="col" class="px-3">Fecha</th>
    `;
    if (isAdmin) {
        headers += `<th scope="col" class="px-3">Encargado</th>`;
    }
    headers += `<th scope="col" class="px-3">Acciones</th>`;
    tableHeader.innerHTML = headers;
}

function renderInspectionsTable(inspections) {

    tableBody.innerHTML = '';
    
    console.log("Inspecciones:",inspections)
    // Si el primer elemento tiene 'encargado' o 'encargadoNombre', asumimos que es la vista Admin.
    const isAdminView = inspections.length > 0 && (inspections[0].hasOwnProperty('encargado') || inspections[0].hasOwnProperty('encargadoNombre'));

    if (inspections.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay inspecciones asignadas.</td></tr>';
        return;
    }

    inspections.forEach(assignment => {
        const row = document.createElement('tr');
        
        const fechaFormatted = assignment.fecha ? new Date(assignment.fecha).toLocaleDateString('es-ES') : 'N/A';
        const implementText = assignment.idImplement && assignment.idImplement !== 'N/A' 
                              ? ` - ${assignment.idImplement}` : '';
        
        // Almacenar todos los datos de la asignación en el dataset de la fila
        row.dataset.assignmentData = JSON.stringify(assignment);

        // Se usan operadores OR (||) para ser flexibles con los DTOs de Admin/Inspector
        const codigo = assignment.codigoInspeccion || assignment.codigo_inspeccion;
        const ubicacion = assignment.nombreUbicacion || assignment.nombre_ubicacion;
        const tipo = assignment.tipoImplemento || assignment.tipo;
        const estado = assignment.estadoInspeccion || assignment.estado;
        const encargado = assignment.encargadoNombre || assignment.encargado || 'N/A';

        row.innerHTML = `
            <td class="px-3">${codigo}</td>
            <td class="px-3">${ubicacion}</td>
            <td class="px-3">${tipo}${implementText}</td>
            <td class="px-3">${estado}</td>
            <td class="px-3">${fechaFormatted}</td>
            
            ${isAdminView ? `<td class="px-3">${formatName(encargado)}</td>` : ''}
            
            <td class="px-3">
                ${(estado) === 'PENDIENTE' ? `
                <button class="btn btn-sm btn-outline-success perform-btn" data-idassing="${assignment.idAssing}" data-type="${tipo}">
                    <i class="fas fa-check"></i> Realizar
                </button>
                ` : `
                <span class="badge bg-success">Completado</span>
                `}
                
                ${isAdminView ? `
                <button class="btn btn-sm btn-outline-primary me-2" data-id="${codigo}">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" data-id="${codigo}">
                    <i class="fas fa-trash-alt"></i>
                </button>
                ` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ----------------------------------------------------------------
// --- LÓGICA DE ENVÍO DE FORMULARIOS DE DETALLE ---
// ----------------------------------------------------------------

// 1. FORMULARIO DE DETALLE DE EXTINTOR
document.getElementById('extinguisherDetailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    // Obtener el valor del campo que contiene ID_Assing
    const idAssing = document.getElementById('extinguisher_id_assing').value;
    
    const payload = {
        "ID_Assing": parseInt(idAssing),
        "Extinguisher_InOperation": form.elements.inOperation.value,
        "Gauge_Status":
        lue,
        "Hose_Condition": form.elements.hoseCondition.value,
        "Accessible_Visible": form.elements.accessibleVisible.value,
        "Observation": form.elements.observation.value,
    };
    
    console.log("Payload Extintor a enviar:", payload);

    try {
        const response = await RegisterDetailExtinguisher(payload);
        Swal.fire('¡Éxito!', 'Detalle de Extintor registrado.', 'success');
        extinguisherDetailModal.hide();
        AuthInspection(); // Recargar la tabla para ver el cambio de estado
    } catch (error) {
        console.error("Error al registrar detalle de extintor:", error);
        Swal.fire('Error', `No se pudo guardar el detalle: ${error.message || 'Error desconocido'}`, 'error');
    }
});


// 2. FORMULARIO DE DETALLE DE DETECTOR DE HUMO
document.getElementById('detectorDetailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const idAssing = document.getElementById('detector_id_assing').value;

    const payload = {
        "ID_Assing": parseInt(idAssing),
        "Detector_InOperation": form.elements.detectorInOperation.value,
        "Battery_Status": form.elements.batteryStatus.value,
        "LED_Indicator": form.elements.ledIndicator.value,
        "Damaged_Marterial": form.elements.damagedMaterial.value,
        "Functional_Test_Date": form.elements.functionalTestDate.value, 
        "Is_Clean": form.elements.isClean.value,
        "Correct_Location": form.elements.correctLocation.value,
        "Expiration_Date": form.elements.expirationDate.value, 
        "Observation": form.elements.observation.value,
    };
    
    console.log("Payload Detector a enviar:", payload);

    try {
        const response = await RegisterDetailSmokeDetector(payload);
        Swal.fire('¡Éxito!', 'Detalle de Detector registrado.', 'success');
        detectorDetailModal.hide();
        AuthInspection(); // Recargar la tabla
    } catch (error) {
        console.error("Error al registrar detalle de detector:", error);
        Swal.fire('Error', `No se pudo guardar el detalle: ${error.message || 'Error desconocido'}`, 'error');
    }
});


// 3. FORMULARIO DE DETALLE DE LOCACIÓN / GENERAL
document.getElementById('locationDetailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const idAssing = document.getElementById('location_id_assing').value;

    const payload = {
        "ID_Assing": parseInt(idAssing),
        "Visible_Signage": form.elements.visibleSignage.value,
        "Correct_Routes": form.elements.correctRoutes.value,
        "Free_EmergencyExits": form.elements.freeEmergencyExits.value,
        "Cleanfacilities": form.elements.cleanfacilities.value,
        "Lighting_Adequate": form.elements.lightingAdequate.value,
        "Electrical_Hazards": form.elements.electricalHazards.value,
        "Floor_Condition": form.elements.floorCondition.value,
        "Proper_Storage": form.elements.properStorage.value,
        "Emergency_Equipment_Accessible": form.elements.emergencyEquipmentAccessible.value,
        "Observation": form.elements.observation.value,
    };
    
    console.log("Payload Locación a enviar:", payload);

    try {
        const response = await RegisterDetailLocation(payload);
        Swal.fire('¡Éxito!', 'Detalle de Locación registrado.', 'success');
        locationDetailModal.hide();
        AuthInspection(); // Recargar la tabla
    } catch (error) {
        console.error("Error al registrar detalle de locación:", error);
        Swal.fire('Error', `No se pudo guardar el detalle: ${error.message || 'Error desconocido'}`, 'error');
    }
});

// ----------------------------------------------------------------
// --- Funciones de soporte y Event Listeners de Asignación ---
// ----------------------------------------------------------------

function formatName(name) {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length > 2) {
        return `${parts[0]} ${parts[1][0]}.`;
    }
    return name;
}

function renderNoAccessMessage() {
    document.getElementById('Data').innerHTML = `<div class="alert alert-warning mt-4" role="alert">
        No tienes permisos para ver esta sección.
    </div>`;
}

async function fetchEmployeesAndRender() {
    try {
        const employees = await GetAllListMemberCommite();
        const filteredEmployees = employees.filter(emp =>
            emp.position === "Inspector" && emp.status === "Activo"
        );
        renderEmployees(filteredEmployees);
    } catch (error) {
        console.error("Error al obtener los empleados:", error);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Error al cargar la lista de empleados. Por favor, intenta de nuevo.'
        });
    }
}

async function fetchLocationsAndRender() {
    try {
        const locationsData = await getAllLocation();
        if (!locationsData || locationsData.length === 0) {
            console.log("Ubicaciones no cargadas");
            return;
        }
        renderLocations(locationsData);
    } catch (error) {
        console.error("Error al obtener las ubicaciones:", error);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Error al cargar la lista de ubicaciones. Por favor, intenta de nuevo.'
        });
    }
}

function renderEmployees(employeeData) {
    employeeListContainer.innerHTML = '';
    employeeData.forEach(emp => {
        const card = document.createElement('div');
        card.className = 'employee-card';
        card.dataset.id = emp.id_member;
        card.innerHTML = `
            <img src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png" alt="Foto de ${emp.full_name}">
            <div class="employee-name">${emp.full_name}</div>
            <div class="employee-id">${emp.id_member}</div>
        `;
        card.addEventListener('click', () => selectEmployee(emp));
        employeeListContainer.appendChild(card);
    });
}

function selectEmployee(employee) {
    selectedEmployee = employee;
    const allCards = document.querySelectorAll('.employee-card');
    allCards.forEach(card => card.classList.remove('selected'));
    const selectedCard = document.querySelector(`.employee-card[data-id="${employee.id_member}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
}

function renderLocations(locationData) {
    ubicacionSelect.innerHTML = '<option value="">Selecciona una ubicación</option>';
    locationData.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc.id_location;
        option.textContent = loc.name_location;
        ubicacionSelect.appendChild(option);
    });
}

async function renderImplementsModal(type) {
    modalList.innerHTML = '';
    const selectedLocation = ubicacionSelect.value;
    if (!selectedLocation) {
        Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: 'Por favor, selecciona una ubicación primero.'
        });
        return;
    }

    let implementsInLocation = [];
    try {
        if (type === 'EXTINTOR') {
            implementsInLocation = (await getExtinguishersByLocation(selectedLocation)).data;
        } else if (type === 'DETECTOR DE HUMO') {
            implementsInLocation = (await getSmokeDetectorByLocation(selectedLocation)).data;
        }
    } catch (error) {
        console.error(`Error al obtener los implementos de tipo ${type}:`, error);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Error al cargar los implementos. Por favor, intenta de nuevo.'
        });
        return;
    }

    currentModalType = type;
    document.getElementById('implementsModalLabel').textContent = `Seleccionar ${type}s`;

    if (implementsInLocation.length === 0) {
        modalList.innerHTML = `<p class="text-center text-muted">No se encontraron ${type}s en esta ubicación.</p>`;
        saveBtn.disabled = true;
        return;
    } else {
        saveBtn.disabled = false;
    }

    const currentSelectedIds = selectedImplements[type] ? selectedImplements[type].map(item => item.ID_Implement) : [];


    implementsInLocation.forEach(imp => {
        const item = document.createElement('div');
        item.className = 'implement-item';
        let idKey;
        if (type === 'EXTINTOR') {
            idKey = 'id_extinguisher';
        } else if (type === 'DETECTOR DE HUMO') {
            idKey = 'id_smoke_detector';
        }
        item.textContent = `${imp[idKey]}`;
        item.dataset.id = imp[idKey];

        if (currentSelectedIds.includes(imp[idKey])) {
            item.classList.add('selected');
        }

        item.addEventListener('click', () => {
            item.classList.toggle('selected');
        });
        modalList.appendChild(item);
    });

    modal.show();
}

document.querySelectorAll('.checkbox-item label').forEach(label => {
    label.addEventListener('click', (event) => {
        const checkbox = document.getElementById(label.getAttribute('for'));
        const box = label.closest('.checkbox-item').querySelector('.box');

        if (checkbox.value === 'GENERAL') {
            event.preventDefault();
            checkbox.checked = !checkbox.checked;
            if (checkbox.checked) {
                box.classList.add('selected-type');
            } else {
                box.classList.remove('selected-type');
            }
        } else {
            event.preventDefault();
            currentModalCheckbox = checkbox;
            renderImplementsModal(checkbox.value);
        }
    });
});

saveBtn.addEventListener('click', () => {
    const selectedItems = document.querySelectorAll('.implement-item.selected');
    const selectedIds = Array.from(selectedItems).map(item => item.dataset.id);

    const currentAssignments = selectedImplements[currentModalType] || [];
    const newAssignments = selectedIds.map(id => {
        const existingAssignment = currentAssignments.find(a => a.ID_Implement === id);
        return existingAssignment || { ID_Assing: null, ID_Implement: id };
    });

    selectedImplements[currentModalType] = newAssignments;

    const box = currentModalCheckbox.closest('.checkbox-item').querySelector('.box');

    if (selectedIds.length === 0) {
        currentModalCheckbox.checked = false;
        box.classList.remove('selected-type');
    } else {
        currentModalCheckbox.checked = true;
        box.classList.add('selected-type');
    }

    modal.hide();
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedEmployee) {
        Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: 'Por favor, selecciona un empleado encargado.'
        });
        return;
    }

    const isUpdate = !!currentInspectionId;

    if (!isUpdate) {
        // Lógica de creación (la que ya tenías)
        const mainData = {
            ID_Inspection: codigoInput.value,
            Date_Inspection: document.getElementById('fecha').value,
            ID_Member: selectedEmployee.id_member,
            ID_Location: ubicacionSelect.value,
        };

        const assignments = [];
        let validationFailed = false;
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const type = checkbox.value;
                const implementData = selectedImplements[type] || [];

                if (type !== 'GENERAL' && implementData.length === 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Atención',
                        text: `Por favor, selecciona al menos un implemento para la inspección de tipo "${type}".`
                    });
                    validationFailed = true;
                    return;
                }
                assignments.push({
                    ID_TypeImplement: type,
                    selected_implements: implementData.map(a => a.ID_Implement)
                });
            }
        });

        if (validationFailed) {
            return;
        }

        if (assignments.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'Por favor, selecciona al menos un tipo de inspección.'
            });
            return;
        }

        const finalPayload = {
            ...mainData,
            assignments
        };

        console.log('Datos a enviar al backend (Creación):', finalPayload);

        try {
            const response = await AssignInspection(finalPayload);
            console.log('Respuesta del backend:', response);
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: '¡Datos guardados exitosamente!',
                showConfirmButton: false,
                timer: 2000
            });
            form.reset();
            AuthInspection();
        } catch (error) {
            console.error("Error al enviar los datos:", error);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Hubo un error al guardar los datos. Revisa la consola para más detalles.'
            });
        }

    } else {
        // Lógica de actualización
        await handleUpdateSubmission();
    }
});


async function openUpdateModal(inspection) {
    console.log("Abriendo modal para actualizar:", inspection);

    currentInspectionId = inspection.codigo_inspeccion;

    assignInspectionModal.show();

    const modalTitleElement = document.getElementById('modalTitle');
    if (modalTitleElement) {
        modalTitleElement.textContent = `Actualizar Inspección ${inspection.codigo_inspeccion}`;
    }

    codigoInput.value = inspection.codigo_inspeccion;
    codigoInput.disabled = true;

    document.getElementById('fecha').value = new Date(inspection.fecha).toISOString().split('T')[0];

    try {
        const detailedInspection = await getAssignsImplementAndTypeByInspection(inspection.codigo_inspeccion);
        console.log("Datos de asignaciones detalladas para actualizar:", detailedInspection);

        document.getElementById('ubicacion').value = detailedInspection.ID_Location;

        const memberId = detailedInspection.ID_Member;
        const employeeCards = document.querySelectorAll('.employee-card');
        employeeCards.forEach(card => card.classList.remove('selected'));
        const employeeCardToSelect = document.querySelector(`.employee-card[data-id="${memberId}"]`);
        if (employeeCardToSelect) {
            employeeCardToSelect.classList.add('selected');
            selectedEmployee = { id_member: memberId };
        }

        checkboxes.forEach(cb => {
            cb.checked = false;
            cb.closest('.checkbox-item').querySelector('.box').classList.remove('selected-type');
        });
        selectedImplements = {};

        if (detailedInspection && detailedInspection.assignments) {
            detailedInspection.assignments.forEach(assignment => {
                const type = assignment.ID_TypeImplement;
                // Asumiendo que solo hay un implemento por asignación en la vista de detalle
                const implementId = assignment.selected_implements[0]; 

                if (!selectedImplements[type]) {
                    selectedImplements[type] = [];
                }

                selectedImplements[type].push({
                    ID_Assing: assignment.ID_Assing,
                    ID_Implement: implementId
                });

                const checkboxToSelect = document.querySelector(`input[name="type_implement"][value="${type}"]`);
                if (checkboxToSelect) {
                    checkboxToSelect.checked = true;
                    checkboxToSelect.closest('.checkbox-item').querySelector('.box').classList.add('selected-type');
                }
            });
        }
    } catch (error) {
        console.error("Error al cargar los detalles de la inspección para actualización:", error);
        Swal.fire('Error', 'No se pudieron cargar los detalles de la inspección.', 'error');
    }
}

async function handleUpdateSubmission() {
    if (!selectedEmployee) {
        Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: 'Por favor, selecciona un empleado encargado.'
        });
        return;
    }

    const mainData = {
        ID_Inspection: codigoInput.value,
        Date_Inspection: document.getElementById('fecha').value,
        ID_Member: selectedEmployee.id_member,
        ID_Location: ubicacionSelect.value,
    };
    
    // ... falta la lógica completa de actualización (UpdateAssignInspection)
    // El código original estaba truncado aquí. Mantengo solo la parte que envuelve la lógica de actualización.
    // **Asegúrate de completar tu función `handleUpdateSubmission` con el payload y la llamada a `UpdateAssignInspection`.**
}