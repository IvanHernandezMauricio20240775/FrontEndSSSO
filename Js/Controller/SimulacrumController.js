import {
    GetAllLSimulacrumPage,
    InsertSimulacrum,
    UpdateSimulacrum,
    DeleteSimulacrum,
    GetSimulacrumById
} from "../Service/SimulacrumService.js";

document.addEventListener("DOMContentLoaded", () => {
    // Referencias al DOM
    const modalElement = document.getElementById("modalSimulacro");
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById("formSimulacro");
    const Input_ID = document.getElementById("ID_Simulacrum");
    const Input_Name = document.getElementById("nombreSimulacro");
    const Input_Date = document.getElementById("fechaSimulacro");
    const Input_Time = document.getElementById("horaSimulacro");
    const Input_Description = document.getElementById("descripcionSimulacro");
    const Input_Image = document.getElementById("foto");

    const btnOpenModal = document.getElementById("openFormBtn");
    const btnSaveForm = document.getElementById("btnSaveForm");

    const tableBody = document.getElementById("SimulacrumTableBody");
    const TableAnimate = document.getElementById("TableDiv");

    // Paginación
    let currentPage = 0;
    let totalPages = 0;
    const paginationNumbersContainer = document.getElementById("paginationNumbers");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");

    Input_ID.addEventListener('input', handleSimulacrumIdInput);
    
    // Función para animación tabla
    function applyFadeInAnimation() {
        TableAnimate.classList.remove('animate__fadeIn');
        setTimeout(() => {
            TableAnimate.classList.add('animate__fadeIn');
        }, 10);
    }

    // Generar botones de paginación
    function renderPageNumbers() {
        paginationNumbersContainer.innerHTML = '';
        if (totalPages <= 1) return;

        for (let i = 0; i < totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i + 1}</a>`;
            paginationNumbersContainer.appendChild(li);
        }
    }

    // Cargar simulacros en tabla
    async function LoadAllSimulacrums() {
        applyFadeInAnimation();
        tableBody.innerHTML = "";
        try {
            const response = await GetAllLSimulacrumPage(currentPage, 6);
            const simulacrums = response.content || response.data?.content || [];
            totalPages = response.totalPages || response.data?.totalPages || 0;

            if (simulacrums.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay simulacros registrados</td></tr>`;
                return;
            }

            simulacrums.forEach(sim => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td class="px-3 text-center">
                        <img src="${sim.img_simulacrum || 'img/SimulacrumImage.png'}" alt="Simulacro" class="extintor-image">
                    </td>
                    <td class="px-3 fw-bold text-muted">#${sim.id_simulacrum}</td>
                    <td class="px-3">${sim.name_simulacrum}</td>
                    <td class="px-3">${sim.dt_simulacrum}</td>
                    <td class="px-3">${sim.simulacrum_time}</td>
                    <td class="px-3">${sim.simulacrum_status}</td>
                    <td class="px-3">
                        <a href="#" class="action-btn me-2 btn-edit-simulacrum" data-id="${sim.id_simulacrum}"><i class="fa-solid fa-pen-to-square"></i></a>
                        <a href="#" class="action-btn text-danger btn-delete-simulacrum" data-id="${sim.id_simulacrum}"><i class="fa-solid fa-trash-can"></i></a>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            renderPageNumbers();
        } catch (error) {
            console.error("Error al cargar simulacros:", error);
        }
    }

    // Abrir modal para nuevo
    btnOpenModal.addEventListener("click", () => {
        form.reset();
        Input_ID.value = "SIML-";
        Input_ID.readOnly = false;
        btnSaveForm.dataset.action = "create";
        btnSaveForm.textContent = "Programar Simulacro";
        modal.show();
    });

    function validateForm() {
    const errors = [];

    // ID simulacro
    if (!Input_ID.value.trim()) {
        errors.push("El ID del simulacro no puede estar vacío.");
    } else if (Input_ID.value.length > 50) {
        errors.push("El ID del simulacro no puede exceder los 50 caracteres.");
    }

    const idValue = Input_ID.value.trim();
    if (!idValue) {
        errors.push("El ID del simulacro no puede estar vacío.");
    } else if (idValue.length > 50) {
        errors.push("El ID del simulacro no puede exceder los 50 caracteres.");
    } else if (!/^SIML-\d{3}$/.test(idValue)) {
        errors.push("El ID del simulacro debe tener el formato SIM-XXX, donde XXX son 3 dígitos.");
    }

    // Nombre
    if (!Input_Name.value.trim()) {
        errors.push("El nombre del simulacro no puede estar vacío.");
    } else if (Input_Name.value.length > 200) {
        errors.push("El nombre del simulacro no puede exceder los 200 caracteres.");
    }

    // URL de imagen (opcional)
    if (Input_Image.value.trim()) {
        if (Input_Image.value.length > 1000) {
            errors.push("La URL de la imagen del simulacro no puede exceder los 1000 caracteres.");
        } else {
            try {
                new URL(Input_Image.value);
            } catch {
                errors.push("La URL de la imagen del simulacro no es válida.");
            }
        }
    }

    // Fecha simulacro
    if (!Input_Date.value) {
        errors.push("La fecha del simulacro no puede ser nula.");
    } else {
        const inputDate = new Date(Input_Date.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (inputDate < today) {
            errors.push("La fecha del simulacro debe ser actual o futura.");
        }
    }

    // Hora simulacro
    if (!Input_Time.value.trim()) {
        errors.push("La hora del simulacro no puede estar vacía.");
    } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(Input_Time.value)) {
        errors.push("El formato de la hora debe ser HH:mm.");
    }

    // Descripción
    if (Input_Description.value.length > 700) {
        errors.push("La descripción del simulacro no puede exceder los 700 caracteres.");
    }

    // ID miembro
    if (!Input_ID.value) {
        errors.push("El ID del miembro del comité no puede ser nulo.");
    }

    // Estado (solo para actualización)
    if (btnSaveForm.dataset.action === "update") {
        const status = "PENDIENTE"; // Por defecto en tu formulario
        if (!/^(COMPLETADO|PENDIENTE|VENCIDO)$/i.test(status)) {
            errors.push("El estado del simulacro debe ser COMPLETADO, PENDIENTE o VENCIDO.");
        }
    }

    return errors;
}


    // Guardar simulacro (crear o actualizar)
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
         const errors = validateForm();

    if (errors.length > 0) {
        e.preventDefault();
        Swal.fire({
            icon: "error",
            title: "Error de validación",
            html: errors.join("<br>")
        });
        return;
    }
        const data = {
            id_simulacrum: Input_ID.value,
            name_simulacrum: Input_Name.value,
            dt_simulacrum: Input_Date.value,
            simulacrum_time: Input_Time.value,
            description_simulacrum: Input_Description.value,
            img_simulacrum: "https://empresa.com/logos/mantenimiento.png", // si quieres convertir la imagen en base64 aquí
            id_member: 1, // <-- asigna tu ID por defecto
            simulacrum_status: "PENDIENTE"
        };

        try {
            let response;
            if (btnSaveForm.dataset.action === "create") {
                response = await InsertSimulacrum(data);
                Swal.fire("Éxito", "Simulacro creado correctamente", "success");
            } else {
                const id = btnSaveForm.dataset.id;
                response = await UpdateSimulacrum(id, data);
                Swal.fire("Éxito", "Simulacro actualizado correctamente", "success");
            }
            modal.hide();
            LoadAllSimulacrums();
        } catch (error) {
            console.error("Error al guardar:", error);
            Swal.fire("Error", "No se pudo guardar el simulacro", "error");
        }
    });

    // Editar simulacro
    tableBody.addEventListener("click", async (e) => {
        if (e.target.closest(".btn-edit-simulacrum")) {
            const id = e.target.closest(".btn-edit-simulacrum").dataset.id;
            try {
                const response = await GetSimulacrumById(id);
                const sim = response.data || response;
                console.log(sim)

                form.reset();
                Input_ID.value = sim.id_simulacrum;
                Input_ID.readOnly = true;
                Input_Name.value = sim.name_simulacrum;
                Input_Date.value = sim.dt_simulacrum;
                Input_Time.value = sim.simulacrum_time;
                Input_Description.value = sim.description_simulacrum;

                btnSaveForm.dataset.action = "update";
                btnSaveForm.dataset.id = sim.id_simulacrum;
                btnSaveForm.textContent = "Actualizar Simulacro";

                modal.show();
            } catch (error) {
                Swal.fire("Error", "No se pudo cargar el simulacro", "error");
            }
        }
    });

    // Eliminar simulacro
    tableBody.addEventListener("click", async (e) => {
        if (e.target.closest(".btn-delete-simulacrum")) {
            const id = e.target.closest(".btn-delete-simulacrum").dataset.id;

            Swal.fire({
                title: "¿Eliminar simulacro?",
                text: "Esta acción no se puede deshacer",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar"
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await DeleteSimulacrum(id);
                        Swal.fire("Eliminado", "Simulacro eliminado correctamente", "success");
                        LoadAllSimulacrums();
                    } catch (error) {
                        Swal.fire("Error", "No se pudo eliminar el simulacro", "error");
                    }
                }
            });
        }
    });

    // Paginación
    paginationNumbersContainer.addEventListener("click", (e) => {
        if (e.target.tagName === "A") {
            currentPage = parseInt(e.target.dataset.page);
            LoadAllSimulacrums();
        }
    });

    prevPageBtn.addEventListener("click", () => {
        if (currentPage > 0) {
            currentPage--;
            LoadAllSimulacrums();
        }
    });

    nextPageBtn.addEventListener("click", () => {
        if (currentPage < totalPages - 1) {
            currentPage++;
            LoadAllSimulacrums();
        }
    });

    function handleSimulacrumIdInput(e) {
        const input = e.target;
        let value = input.value;

        if (!value.startsWith("SIML-")) {
            value = "SIML-" + value.replace("SIML-", "");
        }

        let numbers = value.replace("SIML-", "").replace(/[^0-9]/g, '');

        if (numbers.length > 3) {
            numbers = numbers.substring(0, 3);
        }

        input.value = "SIML-" + numbers;
    }

    // Cargar tabla al inicio
    LoadAllSimulacrums();
});