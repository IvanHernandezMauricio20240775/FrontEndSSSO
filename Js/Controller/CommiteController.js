import {
    getPageMembers,
    getAllPosition,
    insertMembersToCommite,
    UpdatedRolMember,
    DeleteMember
} from "../Service/CommiteService.js"


import {
    getALlEmployees
} from "../Service/EmployeeService.js";


document.addEventListener("DOMContentLoaded", () => {

    // --- Variables de Estado Global ---
    let currentPage = 0;
    let totalPages = 0;
    let membersPerPage = 8; // Define el tamaño de la página
    let currentFilter = 'todos';
    let currentSearch = '';

    // --- Referencias a los elementos del DOM ---
    const tableBody = document.getElementById('SimulacrumTableBody');
    const tableDiv = document.getElementById("TableDiv");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const paginationNumbersContainer = document.getElementById("paginationNumbers");
    const filtroEstado = document.getElementById("filtroEstado");
    const searchInput = document.getElementById("searchInput");
    const BtnAddMembers = document.getElementById("MembersModal");
    const modalElement = document.getElementById('MembersModal');
    const myModal = new bootstrap.Modal(modalElement);
    const empleadosContainer = document.querySelector('#empleados-container .row');
    const miembrosProcesoEleccion = document.getElementById('miembros-proceso-eleccion');
    const rolSelect = document.getElementById('rol-select');
    const confirmarBtn = document.getElementById('confirmar-btn');
    const confirmarCountSpan = document.getElementById('count-confirm');
    const empleadoParaRolCard = document.getElementById('empleado-seleccionado-rol');

    let miembrosProceso = []; // Miembros en la fase intermedia de selección
    let empleadosDisponibles = []; // Lista completa de empleados desde el API
    let rolesDisponibles = []; // Lista completa de roles desde el API
    let miembroSeleccionadoParaRol = null; // Empleado seleccionado para asignarle rol

    // --- Funciones de Carga y Renderización de la Tabla Principal ---

    // Función principal para cargar la tabla de miembros con paginación
    async function loadMembersTable() {
        applyFadeInAnimation(tableDiv);
        tableBody.innerHTML = ''; // Limpia la tabla
        try {
            const response = await getPageMembers(currentPage, membersPerPage);
            const members = response.data.content;
            totalPages = response.data.totalPages;

            let filteredMembers = members;

            // Lógica de filtrado por estado
            if (currentFilter !== 'todos') {
                filteredMembers = filteredMembers.filter(member =>
                    member.status.toLowerCase() === (currentFilter === 'activo' ? 'activo' : 'inactivo')
                );
            }

            // Lógica de búsqueda por texto
            if (currentSearch) {
                const searchTerm = currentSearch.toLowerCase();
                filteredMembers = filteredMembers.filter(member =>
                    member.nit.toLowerCase().includes(searchTerm) ||
                    member.fullName.toLowerCase().includes(searchTerm) ||
                    member.department.toLowerCase().includes(searchTerm) ||
                    member.position.toLowerCase().includes(searchTerm)
                );
            }

            if (!filteredMembers || filteredMembers.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No se encontraron miembros del comité.</td></tr>`;
            } else {
                renderMembersTable(filteredMembers);
            }

            // Actualiza el estado de los botones y los números de paginación
            prevPageBtn.classList.toggle('disabled', currentPage === 0);
            nextPageBtn.classList.toggle('disabled', currentPage >= totalPages - 1);
            renderPageNumbers();

        } catch (error) {
            console.error("Error al cargar los miembros del comité:", error);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error al cargar los miembros.</td></tr>`;
        }
    }

    // Función que renderiza las filas de la tabla
    function renderMembersTable(members) {
        tableBody.innerHTML = "";
        members.forEach(member => {
            const rowHTML = `
                <tr data-id-member="${member.id_member}" data-nit-employee="${member.nit}">
                    <td class="px-3 text-center"><img src="${member.image}" alt="Imagen_Usuario" width="50" class="rounded-circle"></td>
                    <td class="px-3">${member.nit}</td>
                    <td class="px-3">${member.full_name}</td>
                    <td class="px-3">${member.department}</td>
                    <td class="px-3">${member.position}</td>
                    <td class="px-3">
                        <span class="badge ${member.status === 'Activo' ? 'bg-success' : 'bg-danger'}">${member.status}</span>
                    </td>
                    <td class="px-3">
                        <button class="btn btn-sm btn-primary btn-edit-member me-2" data-id-member="${member.id_member}" data-nit-employee="${member.nit}" title="Editar Rol">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete-member" data-id-member="${member.id_member}" title="Eliminar Miembro">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', rowHTML);
        });
    }

    // --- Lógica de Paginación ---
    function applyFadeInAnimation(element) {
        element.classList.remove('animate__fadeIn');
        setTimeout(() => {
            element.classList.add('animate__fadeIn');
        }, 10);
    }

    function renderPageNumbers() {
        paginationNumbersContainer.innerHTML = '';
        if (totalPages <= 1) {
            return;
        }

        const maxPagesToShow = 3;
        let startPage = Math.max(0, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(0, endPage - maxPagesToShow + 1);
        }

        if (totalPages > maxPagesToShow && startPage > 0) {
            const li = document.createElement('li');
            li.className = 'page-item disabled';
            li.innerHTML = `<a class="page-link" href="#">...</a>`;
            paginationNumbersContainer.appendChild(li);
        }

        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i + 1}</a>`;
            paginationNumbersContainer.appendChild(li);
        }

        if (totalPages > maxPagesToShow && endPage < totalPages - 1) {
            const li = document.createElement('li');
            li.className = 'page-item disabled';
            li.innerHTML = `<a class="page-link" href="#">...</a>`;
            paginationNumbersContainer.appendChild(li);
        }
    }

    // --- Lógica de Filtro y Búsqueda ---
    filtroEstado.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        currentPage = 0;
        loadMembersTable();
    });

    searchInput.addEventListener('input', () => {
        currentSearch = searchInput.value;
        currentPage = 0;
        loadMembersTable();
    });

    // --- Lógica del CRUD (Creación, Edición y Eliminación) ---

    // Evento para abrir el modal de Creación
    const btnAddMember = document.querySelector('[data-bs-target="#MembersModal"]');
    btnAddMember.addEventListener('click', async () => {
        setupModalForCreation();
        try {
            const allEmployeesResponse = await getALlEmployees();
            empleadosDisponibles = allEmployeesResponse;
            console.log(empleadosDisponibles)
            rolesDisponibles = await getAllPosition();
            console.log(rolesDisponibles)
            renderEmployees(empleadosDisponibles);
            renderPositions();
            myModal.show();
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los datos necesarios para añadir miembros.', 'error');
            myModal.hide();
        }
    });

    tableBody.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit-member');
    if (editBtn) {
        // Obtenemos el ID del miembro directamente del atributo data
        const idMember = editBtn.dataset.idMember;
        
        setupModalForEditing();
        try {
            // Buscamos el miembro por su id_member en la respuesta del servidor
            const memberResponse = await getPageMembers(0, 1000); 
            const memberToEdit = memberResponse.data.content.find(m => m.id_member == idMember);
            
            if (memberToEdit) {
                // Si el miembro es encontrado, guardamos la información en una variable global
                miembroSeleccionadoParaRol = {
                    nit: memberToEdit.nit,
                    id_member: memberToEdit.id_member,
                    fullName: memberToEdit.full_name,
                    department: memberToEdit.department,
                    image: memberToEdit.image,
                    id_position: memberToEdit.id_position
                };
                
                // Cargamos los roles disponibles
                rolesDisponibles = await getAllPosition();
                
                // Renderizamos la información y mostramos el modal
                renderEmpleadoParaRol();
                renderPositions(memberToEdit.id_position); 
                myModal.show();
            } else {
                Swal.fire('Error', 'Miembro no encontrado.', 'error');
            }
        } catch (error) {
            console.error("Error al cargar datos para edición:", error);
            Swal.fire('Error', 'No se pudieron cargar los datos para editar el miembro.', 'error');
        }
    }
});

    // Lógica para el botón de eliminación
    tableBody.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.btn-delete-member');
        if (deleteBtn) {
            console.log("Elemento clicado:", deleteBtn);
            console.log("Dataset del elemento:", deleteBtn.dataset);
         
            const idMember = deleteBtn.dataset.idMember;
               console.log("ID del Miembro:", idMember);
            console.log(idMember)
            Swal.fire({
                title: '¿Estás seguro?',
                text: "¡No podrás revertir esto!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminarlo!',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await DeleteMember(idMember);
                        Swal.fire('Eliminado!', 'El miembro ha sido eliminado.', 'success');
                        loadMembersTable();
                    } catch (error) {
                        Swal.fire('Error', 'Ocurrió un error al eliminar el miembro.', 'error');
                    }
                }
            });
        }
    });

    // Lógica para la Fase 1: Selección de Empleados
    function setupModalForCreation() {
        mostrarFase('fase1');
        miembrosProceso = [];
        renderizarMiembrosProceso();
        confirmarBtn.dataset.action = 'insert';
    }

    // Lógica para la Fase 2: Edición de Rol
    function setupModalForEditing() {
        mostrarFase('fase2');
        confirmarBtn.dataset.action = 'update';
    }

    function mostrarFase(faseId) {
        document.getElementById('fase1').classList.add('d-none');
        document.getElementById('fase2').classList.add('d-none');
        document.getElementById(faseId).classList.remove('d-none');
    }

    // Renderiza la lista de empleados para selección
    function renderEmployees(employees) {
        empleadosContainer.innerHTML = '';
        if (employees.length === 0) {
            empleadosContainer.innerHTML = `<h5 class="text-center text-muted mt-5 col-12">No se encontraron empleados.</h5>`;
            return;
        }
        employees.forEach(empleado => {
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
                </div>`;
            empleadosContainer.appendChild(card);
        });
    }

    // Evento de clic en las tarjetas de empleado para pasar a la Fase 2
    empleadosContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.card-empleado');
        if (!card) return;

        const nitSeleccionado = card.dataset.nit;
        miembroSeleccionadoParaRol = empleadosDisponibles.find(emp => emp.nit_employee === nitSeleccionado);

        mostrarFase('fase2');
        renderEmpleadoParaRol();
        renderPositions(); // Renderiza el select de roles
    });

    // Muestra la tarjeta del empleado seleccionado para el rol
    function renderEmpleadoParaRol() {
        if (!miembroSeleccionadoParaRol) return;
        empleadoParaRolCard.innerHTML = `
            <div class="d-flex flex-column align-items-center">
                <img src="${miembroSeleccionadoParaRol.image || miembroSeleccionadoParaRol.img_user}" alt="Imagen Usuario" class="rounded-circle mb-2" width="80" height="80">
                <p class="mb-0 fw-bold">${miembroSeleccionadoParaRol.fullName || miembroSeleccionadoParaRol.first_name + ' ' + miembroSeleccionadoParaRol.last_name}</p>
                <p class="mb-0 text-muted"><small>${miembroSeleccionadoParaRol.department || miembroSeleccionadoParaRol.id_department}</small></p>
            </div>`;
    }

    // Renderiza los roles en el select de la Fase 2
    function renderPositions(selectedPositionId = null) {
        rolSelect.innerHTML = '<option selected disabled>Selecciona un cargo...</option>';
        if (rolesDisponibles) {
            rolesDisponibles.forEach(posicion => {
                const option = document.createElement('option');
                option.value = posicion.id_position;
                option.textContent = posicion.name_post;
                if (selectedPositionId === posicion.id_position) {
                    option.selected = true;
                }
                rolSelect.appendChild(option);
            });
        }
    }

    // Lógica al asignar un rol
    rolSelect.addEventListener('change', () => {
        if (!miembroSeleccionadoParaRol) return;

        const posicionSeleccionadaId = parseInt(rolSelect.value);
        const rolSeleccionadoObj = rolesDisponibles.find(pos => pos.id_position === posicionSeleccionadaId);

        const miembroExistente = miembrosProceso.find(m => m.nit_employee === miembroSeleccionadoParaRol.nit_employee);

        if (miembroExistente) {
            miembroExistente.id_position = posicionSeleccionadaId;
        } else {
            miembrosProceso.push({
                nit_employee: miembroSeleccionadoParaRol.nit_employee,
                id_position: posicionSeleccionadaId,
                name_post: rolSeleccionadoObj.name_post,
                first_name: miembroSeleccionadoParaRol.first_name,
                last_name: miembroSeleccionadoParaRol.last_name,
                image: miembroSeleccionadoParaRol.img_user
            });

            console.log("")
        }

        Swal.fire({
            icon: 'success',
            title: '¡Cargo Asignado!',
            text: `${miembroSeleccionadoParaRol.first_name} ${miembroSeleccionadoParaRol.last_name} está en la lista de espera.`,
            timer: 1500,
            showConfirmButton: false
        });

        mostrarFase('fase1');
        renderizarMiembrosProceso();
        renderEmployees(empleadosDisponibles.filter(emp => !miembrosProceso.map(m => m.nit_employee).includes(emp.nit_employee)));
    });

    // Renderiza los miembros en proceso de selección
    function renderizarMiembrosProceso() {
        miembrosProcesoEleccion.innerHTML = '';
        confirmarBtn.disabled = !(miembrosProceso.length >= 1 && miembrosProceso.length <= 10);

        if (miembrosProceso.length === 0) {
            miembrosProcesoEleccion.innerHTML = `<p class="text-center text-muted col-12">No hay miembros en proceso de elección.</p>`;
        } else {
            miembrosProceso.forEach(miembro => {
                const div = document.createElement('div');
                div.className = 'col';
                div.innerHTML = `
                    <div class="card-miembro-proceso" data-nit="${miembro.nit_employee}">
                        <div>
                            <h6 class="mb-0 fw-bold">${miembro.first_name} ${miembro.last_name}</h6>
                            <p class="mb-0 text-muted"><small>${miembro.name_post}</small></p>
                        </div>
                        <div class="acciones-miembro">
                            <i class="fas fa-times-circle text-danger action-icon" data-action="eliminar-proceso"></i>
                        </div>
                    </div>`;
                miembrosProcesoEleccion.appendChild(div);
            });
        }
        confirmarCountSpan.textContent = miembrosProceso.length;
    }

    // Lógica para confirmar (Insertar o Actualizar)
    confirmarBtn.addEventListener('click', async () => {
        const action = confirmarBtn.dataset.action;

        if (action === 'insert') {
            if (miembrosProceso.length === 0) {
                Swal.fire('Advertencia', 'Debes seleccionar al menos un miembro.', 'warning');
                return;
            }

            const miembrosParaEnviar = miembrosProceso.map(m => ({
                nit_employee: m.nit_employee,
                id_position: m.id_position
            }));

            console.log(miembrosParaEnviar);

            try {
                await insertMembersToCommite(miembrosParaEnviar);
                Swal.fire('Éxito', 'Miembros del comité añadidos correctamente.', 'success');
                myModal.hide();
                loadMembersTable();
            } catch (error) {
                Swal.fire('Error', 'Ocurrió un error al añadir los miembros. ' + error.message, 'error');
            }

        } else if (action === 'update') {
            if (!miembroSeleccionadoParaRol || !rolSelect.value) {
                Swal.fire('Advertencia', 'Debes seleccionar un rol para el miembro.', 'warning');
                return;
            }

            try {
                const updatedData = { id_position: parseInt(rolSelect.value) };
                console.log(miembroSeleccionadoParaRol.id_member, updatedData)
                await UpdatedRolMember(miembroSeleccionadoParaRol.id_member, updatedData);
                Swal.fire('Éxito', 'Rol del miembro actualizado correctamente.', 'success');
                myModal.hide();
                loadMembersTable();
            } catch (error) {
                Swal.fire('Error', 'Ocurrió un error al actualizar el rol. ' + error.message, 'error');
            }
        }
    });

    // Carga inicial
    loadMembersTable();
});
