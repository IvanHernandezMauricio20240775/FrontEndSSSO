document.addEventListener('DOMContentLoaded', () => {
    const solutionsData = [
        {
            id: 'SOLN-001',
            tipo: 'accion',
            titulo: 'Redes de seguridad anticaídas',
            descripcion: 'En pisos donde se realizan trabajos en altura de forma regular, se usan las redes de seguridad.',
            tipoDeActividad: 'Trabajos en altura'
        },
        {
            id: 'SOLN-002',
            tipo: 'actividad',
            titulo: 'Trabajos en Caliente',
            descripcion: 'Se agrupan las acciones preventivas para cualquier trabajo que involucre la generación de calor, chispas o llamas.',
        },
        {
            id: 'SOLN-003',
            tipo: 'accion',
            titulo: 'Sistemas de anclaje portátiles y temporales',
            descripcion: 'Para trabajos puntuales, existen anclajes móviles que se sujetan a vigas, columnas o mediante un contrapeso.',
            tipoDeActividad: 'Trabajos en altura'
        },
        // Puedes añadir más soluciones aquí
    ];

    const solutionsContainer = document.getElementById('solutionsContainer');
    const filterSelect = document.getElementById('filterSelect');
    const searchBox = document.getElementById('searchBox');
    const btnClose = document.getElementById('btnClose');

    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');
    const version = urlParams.get('version');

    // Función para renderizar las tarjetas
    const renderSolutions = (solutions) => {
        solutionsContainer.innerHTML = '';
        solutions.forEach(solution => {
            const card = document.createElement('div');
            card.classList.add('solution-card');
            card.dataset.id = solution.id;
            card.dataset.tipo = solution.tipo;

            card.innerHTML = `
                        <div class="solution-card-body">
                            <span class="text-muted small">${solution.id}</span>
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="mt-2 mb-1">${solution.titulo}</h6>
                                <i class="fas fa-plus-square" style="color: #008080;"></i>
                            </div>
                            <p class="small text-muted">${solution.descripcion}</p>
                            ${solution.tipoDeActividad ? `<p class="small">**Tipo de Actividad:** ${solution.tipoDeActividad}</p>` : ''}
                        </div>
                        <button class="solution-card-add-btn" data-solution='${JSON.stringify(solution)}'>
                            <i class="fas fa-plus"></i>
                        </button>
                    `;
            solutionsContainer.appendChild(card);
        });
    };

    // Función para filtrar y buscar
    const filterAndSearch = () => {
        const filterValue = filterSelect.value;
        const searchValue = searchBox.value.toLowerCase();

        let filteredSolutions = solutionsData.filter(solution => {
            const matchesFilter = filterValue === 'all' || solution.tipo === filterValue;
            const matchesSearch = solution.id.toLowerCase().includes(searchValue) ||
                solution.titulo.toLowerCase().includes(searchValue) ||
                solution.descripcion.toLowerCase().includes(searchValue) ||
                (solution.tipoDeActividad && solution.tipoDeActividad.toLowerCase().includes(searchValue));
            return matchesFilter && matchesSearch;
        });

        renderSolutions(filteredSolutions);
    };

    // Eventos para el select y el buscador
    filterSelect.addEventListener('change', filterAndSearch);
    searchBox.addEventListener('input', filterAndSearch);

    // Evento para el botón de salida
    btnClose.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `ppa-actions.html?year=${year}&version=${version}`;
    });

    // Evento para agregar soluciones a la versión PPA
    solutionsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.solution-card-add-btn')) {
            const button = e.target.closest('.solution-card-add-btn');
            const solution = JSON.parse(button.dataset.solution);

            const newSolutionParam = encodeURIComponent(JSON.stringify(solution));
            window.location.href = `ppa-actions.html?year=${year}&version=${version}&newSolution=${newSolutionParam}`;
        }
    });

    // Renderizar las soluciones iniciales
    renderSolutions(solutionsData);
});