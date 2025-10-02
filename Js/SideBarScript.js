
document.addEventListener('DOMContentLoaded', () => {
    const toggleSidebarBtn = document.getElementById('Button_Togle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const body = document.body;

    // Función para abrir/cerrar sidebar en móvil
    function toggleSidebar() {
        body.classList.toggle('sidebar-active');
    }

    // Event listener para el botón de toggle
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', toggleSidebar);
    }

    // Event listener para el overlay (cerrar sidebar al hacer clic fuera)
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // Selecciona todos los enlaces de navegación principales (incluyendo los que activan dropdowns)
    const mainNavLinks = document.querySelectorAll('.sidebar > .nav > .nav-link');
    // Selecciona todos los sub-enlaces dentro de los dropdowns
    const subNavLinks = document.querySelectorAll('.sidebar .collapse .nav-link');


    let currentActiveLink = null;

    // Al cargar la página, encontrar el enlace activo inicial (si lo hay)
    const initialActiveLink = document.querySelector('.sidebar .nav-link.active');
    if (initialActiveLink) {
        currentActiveLink = initialActiveLink;
        // Si el enlace activo inicial es un sub-enlace dentro de un collapse,
        // asegúrate de que el padre del collapse también tenga la clase 'active'
        // y que el collapse esté abierto.
        const parentCollapse = initialActiveLink.closest('.collapse');
        if (parentCollapse) {
            const parentNavLink = document.querySelector(`[data-bs-target="#${parentCollapse.id}"]`);
            if (parentNavLink) {
                parentNavLink.classList.add('active');
                // Asegúrate de que el collapse esté abierto al inicio si un sub-enlace está activo
                const bsCollapse = new bootstrap.Collapse(parentCollapse, { toggle: false });
                bsCollapse.show();
            }
        }
    }



    // Función para remover la clase 'active' de todos los enlaces
    function removeActiveClass() {
        mainNavLinks.forEach(link => link.classList.remove('active'));
        subNavLinks.forEach(link => link.classList.remove('active'));
    }

    // --- Manejo de enlaces de nivel superior (excluyendo los que abren dropdowns para el click inicial) ---
    mainNavLinks.forEach(link => {
        // Ignoramos los enlaces que son toggles de collapse para la lógica de click inicial
        // porque su 'active' se gestionará con los eventos de Bootstrap.
        if (!link.hasAttribute('data-bs-toggle')) {
            link.addEventListener('click', (event) => {
                // event.preventDefault(); // Descomentar si no quieres que el enlace navegue

                removeActiveClass(); // Quita 'active' de todos los enlaces
                link.classList.add('active'); // Añade 'active' al enlace clickeado
                currentActiveLink = link; // Actualiza el enlace activo global
            });
        }

        // Manejo del hover para todos los mainNavLinks
        link.addEventListener('mouseover', () => {
            if (currentActiveLink && currentActiveLink !== link) {
                currentActiveLink.classList.remove('active'); // Desactiva el enlace actual
            }
        });

        link.addEventListener('mouseout', () => {
            if (currentActiveLink && currentActiveLink !== link) {
                currentActiveLink.classList.add('active'); // Reactiva el enlace actual
            }
        });
    });


    // --- Manejo de eventos de colapso de Bootstrap para los enlaces padres ---
    // Seleccionar todos los elementos collapse
    const collapses = document.querySelectorAll('.sidebar .collapse');

    collapses.forEach(collapseEl => {
        collapseEl.addEventListener('show.bs.collapse', () => {
            const parentNavLink = document.querySelector(`[data-bs-target="#${collapseEl.id}"]`);
            if (parentNavLink) {
                // removeActiveClass(); // Podrías quitar la clase activa de todos aquí si lo prefieres
                // Pero el efecto de hover ya lo hará, así que solo activamos el padre
                parentNavLink.classList.add('active');
            }
        });

        collapseEl.addEventListener('hide.bs.collapse', () => {
            // Cuando un collapse se va a ocultar, encuentra su nav-link padre
            const parentNavLink = document.querySelector(`[data-bs-target="#${collapseEl.id}"]`);
            if (parentNavLink) {
                // Verifica si algún sub-enlace dentro de este collapse está activo
                const activeSubLink = collapseEl.querySelector('.nav-link.active');
                if (!activeSubLink) { // Si no hay ningún sub-enlace activo, quita la clase del padre
                    parentNavLink.classList.remove('active');
                }
                // Si hay un sub-enlace activo, el padre mantendrá la clase 'active'
                // Esto es una decisión de diseño, puedes ajustarlo si quieres que el padre siempre se desactive.
            }
        });
    });
});


document.addEventListener('DOMContentLoaded', function () {

    const openModalBtn = document.getElementById('IA-Button');

    openModalBtn.addEventListener('click', () => {
        const modalElement = document.getElementById('subscriptionModal');
        const myModal = new bootstrap.Modal(modalElement);
        myModal.show();
    });
});


