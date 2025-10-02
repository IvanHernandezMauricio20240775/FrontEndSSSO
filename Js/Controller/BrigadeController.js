import {
    getAllBrigades,
    getBrigadeByID,
    InsertNewBrigade,
    UpdatedBrigade,
    DeleteBrigade
} from "../Service/BrigadeService.js";

document.addEventListener("DOMContentLoaded", () => {

    const CardsContent = document.getElementById("CardsBrigade-Content");
    const modalElement = document.getElementById("BrigadeModal");
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById("BrigadaForm");
    const titleModal = document.getElementById("BrigadeModalLabel");
    const btnAddBrigade = document.getElementById("openFormBtn");
    const Input_ID = document.getElementById("ID_Brigade");
    const btnSaveForm = document.getElementById("saveButton");

    // Llama a la función principal para cargar las brigadas al inicio
    LoadALlBrigades();

    // Event listeners para los botones del formulario
    btnAddBrigade.addEventListener("click", handleAddBrigade);
    form.addEventListener("submit", handleFormSubmit);

    function validateBrigadeForm(form, inputCantidad) {
        const idPattern = /^BRG-\d{3}$/; // Debe empezar con BRG- y exactamente 3 dígitos
        const idValue = form.ID_Brigade.value.trim();
        const nameValue = form.NameBrigade.value.trim();
        const descriptionValue = form.DescriptionBrigade.value.trim();
        const capacityValue = parseInt(inputCantidad.value);

        // ✅ Validación ID
        if (!idPattern.test(idValue)) {
            Swal.fire({
                icon: 'error',
                title: 'Error en el ID',
                text: 'El ID debe tener el formato BRG-000 (3 dígitos obligatorios después del guion).'
            });
            return false;
        }

        // ✅ Validación Nombre
        if (nameValue === "") {
            Swal.fire({
                icon: 'error',
                title: 'Error en el Nombre',
                text: 'El nombre de la Brigada no debe estar vacío.'
            });
            return false;
        }
        if (nameValue.length > 200) {
            Swal.fire({
                icon: 'error',
                title: 'Error en el Nombre',
                text: 'El nombre de la Brigada no puede exceder los 200 caracteres.'
            });
            return false;
        }

        // ✅ Validación Descripción
        if (descriptionValue.length > 1000) {
            Swal.fire({
                icon: 'error',
                title: 'Error en la Descripción',
                text: 'La descripción no puede exceder los 1000 caracteres.'
            });
            return false;
        }

        // ✅ Validación Capacidad
        if (isNaN(capacityValue)) {
            Swal.fire({
                icon: 'error',
                title: 'Error en Capacidad',
                text: 'La capacidad debe ser un número válido.'
            });
            return false;
        }
        if (capacityValue < 5) {
            Swal.fire({
                icon: 'error',
                title: 'Error en Capacidad',
                text: 'La brigada debe tener capacidad mínima de 5 integrantes.'
            });
            return false;
        }
        if (capacityValue > 35) {
            Swal.fire({
                icon: 'error',
                title: 'Error en Capacidad',
                text: 'La brigada no puede tener más de 35 integrantes.'
            });
            return false;
        }

        return true; // ✅ Todo correcto
    }

    // Event listeners para los botones de cantidad
    const botonRestar = document.getElementById('btn-restar');
    const botonSumar = document.getElementById('btn-sumar');
    const inputCantidad = document.getElementById('cantidad-input');
    const VALOR_MINIMO = 1;
    const VALOR_MAXIMO = 35;

    botonRestar.addEventListener('click', () => {
        let cantidadActual = parseInt(inputCantidad.value);
        if (cantidadActual > VALOR_MINIMO) {
            inputCantidad.value = cantidadActual - 1;
        }
    });

    botonSumar.addEventListener('click', () => {
        let cantidadActual = parseInt(inputCantidad.value);
        if (cantidadActual < VALOR_MAXIMO) {
            inputCantidad.value = cantidadActual + 1;
        }
    });

    // Delegación de eventos para los botones de las tarjetas
    CardsContent.addEventListener('click', handleCardActions);

    async function handleAddBrigade() {
        form.reset();
        Input_ID.value = "BRG-";
        Input_ID.readOnly = false;
        titleModal.textContent = "Registrar Nueva Brigada";
        btnSaveForm.innerHTML = `<i class="fas fa-save me-2"></i> Registrar Nueva Brigada`;
        modal.show();
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        if (!validateBrigadeForm(form, inputCantidad)) {
            return; // 🚫 Detiene el submit si no pasa validación
        }

        const idBrigade = Input_ID.value;
        const isEditing = Input_ID.readOnly;

        const data_Brigade = {
            "ID_brigade": idBrigade,
            "name_Brigade": form.NameBrigade.value,
            "description": form.DescriptionBrigade.value,
            "capacity_Staff": parseInt(inputCantidad.value),
            "img_Brigade": "url_de_la_imagen_por_defecto.jpg"
        };

        try {
            if (isEditing) {
                await UpdatedBrigade(idBrigade, data_Brigade);
                Swal.fire('¡Actualizada!', 'La brigada ha sido actualizada correctamente.', 'success');
            } else {
                console.log("Objeto a enviar", data_Brigade)
                await InsertNewBrigade(data_Brigade);
                Swal.fire('¡Registrada!', 'La nueva brigada ha sido creada correctamente.', 'success');
            }
            modal.hide();
            await LoadALlBrigades(); // Recarga las tarjetas para ver los cambios
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: error.message || 'Algo salió mal. Por favor, inténtelo de nuevo.',
            });
        }
    }

    async function handleCardActions(e) {
        const editButton = e.target.closest('.edit-brigade-btn');
        const deleteButton = e.target.closest('.delete-brigade-btn');

        if (editButton) {
            const card = e.target.closest('.card-col');
            const idBrigade = card.dataset.id;
            console.log("ID que se envia al Endopint", idBrigade)
            try {
                const response = await getBrigadeByID(idBrigade);
                if (!response.status) {
                    Swal.fire('Error', response.message || 'Brigada no encontrada.', 'error');
                    return;
                }
                const brigadeToEdit = response.data;

                // Llenar el formulario con los datos de la brigada
                Input_ID.value = brigadeToEdit.ID_brigade;
                form.NameBrigade.value = brigadeToEdit.name_Brigade;
                form.DescriptionBrigade.value = brigadeToEdit.description;
                inputCantidad.value = brigadeToEdit.capacity_Staff;

                Input_ID.readOnly = true;
                titleModal.textContent = "Editar Brigada";
                btnSaveForm.innerHTML = `<i class="fas fa-save me-2"></i> Actualizar Brigada`;
                modal.show();

            } catch (error) {
                Swal.fire('Error', 'No se pudo cargar la brigada para editar.', 'error');
            }
        }

        if (deleteButton) {
            const card = e.target.closest('.card-col');
            const idBrigade = card.dataset.id;

            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: "¡No podrás revertir esto!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                try {
                    console.log(idBrigade)
                    await DeleteBrigade(idBrigade);
                    Swal.fire('¡Eliminado!', 'La brigada ha sido eliminada.', 'success');
                    await LoadALlBrigades(); // Recarga las tarjetas para reflejar el cambio
                } catch (error) {
                    Swal.fire('Error', error.message || 'No se pudo eliminar la brigada.', 'error');
                }
            }
        }
    }

    async function LoadALlBrigades() {
        CardsContent.innerHTML = "";
        try {
            const Brigades = await getAllBrigades();

            if (!Brigades || Brigades.length === 0) {
                CardsContent.innerHTML = '<h2 class="text-center text-muted">No existe ninguna Brigada registrada</h2>';
                return;
            }

            Brigades.forEach(brigade => {
                const CardHTML = `
                <div class="col-12 col-md-6 col-lg-4 card-col" data-id="${brigade.ID_brigade}">
                    <div class="card brigade-card-custom">
                        <div class="card-options dropdown">
                            <button class="btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item edit-brigade-btn" href="#">Actualizar</a></li>
                                <li><a class="dropdown-item text-danger delete-brigade-btn" href="#">Eliminar</a></li>
                            </ul>
                        </div>
                        <div class="card-image-wrapper first-aid-bg">
                            <img src="${brigade.img_Brigade || 'img/primeros-auxilios-1-1024x474.jpg'}" alt="Icono de Brigada" class="brigade-icon">
                        </div>
                        <div class="card-body-custom">
                            <h3>${brigade.name_Brigade}</h3>
                            <p>${brigade.description}</p>
                            <p><strong>Capacidad:</strong> ${brigade.capacity_Staff}</p>
                            <a href="BrigadaPrimerosAuxilios.html?id=${brigade.ID_brigade}" class="view-more-button-custom">Ver más >></a>
                        </div>
                    </div>
                </div>`;
                CardsContent.insertAdjacentHTML('beforeend', CardHTML);
            });
        } catch (error) {
            console.error("Error al cargar las brigadas:", error);
            CardsContent.innerHTML = '<h2 class="text-center text-danger">Error al cargar las Brigadas</h2>';
        }
    }
});