import {
    getAllCategoryLineament,
    InsertNewCategoryLineament,
    UpdatedCategoryLineament,
    DeleteCategory,
    // Add this import, as it's missing but used in the code
    getCategoryLineamentByID 
} from "../Service/LineamentManagerService.js";

import {
    getAllDepartment
} from "../Service/DepartmentService.js";

document.addEventListener("DOMContentLoaded", () => {
    // Referencias a los elementos del DOM
    const categoryFormModal = document.getElementById("categoryFormModal");
    const updateCategoryFormModal = document.getElementById("updateCategoryFormModal");
    const closeCategoryBtn = document.getElementById("closeCategoryBtn");
    const closeUpdateCategoryBtn = document.getElementById("closeUpdateCategoryBtn");
    const createCategoryBtn = document.getElementById("createCategoryBtn");
    const categoryForm = document.getElementById("categoryForm");
    const updateCategoryForm = document.getElementById("updateCategoryForm");
    const categoryLineamentList = document.getElementById("categoryLineamentList");
    const categoryContextMenu = document.getElementById("categoryContextMenu");
    const editCategoryBtn = document.getElementById('editCategoryBtn');
    const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');

    let selectedCategoryId = null;

    const showAlert = (title, text, icon) => {
        Swal.fire({
            title,
            text,
            icon,
            confirmButtonText: 'Aceptar'
        });
    };

    // Función para cargar los departamentos en el formulario
    const loadDepartments = async (container) => {
        try {
            const departments = await getAllDepartment();
            container.innerHTML = ''; // Limpia el contenedor
            departments.forEach(dept => {
                const departmentItem = document.createElement("div");
                departmentItem.className = "department-item";
                departmentItem.innerHTML = `
                    <span class="department-name">${dept.name_department}</span>
                    <div class="department-icon-container">
                        <img src="${dept.logo_department}" alt="Icono de ${dept.name_department}" class="department-icon">
                    </div>
                    <input type="checkbox" id="${dept.id_department}" name="departments" value="${dept.id_department}">
                    <label for="${dept.id_department}" class="checkbox-custom"></label>
                `;
                container.appendChild(departmentItem);
            });
        } catch (error) {
            console.error("Error al cargar departamentos:", error);
            showAlert('Error', 'No se pudieron cargar los departamentos.', 'error');
        }
    };

    // Función para obtener los IDs de los departamentos seleccionados
    const getSelectedDepartments = (form) => {
        const departmentInputs = form.querySelectorAll('input[name="departments"]:checked');
        return Array.from(departmentInputs).map(input => input.value);
    };

    const renderCategories = async () => {
        try {
            const categories = await getAllCategoryLineament();
            categoryLineamentList.innerHTML = '';

            categories.forEach(category => {
                const categoryItem = document.createElement("div");
                categoryItem.className = "category-item";
                categoryItem.innerHTML = `
                <div class="category-header" data-id="${category.id_category_lineamient}">
                    <span>${category.name_category}</span>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="category-content">
                    <p>${category.description_category}</p>
                    <ul class="lineament-list" id="lineaments-${category.id_category_lineamient}">
                        </ul>
                </div>
            `;
                categoryLineamentList.appendChild(categoryItem);
            });

            // Evento para mostrar el menú de contexto
            document.querySelectorAll('.category-header').forEach(header => {
                header.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    selectedCategoryId = event.currentTarget.dataset.id;
                    const { clientX, clientY } = event;

                    categoryContextMenu.style.display = 'block';
                    categoryContextMenu.style.top = `${clientY}px`;
                    categoryContextMenu.style.left = `${clientX}px`;
                });

                // Evento para colapsar/expandir al hacer clic izquierdo
                header.addEventListener('click', (event) => {
                    const categoryContent = event.currentTarget.nextElementSibling;
                    const icon = event.currentTarget.querySelector('i');

                    if (categoryContent.style.display === "block") {
                        categoryContent.style.display = "none";
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-right');
                    } else {
                        categoryContent.style.display = "block";
                        icon.classList.remove('fa-chevron-right');
                        icon.classList.add('fa-chevron-down');
                    }
                });
            });

        } catch (error) {
            console.error("Error al renderizar categorías:", error);
            showAlert('Error', 'No se pudieron cargar las categorías existentes.', 'error');
        }
    };

    const loadCategoryForUpdate = async (id) => {
    try {
        console.log("ID que se envia para actualizar", id);
        
        const response = await getCategoryLineamentByID(id);
        console.log(response);
        
        const categoryData = response.data || response;
        console.log(categoryData);

        document.getElementById('updateCategoryName').value = categoryData.name_category;
        document.getElementById('updateCategoryDescription').value = categoryData.description_category;
        document.getElementById('updateCategoryId').value = categoryData.id_category_lineamient;

        // Obtener los departamentos y asegurar que sea un array
        const associatedDepartments = categoryData.departments ?? [];
        
        // Cargar todos los departamentos disponibles
        const deptContainer = document.querySelector('#updateCategoryForm .department-list');
        const allDepartments = await getAllDepartment();
        deptContainer.innerHTML = '';
        
        allDepartments.forEach(dept => {
            const isAssociated = associatedDepartments.some(
                d => d === dept.id_department || (d && d.id_department === dept.id_department)
            );
            
            const departmentItem = document.createElement("div");
            departmentItem.className = "department-item";
            departmentItem.innerHTML = `
                <span class="department-name">${dept.name_department}</span>
                <div class="department-icon-container">
                    <img src="${dept.logo_department}" alt="Icono de ${dept.name_department}" class="department-icon">
                </div>
                <input type="checkbox" id="update-${dept.id_department}" name="departments" value="${dept.id_department}" ${isAssociated ? 'checked' : ''}>
                <label for="update-${dept.id_department}" class="checkbox-custom"></label>
            `;
            deptContainer.appendChild(departmentItem);
        });

        // Mostrar el modal de actualización
        updateCategoryFormModal.style.display = 'block';
    } catch (error) {
        console.error("Error al cargar datos para actualizar:", error);
        showAlert('Error', 'No se pudo cargar la información de la categoría.', 'error');
    }
};

    // Lógica para abrir el modal de registro
    createCategoryBtn.addEventListener('click', async () => {
        await loadDepartments(document.querySelector('#categoryForm .department-list'));
        categoryForm.reset();
        categoryFormModal.style.display = 'block';
    });

    // Lógica para registrar una nueva categoría
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const categoryData = {
            name_category: document.getElementById('categoryName').value,
            description_category: document.getElementById('categoryDescription').value,
            logo_category: "https://empresa.com/logos/mantenimiento.png",
            departments: getSelectedDepartments(categoryForm)
        };

        try {
            const response = await InsertNewCategoryLineament(categoryData);
            if (response.success) {
                showAlert('¡Éxito!', 'Categoría registrada correctamente.', 'success');
                categoryFormModal.style.display = 'none';
                renderCategories();
            } else {
                showAlert('Error', response.message, 'error');
            }
        } catch (error) {
            showAlert('Error', 'Error al registrar la categoría.', 'error');
        }
    });

    // Lógica para actualizar una categoría
    updateCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedCategoryId) return;

        const updatedData = {
            name_category: document.getElementById('updateCategoryName').value,
            description_category: document.getElementById('updateCategoryDescription').value,
            logo_category: "https://empresa.com/logos/mantenimiento.png",
            departments: getSelectedDepartments(updateCategoryForm)
        };

        try {
            const response = await UpdatedCategoryLineament(selectedCategoryId, updatedData);
            if (response.success) {
                showAlert('¡Éxito!', 'Categoría actualizada correctamente.', 'success');
                updateCategoryFormModal.style.display = 'none';
                renderCategories();
            } else {
                showAlert('Error', response.message, 'error');
            }
        } catch (error) {
            showAlert('Error', 'Error al actualizar la categoría.', 'error');
        }
    });

    // Lógica para eliminar una categoría
    const handleDeleteCategory = async () => {
        if (!selectedCategoryId) return;

        Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esta acción. Se eliminarán los lineamientos asociados.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await DeleteCategory(selectedCategoryId);
                    if (response.success) {
                        showAlert('¡Eliminado!', 'La categoría y sus asociaciones han sido eliminadas.', 'success');
                        renderCategories();
                    } else {
                        showAlert('Error', response.message, 'error');
                    }
                } catch (error) {
                    showAlert('Error', 'Error al eliminar la categoría.', 'error');
                }
            }
        });
    };

    // ----- Manejo del Menú Contextual -----

    editCategoryBtn.addEventListener('click', () => {
        categoryContextMenu.style.display = 'none';
        if (selectedCategoryId) {
            loadCategoryForUpdate(selectedCategoryId);
        }
    });

    deleteCategoryBtn.addEventListener('click', () => {
        categoryContextMenu.style.display = 'none';
        handleDeleteCategory();
    });

    window.addEventListener('click', (event) => {
        // Cierra el menú de contexto si el clic no fue dentro de él
        if (!categoryContextMenu.contains(event.target) && categoryContextMenu.style.display === 'block') {
            categoryContextMenu.style.display = 'none';
        }
    });

    // Cerrar modales
    closeCategoryBtn.addEventListener('click', () => {
        categoryFormModal.style.display = 'none';
    });

    closeUpdateCategoryBtn.addEventListener('click', () => {
        updateCategoryFormModal.style.display = 'none';
    });

    // Cargar las categorías al iniciar
    renderCategories();
});