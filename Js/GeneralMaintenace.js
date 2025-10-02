     function crearGraficoMantenimientos() {
            // Datos para el gráfico
            const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const realizadosData = [50, 55, 48, 60, 62, 58, 65, 70, 68, 72, 75, 70]; // Datos de ejemplo
            const pendientesData = [10, 8, 12, 7, 9, 11, 6, 5, 7, 4, 3, 5]; // Datos de ejemplo

            // Obtener el contexto del canvas
            const ctx = document.getElementById('mantenimientosChart');

            // Verificar si el elemento canvas existe y obtener su contexto 2D
            if (ctx) {
                const chartCtx = ctx.getContext('2d');
                // Crear el gráfico de barras
                new Chart(chartCtx, {
                    type: 'bar', // Tipo de gráfico: barras
                    data: {
                        labels: labels, // Etiquetas para el eje X (meses)
                        datasets: [
                            {
                                label: 'Realizados', // Etiqueta para la primera barra
                                data: realizadosData, // Datos para la primera barra
                                backgroundColor: 'rgba(75, 192, 192, 0.6)', // Color de las barras "Realizados"
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1
                            },
                            {
                                label: 'Pendientes', // Etiqueta para la segunda barra
                                data: pendientesData, // Datos para la segunda barra
                                backgroundColor: 'rgba(255, 99, 132, 0.6)', // Color de las barras "Pendientes"
                                borderColor: 'rgba(255, 99, 132, 1)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true, // Hace que el gráfico sea responsivo al tamaño del contenedor
                        maintainAspectRatio: false, // Permite controlar el tamaño del gráfico
                        scales: {
                            y: {
                                beginAtZero: true, // El eje Y comienza en cero
                                title: {
                                    display: true,
                                    text: 'Número de Mantenimientos'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Mes'
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: 'Volumen de Mantenimiento Mensual', // Título de la gráfica
                                font: {
                                    size: 18
                                }
                            }
                        }
                    }
                });
            } else {
                console.error("El elemento canvas con ID 'mantenimientosChart' no fue encontrado.");
            }
        }

          function crearGraficoTiempoResolucion() {
            // Datos para el gráfico
            const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            // Tiempo promedio de resolución en horas
            const tiempoResolucionData = [4.5, 4.2, 4.8, 4.0, 3.8, 3.5, 3.7, 3.2, 3.0, 2.8, 2.5, 2.3]; // Datos de ejemplo

            // Obtener el elemento canvas
            const ctx = document.getElementById('tiempoResolucionChart');

            // Verificar si el elemento canvas existe y obtener su contexto 2D
            if (ctx) {
                const chartCtx = ctx.getContext('2d');
                // Crear el gráfico de líneas
                new Chart(chartCtx, {
                    type: 'line', // Tipo de gráfico: líneas
                    data: {
                        labels: labels, // Etiquetas para el eje X (meses)
                        datasets: [{
                            label: 'Tiempo Promedio de Resolución (horas)', // Etiqueta para la línea
                            data: tiempoResolucionData, // Datos para la línea
                            borderColor: 'rgba(54, 162, 235, 1)', // Color de la línea
                            backgroundColor: 'rgba(54, 162, 235, 0.2)', // Color del área bajo la línea (opcional)
                            fill: true, // Rellenar el área bajo la línea
                            tension: 0.3, // Curvatura de la línea (0 para líneas rectas)
                            pointBackgroundColor: 'rgba(54, 162, 235, 1)', // Color de los puntos
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
                        }]
                    },
                    options: {
                        responsive: true, // Hace que el gráfico sea responsivo
                        maintainAspectRatio: false, // Permite controlar el tamaño
                        scales: {
                            y: {
                                beginAtZero: true, // El eje Y comienza en cero
                                title: {
                                    display: true,
                                    text: 'Tiempo Promedio (horas)'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Mes'
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: 'Tendencia del Tiempo Promedio de Resolución', // Título de la gráfica
                                font: {
                                    size: 18
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed.y !== null) {
                                            label += context.parsed.y + ' horas';
                                        }
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                console.error("El elemento canvas con ID 'tiempoResolucionChart' no fue encontrado.");
            }
        }

        // Ejecutar la función crearGraficoTiempoResolucion cuando el DOM esté completamente cargado
        document.addEventListener('DOMContentLoaded', crearGraficoTiempoResolucion);
        // Ejecutar la función crearGraficoMantenimientos cuando el DOM esté completamente cargado
        document.addEventListener('DOMContentLoaded', crearGraficoMantenimientos);


     document.addEventListener('DOMContentLoaded', () => {

    const allOptionsButton = document.getElementById('AllOptions');
    const PendingMaintenanceButton = document.getElementById('PendingMaintenance');
    const CompleteMaintenanceButton = document.getElementById('CompleteMaintenance');

    // Agrupa estos botones en un array para facilitar la iteración
    const optionButtons = [allOptionsButton, PendingMaintenanceButton, CompleteMaintenanceButton];
    function handleOptionButtonClick(event) {
        optionButtons.forEach(button => {
            if (button) {
                button.classList.remove('selected-option');
            }
        });

        if (event.currentTarget) {
            event.currentTarget.classList.add('selected-option');
        }

        const selectedId = event.currentTarget.id;
        console.log(`Opción seleccionada: ${selectedId}`);

    }

    optionButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', handleOptionButtonClick);
        }
    });

    if (allOptionsButton) {
        allOptionsButton.classList.add('selected-option');
    }
});
