// JS para la funcionalidad de la página
document.addEventListener('DOMContentLoaded', () => {
    // JSON de las acciones preventivas, agrupadas por PPA y versión
    const ppaActionsData = {
        '2025': {
            'ENE-MAR': [
                {
                    activityName: 'Trabajos en altura',
                    actions: [
                        { titulo: 'Inspección del Arnés', descripcion: 'Antes de usar, revisar visual y manualmente los correajes del arnés. Buscar cortes, desgarros, quemaduras o costuras deshilachadas.', estado: 'implementado' },
                        { titulo: 'Verificación del Punto de Anclaje', descripcion: 'Antes de usar, revisar visual y manualmente los correajes del arnés. Buscar cortes, desgarros, quemaduras o costuras deshilachadas.', estado: 'induccion' },
                        { titulo: 'Chequeo de la Línea de Vida', descripcion: 'Antes de usar, revisar visual y manualmente los correajes del arnés. Buscar cortes, desgarros, quemaduras o costuras deshilachadas.', estado: 'implementado' },
                        { titulo: 'Asegurar Barandas de Andamio', descripcion: 'Antes de usar, revisar visual y manualmente los correajes del arnés. Buscar cortes, desgarros, quemaduras o costuras deshilachadas.', estado: 'implementado' },
                        { titulo: 'Revisión de Escaleras', descripcion: 'Antes de usar, revisar visual y manualmente los correajes del arnés. Buscar cortes, desgarros, quemaduras o costuras deshilachadas.', estado: 'induccion' }
                    ]
                },
                {
                    activityName: 'Trabajos en Caliente',
                    actions: [
                        { titulo: 'Inspección de Equipos de Soldadura', descripcion: 'Revisar cables, mangueras y conexiones antes de cada uso. Verificar que no haya fugas o daños.', estado: 'implementado' },
                        { titulo: 'Delimitación del Área de Trabajo', descripcion: 'Utilizar barreras y señalización para delimitar el área de trabajo y advertir a personal externo.', estado: 'induccion' }
                    ]
                }
            ],
            'ABRIL-JUL': [],
            'ABRIL-OCT': []
        },
        '2024': {}
    };

    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');
    const version = urlParams.get('version');

    const ppaVersionTitle = document.getElementById('ppa-version-title');
    const activitiesContainer = document.getElementById('activities-container');
    const formNuevaAccion = document.getElementById('formNuevaAccion');
    const formNuevaActividad = document.getElementById('formNuevaActividad');
    const formModificarAccion = document.getElementById('formModificarAccion');
    const btnDescargarPDF = document.getElementById('descargarPDF');

    let currentActionsData = [];

    // Función para renderizar las tarjetas de acciones preventivas
    const renderActions = () => {
        activitiesContainer.innerHTML = '';
        if (currentActionsData.length > 0) {
            currentActionsData.forEach((activity, activityIndex) => {
                const activitySection = document.createElement('div');
                activitySection.classList.add('activity-section');
                activitySection.dataset.activityIndex = activityIndex;
                activitySection.innerHTML = `
                            <h4>${activity.activityName}</h4>
                            <div class="title-line"></div>
                            <div class="action-container mt-3"></div>
                        `;

                const actionContainer = activitySection.querySelector('.action-container');
                activity.actions.forEach((action, actionIndex) => {
                    const statusClass = action.estado === 'implementado' ? 'status-implementado' : 'status-induccion';
                    const card = document.createElement('div');
                    card.classList.add('action-card');
                    card.dataset.activityIndex = activityIndex;
                    card.dataset.actionIndex = actionIndex;
                    card.innerHTML = `
                                <div class="action-card-status ${statusClass}"></div>
                                <div class="d-flex align-items-start">
                                    <div class="dropdown me-2">
                                        <button class="btn btn-link p-0 action-options-icon" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="fas fa-list"></i>
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item btn-modificar" href="#">Modificar</a></li>
                                            <li><a class="dropdown-item btn-eliminar" href="#">Eliminar</a></li>
                                        </ul>
                                    </div>
                                    <div class="flex-grow-1 ms-4">
                                        <h6 class="fw-bold">${action.titulo}</h6>
                                        <p class="small text-muted">${action.descripcion}</p>
                                    </div>
                                </div>
                            `;
                    actionContainer.appendChild(card);
                });

                activitiesContainer.appendChild(activitySection);
            });
        } else {
            activitiesContainer.innerHTML = '<p class="text-center">No hay acciones preventivas para esta versión.</p>';
        }

        // Actualizar las opciones del select en los modales
        updateActivitySelects();
    };

    // Función para actualizar los selectores de actividad
    const updateActivitySelects = () => {
        const selectAccion = document.getElementById('actividadRelacionada');
        selectAccion.innerHTML = '<option value="" disabled selected>Seleccione una actividad</option>';
        currentActionsData.forEach((activity, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = activity.activityName;
            selectAccion.appendChild(option);
        });
    };

    // Lógica para cargar los datos iniciales
    if (year && version) {
        ppaVersionTitle.textContent = `${year} ${version}`;
        currentActionsData = ppaActionsData[year] && ppaActionsData[year][version] ? ppaActionsData[year][version] : [];
        renderActions();
    } else {
        activitiesContainer.innerHTML = '<p class="text-center">No se ha seleccionado una versión de plan preventivo.</p>';
    }

    // Evento para el botón de Descargar PDF
    btnDescargarPDF.addEventListener('click', () => {
        // Instanciar jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let y = 20;

        // Título del documento
        doc.setFontSize(18);
        doc.text(`Plan Preventivo Anual ${year}`, 105, y, null, null, "center");
        y += 10;
        doc.setFontSize(16);
        doc.text(version, 105, y, null, null, "center");
        y += 10;
        doc.setFontSize(14);
        doc.text('Acciones Preventivas', 105, y, null, null, "center");
        y += 20;

        doc.setFontSize(12);

        // Iterar sobre las actividades y acciones
        currentActionsData.forEach(activity => {
            doc.text(`Trabajos en ${activity.activityName}`, 20, y);
            y += 10;
            doc.setFontSize(10);
            activity.actions.forEach(action => {
                doc.text(`- ${action.titulo}: Estado: ${action.estado}`, 25, y);
                y += 5;
                const splitDescription = doc.splitTextToSize(action.descripcion, 160);
                doc.text(splitDescription, 30, y);
                y += (splitDescription.length * 5) + 5;
            });
            y += 10;
        });

        doc.save(`PPA-${year}-${version}.pdf`);
    });

    // Lógica para añadir una nueva actividad
    document.getElementById('btnGuardarActividad').addEventListener('click', () => {
        const nombreActividad = document.getElementById('nombreActividad').value.trim();
        if (nombreActividad) {
            currentActionsData.push({ activityName: nombreActividad, actions: [] });
            renderActions();
            const modal = bootstrap.Modal.getInstance(document.getElementById('nuevaActividadModal'));
            modal.hide();
            formNuevaActividad.reset();
        }
    });

    // Lógica para añadir una nueva acción
    document.getElementById('btnGuardarAccion').addEventListener('click', () => {
        const activityIndex = document.getElementById('actividadRelacionada').value;
        const titulo = document.getElementById('tituloAccion').value.trim();
        const descripcion = document.getElementById('descripcionAccion').value.trim();
        const estado = document.getElementById('estadoAccion').value;

        if (activityIndex && titulo && descripcion && estado) {
            currentActionsData[activityIndex].actions.push({ titulo, descripcion, estado });
            renderActions();
            const modal = bootstrap.Modal.getInstance(document.getElementById('nuevaAccionModal'));
            modal.hide();
            formNuevaAccion.reset();
        }
    });

    // Lógica para modificar una acción (delegación de eventos)
    activitiesContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('btn-modificar')) {
            event.preventDefault();
            const card = target.closest('.action-card');
            const activityIndex = card.dataset.activityIndex;
            const actionIndex = card.dataset.actionIndex;
            const action = currentActionsData[activityIndex].actions[actionIndex];

            document.getElementById('edit-activity-name').value = currentActionsData[activityIndex].activityName;
            document.getElementById('edit-action-index').value = actionIndex;
            document.getElementById('edit-tituloAccion').value = action.titulo;
            document.getElementById('edit-descripcionAccion').value = action.descripcion;
            document.getElementById('edit-estadoAccion').value = action.estado;

            const modal = new bootstrap.Modal(document.getElementById('modificarAccionModal'));
            modal.show();
        }
    });

    document.getElementById('btnGuardarModificacion').addEventListener('click', () => {
        const activityName = document.getElementById('edit-activity-name').value;
        const actionIndex = document.getElementById('edit-action-index').value;

        // Encontrar el índice de la actividad por nombre
        const activityIndex = currentActionsData.findIndex(act => act.activityName === activityName);

        if (activityIndex !== -1 && actionIndex) {
            const newTitulo = document.getElementById('edit-tituloAccion').value.trim();
            const newDescripcion = document.getElementById('edit-descripcionAccion').value.trim();
            const newEstado = document.getElementById('edit-estadoAccion').value;

            if (newTitulo && newDescripcion && newEstado) {
                currentActionsData[activityIndex].actions[actionIndex] = {
                    titulo: newTitulo,
                    descripcion: newDescripcion,
                    estado: newEstado
                };
                renderActions();
                const modal = bootstrap.Modal.getInstance(document.getElementById('modificarAccionModal'));
                modal.hide();
            }
        }
    });

    // Lógica para eliminar una acción (delegación de eventos)
    activitiesContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('btn-eliminar')) {
            event.preventDefault();
            if (confirm('¿Estás seguro de que quieres eliminar esta acción?')) {
                const card = target.closest('.action-card');
                const activityIndex = card.dataset.activityIndex;
                const actionIndex = card.dataset.actionIndex;

                currentActionsData[activityIndex].actions.splice(actionIndex, 1);
                renderActions();
            }
        }
    });

    const newSolution = urlParams.get('newSolution');
    if (newSolution) {
        const solutionData = JSON.parse(decodeURIComponent(newSolution));
        if (solutionData.tipo === 'accion') {
            // Encontrar la actividad a la que pertenece la nueva acción
            const targetActivity = currentActionsData.find(act => act.activityName === solutionData.tipoDeActividad);
            if (targetActivity) {
                targetActivity.actions.push({
                    titulo: solutionData.titulo,
                    descripcion: solutionData.descripcion,
                    estado: 'induccion'
                });
            } else {
                // Si la actividad no existe, la creamos y añadimos la acción
                currentActionsData.push({
                    activityName: solutionData.tipoDeActividad,
                    actions: [{
                        titulo: solutionData.titulo,
                        descripcion: solutionData.descripcion,
                        estado: 'induccion'
                    }]
                });
            }
        } else if (solutionData.tipo === 'actividad') {
            currentActionsData.push({
                activityName: solutionData.titulo,
                actions: []
            });
        }
        renderActions();
    }

    // Redireccionar al banco de soluciones con los parámetros
    document.getElementById('linkBancoSoluciones').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `BancoSolucion.html?year=${year}&version=${version}`;
    });
});