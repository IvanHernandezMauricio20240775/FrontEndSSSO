import {
    getMembersByBrigadeId,
    getRoles,
    insertMembersToBrigade
} from "../Service/BrigadeService.js";

import {
    getALlEmployees
} from "../Service/EmployeeService.js";

document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById('MembersBrigadeTableBody');
    const title = document.getElementById("Titulo");

    // --- Elementos del Modal y Estado ---
    const BtnAddMembers = document.getElementById("openFormBtn");
    const modalElement = document.getElementById('brigadeModal');
    const myModal = new bootstrap.Modal(modalElement);

    const empleadosContainer = document.querySelector('#empleados-container .row');
    const miembrosProcesoEleccion = document.getElementById('miembros-proceso-eleccion');
    const buscador = document.getElementById('buscador');
    const rolSelect = document.getElementById('rol-select');
    const confirmarBtn = document.getElementById('confirmar-btn');
    const confirmarCountSpan = document.getElementById('count-confirm');

    let miembrosProceso = []; // Miembros en la fase intermedia de selección
    let empleadosDisponibles = []; // Lista completa de empleados desde el API
    let rolesDisponibles = []; // Lista completa de roles desde el API
    let empleadoParaRol = null;
    let brigadeId = null;
    let miembrosActualesBrigada = []; // Almacena los miembros ya en la brigada

    // --- Funciones de Carga Inicial y Lógica del Modal ---

    // Función principal para cargar la página
    async function loadBrigadeMembers() {
        brigadeId = getBrigadeIdFromUrl();
        if (brigadeId) {
            try {
                const members = await getMembersByBrigadeId(brigadeId);
                miembrosActualesBrigada = members;
                renderMembersTable(members);
            } catch (error) {
                console.error('No se pudo cargar la información de la brigada:', error);
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al cargar los miembros.</td></tr>';
            }
        } else {
            console.error('No se encontró el ID de la brigada en la URL.');
        }
    }

    // Abre el modal y carga los datos de empleados y roles
    BtnAddMembers.addEventListener('click', async () => {
        mostrarFase('fase1');
        miembrosProceso = [];
        renderizarMiembrosProceso();

        try {
            const allEmployees = await getALlEmployees();
            const nitMiembrosActuales = miembrosActualesBrigada.map(m => m.nit_employee);
            empleadosDisponibles = allEmployees.filter(emp => !nitMiembrosActuales.includes(emp.nit_employee));

            rolesDisponibles = await getRoles();

            renderizarEmpleados(empleadosDisponibles);
            renderizarRoles();
            myModal.show();
        } catch (error) {
            console.error("Error al cargar datos iniciales del modal:", error);
            Swal.fire('Error', 'No se pudieron cargar los datos necesarios para añadir miembros.', 'error');
            myModal.hide();
        }
    });

    // Lógica para el cambio de fase
    function mostrarFase(faseId) {
        document.getElementById('fase1').classList.add('d-none');
        document.getElementById('fase2').classList.add('d-none');
        document.getElementById(faseId).classList.remove('d-none');
    }

    // Función para renderizar los empleados disponibles en la Fase 1
    function renderizarEmpleados(empleados) {
        empleadosContainer.innerHTML = '';
        if (empleados.length === 0) {
            empleadosContainer.innerHTML = `<h5 class="text-center text-muted mt-5 col-12">No se encontraron empleados disponibles.</h5>`;
            return;
        }
        empleados.forEach(empleado => {
            const card = document.createElement('div');
            card.className = 'col';
            card.innerHTML = `
                <div class="card card-empleado p-3 h-100" data-nit="${empleado.nit_employee}">
                    <div class="d-flex align-items-center">
                        <div class="profile-icon me-3"><i class="fas fa-user text-muted"></i></div>
                        <div>
                            <h6 class="mb-0 fw-bold">NIT: ${empleado.nit_employee}</h6>
                            <p class="mb-0"><small>Nombres: ${empleado.first_name}</small></p>
                            <p class="mb-0"><small>Apellidos: ${empleado.last_name}</small></p>
                            <p class="mb-0"><small>Departamento: ${empleado.id_department}</small></p>
                        </div>
                    </div>
                </div>
            `;
            empleadosContainer.appendChild(card);
        });
    }

    // Función para renderizar los roles en el select de la Fase 2
    function renderizarRoles() {
        rolSelect.innerHTML = '<option selected disabled>Selecciona un rol...</option>';
        rolesDisponibles.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.id_rol_brigade;
            option.textContent = rol.name_rol_brigade;
            rolSelect.appendChild(option);
        });
    }

    // Función para renderizar los miembros en proceso de selección
    function renderizarMiembrosProceso() {
        miembrosProcesoEleccion.innerHTML = '';
        if (miembrosProceso.length === 0) {
            miembrosProcesoEleccion.innerHTML = `<p class="text-center text-muted col-12">No hay miembros en proceso de elección.</p>`;
            confirmarBtn.classList.add('d-none');
        } else {
            confirmarBtn.classList.remove('d-none');
            miembrosProceso.forEach(miembro => {
                const div = document.createElement('div');
                div.className = 'col';
                div.innerHTML = `
                    <div class="card-miembro-proceso" data-nit="${miembro.nit_employee}">
                        <div>
                            <h6 class="mb-0 fw-bold">${miembro.first_name} ${miembro.last_name}</h6>
                            <p class="mb-0 text-muted"><small>${miembro.name_rol_brigade}</small></p>
                        </div>
                        <div class="acciones-miembro">
                            <i class="fas fa-pencil-alt text-primary action-icon" data-action="editar-rol"></i>
                            <i class="fas fa-times-circle text-danger action-icon" data-action="eliminar-proceso"></i>
                        </div>
                    </div>
                `;
                miembrosProcesoEleccion.appendChild(div);
            });
        }
        confirmarCountSpan.textContent = miembrosProceso.length;
    }

    // --- Event Listeners para la Interacción del Modal ---

    // Selección de un empleado en la Fase 1
    empleadosContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.card-empleado');
        if (!card) return;

        const nitSeleccionado = card.dataset.nit;
        empleadoParaRol = empleadosDisponibles.find(emp => emp.nit_employee === nitSeleccionado);

        mostrarFase('fase2');

        const cardEmpleadoRol = document.getElementById('empleado-seleccionado-rol');
        cardEmpleadoRol.innerHTML = `
            <div class="d-flex flex-column align-items-center">
                <div class="profile-icon mb-2"><i class="fas fa-user text-muted"></i></div>
                <p class="mb-0 fw-bold">${empleadoParaRol.first_name} ${empleadoParaRol.last_name}</p>
                <p class="mb-0 text-muted"><small>${empleadoParaRol.id_department}</small></p>
            </div>
        `;
    });

    // Asignación de rol en la Fase 2
    rolSelect.addEventListener('change', () => {
        if (!empleadoParaRol) return;

        const rolSeleccionadoId = parseInt(rolSelect.value);
        const rolSeleccionadoObj = rolesDisponibles.find(rol => rol.id_rol_brigade === rolSeleccionadoId);

        const miembroExistente = miembrosProceso.find(m => m.nit_employee === empleadoParaRol.nit_employee);
        if (miembroExistente) {
            miembroExistente.id_rol_brigade = rolSeleccionadoId;
            miembroExistente.name_rol_brigade = rolSeleccionadoObj.name_rol_brigade;
        } else {
            // Se agrega el empleado al array de miembros en proceso
            miembrosProceso.push({
                nit_employee: empleadoParaRol.nit_employee,
                id_rol_brigade: rolSeleccionadoId,
                name_rol_brigade: rolSeleccionadoObj.name_rol_brigade,
                first_name: empleadoParaRol.first_name, // Cambiado
                last_name: empleadoParaRol.last_name, // Cambiado
                department: empleadoParaRol.id_department
            });
        }

        Swal.fire({
            icon: 'success',
            title: '¡Rol Asignado!',
            text: `${empleadoParaRol.first_name} ${empleadoParaRol.last_name} está en la lista de espera.`,
            timer: 1500,
            showConfirmButton: false
        });

        mostrarFase('fase1');
        renderizarMiembrosProceso();
        renderizarEmpleados(empleadosDisponibles.filter(emp => !miembrosProceso.map(m => m.nit_employee).includes(emp.nit_employee)));
    });

    // Lógica para confirmar la adición de miembros
    confirmarBtn.addEventListener('click', async () => {
        if (miembrosProceso.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: '¡No hay miembros!',
                text: 'Debes añadir al menos un miembro antes de confirmar.',
            });
            return;
        }

        // Mapea los miembros en proceso al formato del DTO esperado por tu backend
        const miembrosParaEnviar = miembrosProceso.map(miembro => ({
            nit_employee: miembro.nit_employee,
            id_rol_brigade: miembro.id_rol_brigade
        }));

        console.log(miembrosParaEnviar);

        try {
            await insertMembersToBrigade(brigadeId, miembrosParaEnviar);

            Swal.fire({
                icon: 'success',
                title: '¡Brigada Actualizada!',
                text: 'Los nuevos miembros han sido añadidos correctamente.',
                timer: 2000,
                showConfirmButton: false
            });

            miembrosProceso = [];
            renderizarMiembrosProceso();
            loadBrigadeMembers();
            myModal.hide();
        }catch (error) {
            console.error("Error al añadir miembros a la brigada:", error);
            Swal.fire('Error', error.message, 'error'); // Muestra el mensaje de error de la función
        }
    });

    // Búsqueda de empleados en la Fase 1
    buscador.addEventListener('input', () => {
        const searchTerm = buscador.value.toLowerCase();
        const nitMiembrosActuales = miembrosActualesBrigada.map(m => m.nit_employee);
        const nitMiembrosProceso = miembrosProceso.map(m => m.nit_employee);

        const empleadosFiltrados = empleadosDisponibles.filter(emp => {
            const nombreCompleto = `${emp.first_name} ${emp.last_name}`.toLowerCase();
            const nit = emp.nit_employee.toLowerCase();
            const esMiembro = nitMiembrosActuales.includes(emp.nit_employee) || nitMiembrosProceso.includes(emp.nit_employee);
            return !esMiembro && (nit.includes(searchTerm) || nombreCompleto.includes(searchTerm));
        });
        renderizarEmpleados(empleadosFiltrados);
    });

    // Lógica para editar/eliminar de la lista de proceso
    miembrosProcesoEleccion.addEventListener('click', (e) => {
        const icono = e.target.closest('.action-icon');
        if (!icono) return;

        const accion = icono.dataset.action;
        const tarjeta = e.target.closest('.card-miembro-proceso');
        const nit = tarjeta.dataset.nit;
        const miembro = miembrosProceso.find(m => m.nit_employee === nit);

        if (accion === 'eliminar-proceso') {
            miembrosProceso = miembrosProceso.filter(m => m.nit_employee !== nit);
            renderizarMiembrosProceso();
            renderizarEmpleados(empleadosDisponibles.filter(emp => !miembrosProceso.map(m => m.nit_employee).includes(emp.nit_employee)));
        } else if (accion === 'editar-rol') {
            empleadoParaRol = miembro;
            mostrarFase('fase2');
            const cardEmpleadoRol = document.getElementById('empleado-seleccionado-rol');
            cardEmpleadoRol.innerHTML = `
                <div class="d-flex flex-column align-items-center">
                    <div class="profile-icon mb-2"><i class="fas fa-user text-muted"></i></div>
                    <p class="mb-0 fw-bold">${empleadoParaRol.first_name} ${empleadoParaRol.last_name}</p>
                    <p class="mb-0 text-muted"><small>${empleadoParaRol.id_department}</small></p>
                </div>
            `;
        }
    });

    // Carga inicial
    loadBrigadeMembers();
});

// --- Otras funciones que ya tenías y no necesitan ser modificadas ---
function getBrigadeIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

function renderMembersTable(members) {
    const tableBody = document.getElementById('MembersBrigadeTableBody');
    tableBody.innerHTML = '';
    if (members && members.length > 0) {
        members.forEach(member => {
            const rowHTML = `
                <tr>
                    <td class="px-3 text-center"><img src="${'img/default-user.jpg'}" alt="Foto" width="50" class="rounded-circle"></td>
                    <td class="px-3">${member.nit_employee}</td>
                    <td class="px-3">${member.first_name}</td>
                    <td class="px-3">${member.last_name}</td>
                    <td class="px-3">${member.department}</td>
                    <td class="px-3">${member.rol_brigade}</td>
                    <td class="px-3">
                        <button class="btn btn-sm btn-primary">Editar</button>
                        <button class="btn btn-sm btn-danger">Eliminar</button>
                    </td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', rowHTML);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay miembros en esta brigada.</td></tr>';
    }
}