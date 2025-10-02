let number = document.getElementById('number');
let counter = 0;

setInterval(() => {
    if (counter == 65) {
        clearInterval
    }
    else {
        counter += 1;
        number.innerHTML = `${counter}`
    }
}, 25)


async function obtenerSismos() {
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startDate}&endtime=${endDate}&minlatitude=13.0&maxlatitude=14.5&minlongitude=-90.2&maxlongitude=-87.6&orderby=time`;

    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }
        const datos = await respuesta.json();

        // Filtrar solo los más recientes (hasta 10)
        // Opcional: Si quieres más de 10 y que sean de todo el año, ajusta este slice.
        // Pero para mostrar una tendencia clara, 10-20 puede ser suficiente.
        const sismos = datos.features.slice(0, 15);

        // Extraer fechas y magnitudes
        //Es un método que recorre cada elemento del array sismos y aplica una función a cada uno, creando un nuevo array con los resultados.
        let fechas = sismos.map(sismo =>
            new Date(sismo.properties.time).toLocaleDateString()
        );
        // se crea un nuevo array llamado magnitudes extrayendo la propiedad mag (magnitud) de cada sismo.
        let magnitudes = sismos.map(sismo => sismo.properties.mag);

        // Invertir el orden de los arrays para que el gráfico vaya de más antiguo a más reciente
        fechas = fechas.reverse();
        magnitudes = magnitudes.reverse();

        return { fechas, magnitudes, currentYear };
    } catch (error) {
        console.error("Error al obtener los sismos:", error);
        return { fechas: [], magnitudes: [], currentYear: new Date().getFullYear() };
    }
}

const calendarEl = document.getElementById("calendar");

const calendarBody = document.getElementById("calendarBody");
const monthYear = document.getElementById("monthYear");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

let currentDate = new Date();

const importantDates = [
    "2025-05-01",
    "2025-05-27",
    "2025-06-15"
];

function generateCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date().toISOString().split("T")[0];
    const monthName = date.toLocaleString("default", { month: "long" });

    monthYear.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

    let table = `<table>
                <thead>
                  <tr>
                    <th>Do</th><th>Lu</th><th>Ma</th><th>Mi</th>
                    <th>Ju</th><th>Vi</th><th>Sa</th>
                  </tr>
                </thead>
                <tbody><tr>`;

    let dayCount = 0;

    for (let i = 0; i < firstDay; i++) {
        table += "<td></td>";
        dayCount++;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let classes = "";

        if (fullDate === today) classes += "today ";
        if (importantDates.includes(fullDate)) classes += "important";

        table += `<td class="${classes}">${day}</td>`;
        dayCount++;

        if (dayCount % 7 === 0) {
            table += "</tr><tr>";
        }
    }

    while (dayCount % 7 !== 0) {
        table += "<td></td>";
        dayCount++;
    }

    table += "</tr></tbody></table>";
    calendarBody.innerHTML = table;
}

prevBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generateCalendar(currentDate);
});

nextBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generateCalendar(currentDate);
});

generateCalendar(currentDate);


// La función dibujarGrafico y el resto del código permanecen igual
// ... (tu función dibujarGrafico y el event listener aquí) ...
async function dibujarGrafico() {
    // Aquí recibimos currentYear junto con fechas y magnitudes
    const { fechas, magnitudes, currentYear } = await obtenerSismos();

    // Asegúrate de que tienes un canvas con el ID 'sismoChart' en tu HTML
    const ctx = document.getElementById('sismoChart');
    if (!ctx) {
        console.error("No se encontró el elemento canvas con el ID 'sismoChart'.");
        return;
    }

    // Si ya existe una instancia de Chart en este canvas, destrúyela para evitar errores al redibujar
    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }

    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: fechas,
            datasets: [{
                label: 'Magnitud',
                data: magnitudes,
                borderColor: '#CCF7CA',
                backgroundColor: 'rgba(204, 247, 202, 0.5)',
                tension: 0.3,
                pointRadius: 5,
                pointBackgroundColor: '#20A2A0',
                pointBorderColor: '#fff',
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    // Ahora currentYear es accesible aquí
                    text: `Últimos Sismos Registrados en ${currentYear}`,
                    font: {
                        size: 18
                    },
                    color: '#333'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 7.0,
                    title: {
                        display: true,
                        text: 'Magnitud',
                        color: '#555'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#555'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Fecha del Sismo',
                        color: '#555'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#555'
                    }
                }
            }
        }
    });
}


document.addEventListener('DOMContentLoaded', function () {
    crearGraficoInspecciones();
    crearGraficoIncidentesPeligro();
});

function crearGraficoInspecciones() {
    const ctx = document.getElementById('inspeccionesChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completadas', 'Pendientes', 'Atrasadas'],
            datasets: [{
                data: [75, 15, 10],
                backgroundColor: ['#28a745', '#A9DFBF', '#D5F5E3'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                title: {
                    display: true,
                    text: 'Estado de Inspecciones',
                    font: { size: 16 }
                }
            }
        }
    });
}

function crearGraficoIncidentesPeligro() {
    Highcharts.chart('incidentesPeligroChart', {
        chart: {
            type: 'bar',
            height: 250
        },
        title: {
            text: 'Incidentes por Tipo de Peligro'
        },
        xAxis: {
            categories: ['Químico', 'Eléctrico', 'Mecánico', 'Biológico', 'Ergonómico'],
            title: { text: null }
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Número de Incidentes',
                align: 'high'
            },
            labels: {
                overflow: 'justify'
            }
        },
        tooltip: {
            valueSuffix: ' incidentes'
        },
        plotOptions: {
            bar: {
                dataLabels: {
                    enabled: true
                }
            }
        },
        legend: {
            enabled: false
        },
        series: [{
            name: 'Incidentes',
            data: [15, 8, 12, 5, 10],
            color: '#229E82'
        }]
    });
}

// Iniciar el dibujo del gráfico cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', dibujarGrafico);


// Para actualizar la gráfica periódicamente (opcional)
// setInterval(dibujarGrafico, 3600000); // Actualiza cada hora (3600000 milisegundos)