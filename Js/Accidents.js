const Api_Accidents = "https://retoolapi.dev/NhE9a3/Accidents_TB";

async function GetAccidents() {
    const respuesta = await fetch(Api_Accidents);

    const Data_Accidents = await respuesta.json();

    ShowAllAccidents(Data_Accidents);

}

function ShowAllAccidents(AllData) {
    const table = document.querySelector("#table tbody");

    table.innerHTML = "";

    AllData.forEach(Accident => {
        table.innerHTML += `<tr>
          <td>${Accident.id}</td>
          <td>${Accident.Location}</td>
          <td>${Accident.Date}</td>
          <td>${Accident.Severity}</td>
          <td>${Accident.event}</td>
          <td>
           <button> Editar </button>
           <button> Eliminar </button>
         </td>
        </tr>
        `;
    });
}

function createBarChart() {
    const ctx = document.getElementById('myBarChart').getContext('2d');
    if (!ctx) {
        console.error("No se encontró el elemento canvas con el ID 'myDoughnutChart'.");
        return;
    }

    // Si ya existe una instancia de Chart en este canvas, destrúyela para evitar errores al redibujar
    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }

    const myBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
            datasets: [{
                label: 'Porcentaje de ACcidentes',
                data: [12, 19, 3, 5, 2, 3., 0, 0, 0, 0, 0, 0],
                backgroundColor: [ // Colores de fondo de las barras
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                    'rgba(14, 127, 125, 0.7)',
                ],
                borderColor: [
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                    'rgba(32, 162, 160, 1)',
                ],
                borderWidth: 1 // Ancho del borde de las barras
            }]
        },
        options: {
            responsive: true, // Hace que el gráfico sea responsivo al tamaño del contenedor
            maintainAspectRatio: false, // Permite que el gráfico no mantenga su relación de aspecto original
            scales: {
                y: {
                    beginAtZero: true, // El eje Y comienza en cero
                    title: {
                        display: true,
                        text: 'Accidentes' // Etiqueta del eje Y
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mes' // Etiqueta del eje X
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Acidentes por Mes', // Título principal del gráfico
                    font: {
                        size: 18
                    }
                },
                legend: {
                    display: true, // Muestra la leyenda (la etiqueta "Ventas Mensuales")
                    position: 'top' // Posición de la leyenda
                }
            }
        }
    })
}



function createDoughnutChart() {
    const ctx = document.getElementById('myDoughnutChart').getContext('2d');

    if (!ctx) {
        console.error("No se encontró el elemento canvas con el ID 'myDoughnutChart'.");
        return;
    }

    // Si ya existe una instancia de Chart en este canvas, destrúyela para evitar errores al redibujar
    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }


    const myDoughnutChart = new Chart(ctx, {
        type: 'doughnut', // Tipo de gráfico: 'doughnut'
        data: {
            labels: ['Condición', 'Acción'], // Etiquetas para los segmentos
            datasets: [{
                label: 'Estado de la Tarea', // Etiqueta para el conjunto de datos
                data: [12, 19], // Valores numéricos para cada segmento
                backgroundColor: [ // Colores de fondo para los segmentos
                    'rgba(14, 127, 125, 0.7)', // Rojo suave para 'Condición'
                    'rgba(32, 162, 160, 0.7)', // Azul suave para 'Acción'
                ],
                borderColor: [ // Colores del borde para los segmentos
                    'rgba(14, 127, 125, 1)', // Rojo más intenso
                    'rgba(32, 162, 160, 1)', // Azul más intenso
                ],
                borderWidth: 1 // Ancho del borde
            }]
        },
        options: {
            responsive: true, // Hace que el gráfico se adapte al tamaño de su contenedor
            maintainAspectRatio: false, // Permite que el tamaño del gráfico sea controlado por CSS
            plugins: {
                legend: {
                    position: 'top', // Posición de la leyenda (arriba)
                    labels: {
                        font: {
                            family: 'Inter', // Fuente para las etiquetas de la leyenda
                            size: 14
                        },
                        color: '#555'
                    }
                },
                title: {
                    display: true, // Muestra el título del gráfico
                    text: 'Accidentes Inseguros por', // Texto del título
                    font: {
                        size: 20, // Tamaño de la fuente del título
                        family: 'Inter', // Fuente para el título
                        weight: 'bold'
                    },
                    color: '#2c3e50'
                },
                tooltip: {
                    // Configuración de los tooltips (información al pasar el ratón)
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed + ' unidades'; // Añade "unidades" al valor
                            }
                            return label;
                        }
                    },
                    bodyFont: {
                        family: 'Inter'
                    },
                    titleFont: {
                        family: 'Inter',
                        weight: 'bold'
                    },
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderRadius: 8,
                    padding: 12
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', createDoughnutChart);
document.addEventListener('DOMContentLoaded', createBarChart);




document.addEventListener('DOMContentLoaded', () => {

    const allOptionsButton = document.getElementById('AllOptions');
    const actionOptionsButton = document.getElementById('ActionOptions');
    const conditionOptionsButton = document.getElementById('ConditionOptions');

    // Agrupa estos botones en un array para facilitar la iteración
    const optionButtons = [allOptionsButton, actionOptionsButton, conditionOptionsButton];
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

function calculateAvarageAccidents(Unsafe_Condition,
    Unsafe_Action) {

    const TotalAccidentsMonth = Unsafe_Action + Unsafe_Condition;
    if (TotalAccidentsMonth == 0) {
        return "Sin accidentes registrados"
    }
    const TotalAvarageAction = (Unsafe_Action / TotalAccidentsMonth) * 100;
    const TotalAvarageCondition = (Unsafe_Condition / TotalAccidentsMonth) * 100;
    console.log(TotalAvarageAction, TotalAvarageCondition);

}

document.addEventListener('DOMContentLoaded', GetAccidents);