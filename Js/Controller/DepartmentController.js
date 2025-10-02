import {
    getAllDepartment,
    InsertNewDepartment,
    UpdatedDepartment,
    DeleteDepartment
} from "../Service/DepartmentService.js";

document.addEventListener("DOMContentLoaded", () => {
    // Definición de elementos y variables
    const CardContent = document.getElementById("CardsContent");
    const btnAddDepartment = document.getElementById("OpenModal");
    const modalElement = document.getElementById("departamentoModal");
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById("departamentoForm");
    const Input_ID = document.getElementById("ID_Departamento");
    const titleModal = document.getElementById("departamentoModalLabel");
    const btnSaveForm = document.getElementById("saveButton");
    
    // Función para validar los campos del formulario
    const validateForm = () => {
        const idValue = Input_ID.value.trim();
        const nameValue = form.nombreDepartamento.value.trim();
        const numberRegex = /^\d+$/; // Regex para verificar si son solo números

        if (!idValue || !nameValue) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos requeridos',
                text: 'Por favor, complete todos los campos obligatorios.'
            });
            return false;
        }

        if (numberRegex.test(nameValue)) {
            Swal.fire({
                icon: 'warning',
                title: 'Nombre Inválido',
                text: 'El nombre del departamento no puede contener solo números.'
            });
            return false;
        }

    
        if (!/^[a-zA-Z0-9-]*$/.test(idValue) || numberRegex.test(idValue)) {
            Swal.fire({
                icon: 'warning',
                title: 'ID Inválido',
                text: 'El ID solo puede contener letras, números y guiones.'
            });
            return false;
        }
        
        return true;
    };


    LoadDepartmentCards();

    // Evento para abrir el modal de registro
    btnAddDepartment.addEventListener("click", () => {
        form.reset();
        Input_ID.value = "DPT-";
        Input_ID.readOnly = false; // Habilita el input
        titleModal.textContent = "Registrar Nuevo Departamento";
        btnSaveForm.innerHTML = `<i class="fas fa-save me-2"></i> Registrar Departamento`;
        // Asegúrate de que esto sea una función, no una propiedad
        modal.show(); 
    });

    // Evento de envío del formulario (INSERTAR/ACTUALIZAR)
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const id = Input_ID.value.trim();
        const data_Department = {
            id_department: id,
            name_department: form.nombreDepartamento.value.trim(),
            description_department: form.descripcionDepartamento.value.trim(),
            logo_department: "https://empresa.com/logos/mantenimiento.png"
        };
        
        const isEditing = Input_ID.readOnly; // Determinamos la acción por el estado del input
        let successMessage = isEditing ? '¡Actualización Exitosa!' : '¡Registro Exitoso!';
        let successText = isEditing ? 'El departamento ha sido actualizado correctamente.' : 'El nuevo departamento ha sido creado correctamente.';
        
        try {
            if (isEditing) {
                await UpdatedDepartment(id, data_Department);
            } else {
                await InsertNewDepartment(data_Department);
            }

            await Swal.fire({
                icon: 'success',
                title: successMessage,
                text: successText,
                showConfirmButton: false,
                timer: 1500
            });

            modal.hide();
            await LoadDepartmentCards();

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: error.message || 'Algo salió mal. Por favor, inténtelo de nuevo.',
                showConfirmButton: true
            });
        }
    });

    
    async function LoadDepartmentCards() {
        CardContent.innerHTML = ""; // Limpia el contenido antes de cargar
        const departments = await getAllDepartment();

        if (!departments || departments.length === 0) {
            CardContent.innerHTML = '<h2 class="text-center text-muted">No existe ningún departamento registrado</h2>';
            return;
        }
        
        // Renderiza las tarjetas usando un método más eficiente
        departments.forEach((department) => {
            const cardHTML = `<div class="col">
                <div class="card card-departamento h-100 shadow-sm border-0 animate__animated animate__fadeInUp">
                    <div class="card-body text-center">
                        <div class="departamento-icon-container">
                            <i class="fas fa-building departamento-icon"></i>
                        </div>
                        <h5 hidden data-id="${department.id_department}" class="department-id-hidden">${department.id_department}</h5>
                        <h5 class="card-title mt-3">${department.name_department}</h5>
                    </div>
                    <div class="card-footer bg-transparent border-0 d-flex justify-content-center gap-2">
                        <button class="btn btn-outline-info btn-sm btn-edit-departamento" data-bs-toggle="modal"
                            data-bs-target="#departamentoModal">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm btn-delete-departamento">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>`;
            CardContent.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // Usando Delegación de Eventos para manejar clics en las tarjetas
    CardContent.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.btn-edit-departamento');
        const deleteButton = e.target.closest('.btn-delete-departamento');

        if (editButton) {
            const card = e.target.closest('.card-departamento');
            const departmentId = card.querySelector('.department-id-hidden').dataset.id;
            
            // Busca los datos del departamento para rellenar el formulario
            const departments = await getAllDepartment();
            const departmentToEdit = departments.find(d => d.id_department === departmentId);
            
            if (departmentToEdit) {
                form.reset();
                Input_ID.value = departmentToEdit.id_department;
                form.nombreDepartamento.value = departmentToEdit.name_department;
                form.descripcionDepartamento.value = departmentToEdit.description_department;
                
                Input_ID.readOnly = true; 
                titleModal.textContent = "Editar Departamento";
                btnSaveForm.innerHTML = `<i class="fas fa-save me-2"></i> Actualizar Departamento`;
                modal.show();
            }
        }

        if (deleteButton) {
            const card = e.target.closest('.card-departamento');
            const departmentId = card.querySelector('.department-id-hidden').dataset.id;
            
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
                    await DeleteDepartment(departmentId);
                    await Swal.fire({
                        icon: 'success',
                        title: '¡Eliminado!',
                        text: 'El departamento ha sido eliminado correctamente.',
                        showConfirmButton: false,
                        timer: 1500
                    });
                    await LoadDepartmentCards();
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al eliminar',
                        text: error.message || 'No se pudo eliminar el departamento.',
                    });
                }
            }
        }
    });
});