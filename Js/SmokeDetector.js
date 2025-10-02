const Api_SmokeDetector = "https://retoolapi.dev/FLs2CL/SmokeDetector";

async function GetDetector() {
    const respuesta = await fetch(Api_SmokeDetector);

    const Data_Accidents = await respuesta.json();

    ShowAllSmokeDetector(Data_Accidents);

}

function ShowAllSmokeDetector(AllData) {
    const table = document.querySelector("#table tbody");

    table.innerHTML = "";

    AllData.forEach(Detector => {
        table.innerHTML += `<tr>
          <td>${Detector.id}</td>
          <td>${Detector.Type_Detector}</td>
          <td>${Detector.DateExpiration}</td>
          <td>${Detector. Energy_Source}</td>
          <td>${Detector.Location}</td>
          <td>${Detector.Installation_Date}</td>
          <td>
           <button> Editar </button>
           <button> Eliminar </button>
         </td>
        </tr>
        `;
    });
}


document.addEventListener('DOMContentLoaded', GetDetector);


document.addEventListener('DOMContentLoaded', () => {

    const allOptionsButton = document.getElementById('AllOptions');
    const DetectorDisabledButton = document.getElementById('DetectorDisabled');
    const DetectorWorkingButton = document.getElementById('DetectorWorking');

    // Agrupa estos botones en un array para facilitar la iteración
    const optionButtons = [allOptionsButton, DetectorDisabledButton, DetectorWorkingButton];
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
