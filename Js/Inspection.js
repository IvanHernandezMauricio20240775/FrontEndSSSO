const calendarDaysEl = document.getElementById('calendar-days');
    const monthYearDisplayEl = document.getElementById('month-year-display');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');

    let currentMonth = new Date().getMonth(); // 0-11
    let currentYear = new Date().getFullYear();
    let selectedDate = null; // Para selección de fecha única
    let selectedRangeStart = null;
    let selectedRangeEnd = null;

    function renderCalendar() {
        calendarDaysEl.innerHTML = ''; // Limpiar días anteriores

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const numDaysInMonth = lastDayOfMonth.getDate();
        const firstWeekday = firstDayOfMonth.getDay(); // 0 (Domingo) - 6 (Sábado)

        // Actualizar el título del mes y año
        monthYearDisplayEl.textContent = new Date(currentYear, currentMonth).toLocaleString('es-ES', { month: 'long', year: 'numeric' });

        // Días del mes anterior (para rellenar)
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
        for (let i = firstWeekday; i > 0; i--) {
            const dayNum = daysInPrevMonth - i + 1;
            const dayEl = document.createElement('div');
            dayEl.classList.add('py-2', 'text-gray-300');
            dayEl.textContent = dayNum;
            calendarDaysEl.appendChild(dayEl);
        }

        // Días del mes actual
        for (let i = 1; i <= numDaysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.classList.add( 'px-1', 'flex', 'items-center', 'justify-center', 'cursor-pointer'); // Añadir cursor-pointer

            const spanEl = document.createElement('span');
            spanEl.textContent = i;
            spanEl.classList.add('flex', 'items-center', 'justify-center', 'size-8', 'font-medium'); // Base para todos los días

            const date = new Date(currentYear, currentMonth, i);

            // Aplicar clases para día seleccionado o rango
            if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
                spanEl.classList.add('bg-yellow-400', 'text-white', 'rounded-full', 'font-bold');
            } else if (selectedRangeStart && selectedRangeEnd && date >= selectedRangeStart && date <= selectedRangeEnd) {
                 spanEl.classList.remove('size-6', 'text-xs'); // Quitar para rango
                 spanEl.classList.add('bg-yellow-200', 'text-yellow-800', 'rounded-lg', 'w-full', 'h-6','text-xs' );
            } else {
                 // Estilo por defecto para días no seleccionados o en rango
                 spanEl.classList.add('rounded-full'); // Mantener la forma circular para los no seleccionados
            }

            dayEl.appendChild(spanEl);
            calendarDaysEl.appendChild(dayEl);

            // Manejar clics para selección
            dayEl.addEventListener('click', () => {
                // Lógica de selección de rango (como en tu imagen)
                if (!selectedRangeStart || (selectedRangeStart && selectedRangeEnd)) {
                    // Primer clic o si ya hay un rango, iniciar un nuevo rango
                    selectedRangeStart = date;
                    selectedRangeEnd = null;
                } else if (date < selectedRangeStart) {
                    // Si el segundo clic es antes del primero, reajustar
                    selectedRangeEnd = selectedRangeStart;
                    selectedRangeStart = date;
                } else {
                    // Segundo clic, completar el rango
                    selectedRangeEnd = date;
                }
                renderCalendar(); // Volver a renderizar para aplicar los nuevos estilos
            });
        }

        // Días del mes siguiente (para rellenar)
        const totalDaysRendered = firstWeekday + numDaysInMonth;
        const remainingCells = 35 - totalDaysRendered; // 5 semanas * 7 días/semana = 35 celdas
        for (let i = 1; i <= remainingCells; i++) {
            const dayEl = document.createElement('div');
            dayEl.classList.add('py-1', 'text-gray-300');
            dayEl.textContent = i;
            calendarDaysEl.appendChild(dayEl);
        }
    }

    // Navegación de meses
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    renderCalendar();

    function createGaugeChart() {
    const data = {
        labels: ['Cumplido', 'Pendiente'],
        datasets: [{
            data: [85, 15], // Ejemplo: 85% cumplimiento
            backgroundColor: ['#209F84', '#e0e0e0'],
            borderWidth: 0,
            circumference: 180,
            rotation: -90,
            cutout: '80%'
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true },
                title: {
                    display: true,
                    text: 'Cumplimiento de Inspecciones',
                    font: { size: 10 }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: chart => {
                const { width, height } = chart;
                const ctx = chart.ctx;
                ctx.restore();
                const fontSize = (height / 114).toFixed(2);
                ctx.font = fontSize + "em sans-serif";
                ctx.textBaseline = "middle";
                const text = "85%";
                const textX = Math.round((width - ctx.measureText(text).width) / 2);
                const textY = height / 1.5;
                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        }]
    };

    new Chart(document.getElementById('gaugeChart'), config);
}

    function createbarChart() {
    const ctx = document.getElementById('barChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Extintores', 'Detectores', 'Alarmas', 'General'],
            datasets: [{
                label: 'Inspecciones realizadas',
                data: [12, 9, 15, 4], // Datos de ejemplo
                backgroundColor: ['#0E7F7D', '#209F84', '#43B29D', '#76C8B5'],
                borderRadius: 6,
                barThickness: 40
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Inspecciones por Categoría',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Cantidad' }
                },
                x: {
                    title: { display: true, text: 'Categorías' }
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', createGaugeChart);
document.addEventListener('DOMContentLoaded', createbarChart);


document.addEventListener('DOMContentLoaded', () => {

    const allOptionsButton = document.getElementById('AllOptions');
    const InspectionPendingButton = document.getElementById('InspectionPending');
    const CompleteInspectionButton = document.getElementById('CompleteInspection');

    // Agrupa estos botones en un array para facilitar la iteración
    const optionButtons = [allOptionsButton, InspectionPendingButton, CompleteInspectionButton];
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


