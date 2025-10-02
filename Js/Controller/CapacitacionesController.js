import {
    GetAllTraining,
    ProgramNewTraining,
    UpdatedTraining,
    DeleteTraining
} from "../Service/CapacitacionesService.js";

// Tu servicio para obtener las brigadas
import {
    getAllBrigades
} from "../Service/BrigadeService.js";

document.addEventListener("DOMContentLoaded", async () => {

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

    let allTrainings = [];
    let allBrigades = [];
    let currentFilter = "PENDIENTE";

    // Función para manejar errores de forma centralizada
    function handleResponseError(error, customMessage) {
        console.error(error);
        const errorMessage = error.message || "Ocurrió un error inesperado.";
        Swal.fire({
            icon: 'error',
            title: '¡Error!',
            text: `${customMessage || 'Hubo un problema con la operación.'} Detalles: ${errorMessage}`,
        });
    }

    // Cargar datos iniciales (brigadas y capacitaciones)
    async function loadData() {
        try {
            // Cargar brigadas primero para renderizar los checkboxes
            allBrigades = await getAllBrigades();
            console.log(allBrigades)
            renderBrigadeOptions(allBrigades);
            allTrainings = await GetAllTraining();
            console.log(allTrainings)
            renderTrainings(allTrainings);
            updateMetrics();
        } catch (error) {
            handleResponseError(error, "No se pudieron cargar los datos iniciales.");
        }
    }

    // Renderizar opciones de brigadas en el modal
    function renderBrigadeOptions(brigades) {
        brigadaOptionsContainer.innerHTML = "";
        brigades.forEach(brigade => {
            const card = `
                <div class="brigada-card">
                    <span>${brigade.name_Brigade}</span>
                    <img src="${brigade.img_Brigade || 'img/default.png'}" alt="${brigade.name_Brigade}" class="brigada-icon" />
                    <input class="form-check-input" type="checkbox" name="brigada" value="${brigade.ID_brigade}" />
                </div>
            `;
            brigadaOptionsContainer.innerHTML += card;
        });
    }

    // Lógica para el switch de "asignar a todas"
    asignarTodasSwitch.addEventListener('change', (e) => {
        const checkboxes = brigadaOptionsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
    });

    // Función para mostrar las capacitaciones en el DOM
    function renderTrainings(trainings) {
        mainTimeline.innerHTML = "";
        const filteredTrainings = trainings.filter(training => {
            const matchesStatus = training.Status_Training === currentFilter;
            const matchesSearch = searchInput.value.toLowerCase().trim() === "" ||
                training.name_training.toLowerCase().includes(searchInput.value.toLowerCase().trim()) ||
                training.id_training.toLowerCase().includes(searchInput.value.toLowerCase().trim());
            return matchesStatus && matchesSearch;
        });

        if (filteredTrainings.length === 0) {
            mainTimeline.innerHTML = '<p class="text-center text-muted">No hay capacitaciones para mostrar.</p>';
            return;
        }

        filteredTrainings.forEach(training => {
            const brigadesNames = training.list_brigades_id.map(id => {
                const brigade = allBrigades.find(b => b.ID_brigade === id);
                return brigade ? brigade.name_Brigade : "Brigada Desconocida";
            }).join(', ');

            const trainingCard = `
                <div class="entry">
                    <div class="content">
                        <h3>${training.name_training}</h3>
                        <p>${training.description}</p>
                        <p class="fecha">📅 Fecha: ${training.date_training}</p>
                        <p class="Time"> Hora: ${training.time_training}</p>
                        <p>🧑‍⚕️ Brigadas participantes: ${brigadesNames}</p>
                        <div class="actions">
                            <button class="btn btn-sm btn-outline-info edit-btn" data-id="${training.id_training}">
                                Editar
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${training.id_training}">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            mainTimeline.innerHTML += trainingCard;
        });
    }

    // Actualizar contadores de capacitaciones
    function updateMetrics() {
        const pendientes = allTrainings.filter(t => t.Status_Training === 'PENDIENTE').length;
        const completadas = allTrainings.filter(t => t.Status_Training === 'COMPLETADA').length;
        pendientesCount.textContent = pendientes;
        completadasCount.textContent = completadas;
    }

    // Event listeners para filtros y búsqueda
    btnPendientes.addEventListener('click', () => {
        currentFilter = 'PENDIENTE';
        btnPendientes.classList.add('active');
        btnCompletadas.classList.remove('active');
        renderTrainings(allTrainings);
    });

    btnCompletadas.addEventListener('click', () => {
        currentFilter = 'COMPLETADA';
        btnCompletadas.classList.add('active');
        btnPendientes.classList.remove('active');
        renderTrainings(allTrainings);
    });

    searchInput.addEventListener('input', () => {
        renderTrainings(allTrainings);
    });

    // Event listener para el botón "Programar"
    btnProgramTraining.addEventListener("click", () => {
        modalCapacitacion.show();
        formCapacitacion.reset();
        btnSubmitForm.textContent = "Programar Capacitación";
        inputID.value = "CPT-";
        inputID.disabled = false; // Habilitar el input de ID
        btnSubmitForm.dataset.mode = "insert";
        asignarTodasSwitch.checked = false; // Resetear el switch
        const checkboxes = brigadaOptionsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false); // Desmarcar todos los checkboxes
    });

    // Manejo de la inserción de ID con formato "CPT-###"
    inputID.addEventListener('input', (e) => {
        const input = e.target;
        let value = input.value;
        if (!value.startsWith("CPT-")) {
            value = "CPT-" + value.replace("CPT-", "");
        }
        let numbers = value.replace("CPT-", "").replace(/[^0-9]/g, '');
        if (numbers.length > 3) {
            numbers = numbers.substring(0, 3);
        }
        input.value = "CPT-" + numbers;
    });


    // Manejo del envío del formulario (Insertar/Actualizar)
    formCapacitacion.addEventListener("submit", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!formCapacitacion.checkValidity()) {
            formCapacitacion.classList.add('was-validated');
            return;
        }

        const mode = btnSubmitForm.dataset.mode;
        const selectedBrigades = Array.from(document.querySelectorAll('input[name="brigada"]:checked'))
            .map(checkbox => checkbox.value);

        if (selectedBrigades.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'Debes seleccionar al menos una brigada para la capacitación.',
            });
            return;
        }

        const trainingData = {
            id_training: inputID.value,
            name_training: inputNombre.value,
            date_training: inputFecha.value,
            time_training: inputHora.value,
            img_training: "https://ejemplo.com/imagen.png", // Debes manejar la subida de imágenes
            description: inputDescripcion.value,
            Status_Training: "PENDIENTE",
            list_brigades_id: selectedBrigades,
        };

        console.log(trainingData);
        try {
            if (mode === 'insert') {

                await ProgramNewTraining(trainingData);
                Swal.fire('¡Éxito!', 'Capacitación programada correctamente.', 'success');
                modalCapacitacion.hide();
            } else if (mode === 'update') {
                await UpdatedTraining(trainingData.id_training, trainingData);
                Swal.fire('¡Éxito!', 'Capacitación actualizada correctamente.', 'success');
            }
            modalCapacitacion.hide();
            formCapacitacion.classList.remove('was-validated');
            await loadData(); // Recargar datos para ver los cambios
        } catch (error) {
            handleResponseError(error, "No se pudo completar la operación.");
        }
    });

    // Manejo de botones de Editar y Eliminar
    mainTimeline.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const trainingId = e.target.dataset.id;
            const trainingToEdit = allTrainings.find(t => t.id_training === trainingId);
            if (trainingToEdit) {
                // Llenar el formulario con los datos de la capacitación
                inputID.value = trainingToEdit.id_training;
                inputID.disabled = true; // Deshabilitar ID en modo edición
                inputNombre.value = trainingToEdit.name_training;
                inputFecha.value = trainingToEdit.date_training;
                inputHora.value = trainingToEdit.time_training;
                inputDescripcion.value = trainingToEdit.description;

                // Marcar las brigadas asociadas
                const checkboxes = brigadaOptionsContainer.querySelectorAll('input[name="brigada"]');
                checkboxes.forEach(cb => {
                    cb.checked = trainingToEdit.list_brigades_id.includes(cb.value);
                });

                // Actualizar el botón y abrir el modal
                btnSubmitForm.textContent = "Actualizar Capacitación";
                btnSubmitForm.dataset.mode = "update";
                modalCapacitacion.show();
            }
        }

        if (e.target.classList.contains('delete-btn')) {
            const trainingId = e.target.dataset.id;
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: "¡No podrás revertir esto!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                try {
                    await DeleteTraining(trainingId);
                    Swal.fire('¡Eliminado!', 'La capacitación ha sido eliminada.', 'success');
                    await loadData(); // Recargar la lista después de eliminar
                } catch (error) {
                    handleResponseError(error, "No se pudo eliminar la capacitación.");
                }
            }
        }
    });

    // Cargar los datos al iniciar la página
    loadData();

});