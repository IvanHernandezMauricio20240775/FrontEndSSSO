import {
    getInspectionsInfo,
    getInfoCards,
    getIncidentsByRiskType
} from "../Service/DashBoardService.js"

export function setSaludoPorHora(selector = '#Message', when = new Date()) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;

    const hour = when.getHours();

    // Defaults
    let texto = '¡Bienvenido!';
    let color = 'rgb(60, 60, 60)';

    if (hour >= 5 && hour < 12) {
        // Mañana
        texto = '¡BUENOS DIAS!';
        color = 'rgb(232, 168, 120)';   // naranja suave
    } else if (hour >= 12 && hour < 19) {
        // Tarde
        texto = '¡BUENAS TARDES!';
        color = 'rgb(120, 148, 168)';   // gris-azulado suave
    } else {
        // Noche (19–4)
        texto = '¡BUENAS NOCHES!';
        color = 'rgb(156, 132, 196)';   // morado suave
    }

    el.textContent = texto;
    el.style.color = color;
}

const numberEl = document.getElementById('number');
const target = 65;   // número al que quieres llegar
let counter = 0;

const intervalId = setInterval(() => {
    if (!numberEl) {               // por si el elemento no existe
        clearInterval(intervalId);
        return;
    }

    counter += 1;
    numberEl.textContent = String(counter);

    if (counter >= target) {       // usa >= por seguridad
        clearInterval(intervalId);   // <-- ahora sí con el id
    }
}, 25);


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

/* ================= Utilidades ================= */
function toISODateOnly(d) {
    if (!d) return undefined;
    if (typeof d === "string") return d;
    const dt = d instanceof Date ? d : new Date(d);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function elKpi(selectorId, fallbackIndex) {
    // Intenta por id; si no, por orden de aparición
    const byId = document.getElementById(selectorId);
    if (byId) return byId;
    const all = document.querySelectorAll(".kpi-card .kpi-number");
    return all[fallbackIndex] || null;
}

function animateCounter(el, target, duration = 700) {
    if (!el) return;
    const start = 0;
    const startTs = performance.now();
    function step(ts) {
        const p = Math.min((ts - startTs) / duration, 1);
        const val = Math.round(start + (target - start) * p);
        el.textContent = val;
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

/* =============== KPIs: Cards superiores =============== */
async function loadCardsKpis() {
    try {
        const res = await getInfoCards(); // {status,message,data:{accidentsToday,simulacrumsPending,correctiveActionsPending}}
        const d = res?.data || {};
        const elAcc = elKpi("kpiAccidentsToday", 0);
        const elSim = elKpi("kpiSimulacrosPending", 1);
        const elCor = elKpi("kpiCorrectivePending", 2);

        animateCounter(elAcc, Number(d.accidentsToday || 0));
        animateCounter(elSim, Number(d.simulacrumsPending || 0));
        animateCounter(elCor, Number(d.correctiveActionsPending || 0));
    } catch (e) {
        console.error("Error al cargar KPIs:", e);
    }
}

/* =============== Chart.js: Donut Inspecciones =============== */
let _chartInspecciones = null;

async function crearGraficoInspecciones() {
    try {
        const ctxEl = document.getElementById("inspeccionesChart");
        if (!ctxEl) return;

        const res = await getInspectionsInfo(); // {status,message,data:{completed,pending,overdue}}
        const { completed = 0, pending = 0, overdue = 0 } = res?.data || {};
        const dataset = [completed, pending, overdue];

        if (_chartInspecciones && typeof _chartInspecciones.destroy === "function") {
            _chartInspecciones.destroy();
        }
        _chartInspecciones = new Chart(ctxEl.getContext("2d"), {
            type: "doughnut",
            data: {
                labels: ["Completadas", "Pendientes", "Atrasadas"],
                datasets: [
                    {
                        data: dataset,
                        backgroundColor: ["#28a745", "#A9DFBF", "#D5F5E3"],
                        hoverOffset: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" },
                    title: {
                        display: true,
                        text: "Estado de Inspecciones",
                        font: { size: 16 }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Error creando gráfico de Inspecciones:", e);
    }
}

/* =============== Highcharts: Barras Incidentes por Tipo de Peligro =============== */
function destroyHighchartsByContainerId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    // Guarda instancia en el propio contenedor para destrucción limpia
    if (el._hcChart && el._hcChart.destroy) {
        el._hcChart.destroy();
    }
}

async function crearGraficoIncidentesPeligro({ from, to } = {}) {
    try {
        const containerId = "incidentesPeligroChart";
        const el = document.getElementById(containerId);
        if (!el) return;

        const res = await getIncidentsByRiskType({
            from: toISODateOnly(from),
            to: toISODateOnly(to)
        }); // {status,message,data:{categories:[], data:[]}}
        const payload = res?.data || { categories: [], data: [] };

        destroyHighchartsByContainerId(containerId);

        el._hcChart = Highcharts.chart(containerId, {
            chart: { type: "bar", height: 250 },
            title: { text: "Incidentes por Tipo de Peligro" },
            xAxis: {
                categories: payload.categories || [],
                title: { text: null }
            },
            yAxis: {
                min: 0,
                title: { text: "Número de Incidentes", align: "high" },
                labels: { overflow: "justify" }
            },
            tooltip: { valueSuffix: " incidentes" },
            plotOptions: {
                bar: {
                    dataLabels: { enabled: true }
                }
            },
            legend: { enabled: false },
            series: [
                {
                    name: "Incidentes",
                    data: payload.data || [],
                    color: "#229E82"
                }
            ]
        });
    } catch (e) {
        console.error("Error creando gráfico Incidentes por Tipo:", e);
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    setSaludoPorHora('#Message');
    // KPIs
    loadCardsKpis();

    // Gráficos conectados al backend
    crearGraficoInspecciones();
    crearGraficoIncidentesPeligro();

    // Tus inicializaciones existentes:
    // - calendario
    // - sismos
    dibujarGrafico();
});

