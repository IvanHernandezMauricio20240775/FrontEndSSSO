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
        dayEl.classList.add('px-1', 'flex', 'items-center', 'justify-center', 'cursor-pointer'); // Añadir cursor-pointer

        const spanEl = document.createElement('span');
        spanEl.textContent = i;
        spanEl.classList.add('flex', 'items-center', 'justify-center', 'size-8', 'font-medium'); // Base para todos los días

        const date = new Date(currentYear, currentMonth, i);

        // Aplicar clases para día seleccionado o rango
        if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
            spanEl.classList.add('bg-yellow-400', 'text-white', 'rounded-full', 'font-bold');
        } else if (selectedRangeStart && selectedRangeEnd && date >= selectedRangeStart && date <= selectedRangeEnd) {
            spanEl.classList.remove('size-6', 'text-xs'); // Quitar para rango
            spanEl.classList.add('bg-yellow-200', 'text-yellow-800', 'rounded-lg', 'w-full', 'h-6', 'text-xs');
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


document.addEventListener('DOMContentLoaded', () => {

    const allOptionsButton = document.getElementById('AllOptions');
    const SimulacrumPending = document.getElementById('SimulacrumPending');
    const CompleteSimulacrum = document.getElementById('CompleteSimulacrum');

    // Agrupa estos botones en un array para facilitar la iteración
    const optionButtons = [allOptionsButton, SimulacrumPending, CompleteSimulacrum];
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

const Api_Simulacrum = "https://retoolapi.dev/aeleGa/TB_Simulacrum";

async function GetAllSimulacrum() {
    const respuesta = await fetch(Api_Simulacrum);

    const Data_Simulacrum = await respuesta.json();

    ShowAllAccidents(Data_Simulacrum);

}

function ShowAllAccidents(AllData) {
    const table = document.querySelector("#table tbody");

    table.innerHTML = "";

    AllData.forEach(Simulacrum => {
        table.innerHTML += `<tr>
          <td>${Simulacrum.id}</td>
          <td>${Simulacrum.Date_Simulacrum}</td>
          <td>${Simulacrum.TimeSimulacrum}</td>
          <td>${Simulacrum.Manager}</td>
          <td>${Simulacrum.State}</td>
          <td>
          <div class="ActionsTB">
           <button class="edit-btn" title="Editar">
             <img src="img/LapizIcon.png" alt="Editar">
           </button>
           <button class="delete-btn" title="Eliminar">
            <img src="img/EliminarIcono.png" alt="Eliminar">
           </button>
          </div>
           
         </td>
        </tr>
        `;
    });
}
document.addEventListener('DOMContentLoaded', GetAllSimulacrum);



