document.addEventListener('DOMContentLoaded', () => {
        // JSON de las versiones de los PPAs
        const ppaVersionsData = {
            '2025': [
                { name: 'ENE-MAR' },
                { name: 'ABRIL-JUL' },
                { name: 'ABRIL-OCT' }
            ],
            '2024': [
                { name: 'ENE-JUN' },
                { name: 'JUL-DIC' }
            ],
            '2023': [
                { name: 'ENE-DIC' }
            ],
            '2022': [
                { name: 'ENE-MAR' },
                { name: 'ABRIL-DIC' }
            ]
        };

        const urlParams = new URLSearchParams(window.location.search);
        const year = urlParams.get('year');

        if (year) {
            document.getElementById('ppa-year').textContent = year;
            const versionsContainer = document.getElementById('ppa-versions-container');
            const versions = ppaVersionsData[year] || [];

            versions.forEach(version => {
                const panel = document.createElement('div');
                panel.classList.add('panel', 'd-flex', 'align-items-center');
                panel.innerHTML = `
                    <i class="fas fa-file-alt panel-file-icon"></i>
                    <span class="fs-5">PPA-${year} ${version.name}</span>
                `;
                
                // Agregar el evento de click para redirigir
                panel.addEventListener('click', () => {
                    window.location.href = `PPA-Actions.html?year=${year}&version=${version.name}`;
                });
                
                versionsContainer.appendChild(panel);
            });
        } else {
            document.getElementById('ppa-versions-container').innerHTML = '<p class="text-center">No se ha seleccionado un plan preventivo.</p>';
        }
    });