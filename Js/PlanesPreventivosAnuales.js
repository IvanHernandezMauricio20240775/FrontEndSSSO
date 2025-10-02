document.addEventListener('DOMContentLoaded', () => {
    // JSON de los planes preventivos anuales
    const ppaData = [
        {
            year: 2025
        },
        {
            year: 2024
        },
        {
            year: 2023
        },
        {
            year: 2022
        }
    ];

    const ppaContainer = document.getElementById('ppa-panels-container');

    ppaData.forEach(ppa => {
        const panel = document.createElement('div');
        panel.classList.add('panel', 'd-flex', 'align-items-center');
        panel.innerHTML = `
                    <i class="fas fa-folder panel-folder-icon"></i>
                    <span class="fs-5">PPA-${ppa.year}</span>
                `;

        // Agregar el evento de click para redirigir
        panel.addEventListener('click', () => {
            window.location.href = `PPA-Versions.html?year=${ppa.year}`;
        });

        ppaContainer.appendChild(panel);
    });
});