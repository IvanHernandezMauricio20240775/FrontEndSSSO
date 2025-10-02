const Api_BrigadaPA = "https://retoolapi.dev/ZeqP9t/data";

async function GetMembers() {
    const respuesta = await fetch(Api_BrigadaPA);

    const Data_Members = await respuesta.json();

    ShowAllMembers(Data_Members);

}

function ShowAllMembers(AllData) {
    const table = document.querySelector("#table tbody");

    table.innerHTML = "";

    AllData.forEach(Members => {
        table.innerHTML += `<tr>
          <td>${Members.id}</td>
          <td>${Members.Name}</td>
          <td>${Members.Surname}</td>
          <td>${Members.Email}</td>
          <td>${Members.Role}</td>
          <td>
           <button>Editar</button>
                    <button onclick="EliminarPersona(${Members.id})">Eliminar</button>
         </td>
        </tr>
        `;
    });
}

GetMembers();

const openFormBtn = document.getElementById('openFormBtn');
const registerMemberModal = document.getElementById('registerMemberModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const formIframe = document.getElementById('formIframe');
const body = document.body;
const mainContent = document.getElementById('mainContent');

// Función para abrir el modal
openFormBtn.onclick = function () {
    formIframe.src = 'FrmBrigadaPA.html'; // Carga el formulario en el iframe
    registerMemberModal.style.display = 'flex'; // Muestra el modal (usamos flex para centrar)
    body.classList.add('no-scroll'); // Deshabilita el scroll del body
    mainContent.classList.add('disabled-overlay'); // Deshabilita interacciones y oscurece el fondo
}

// Función para cerrar el modal
closeModalBtn.onclick = function () {
    registerMemberModal.style.display = 'none'; // Oculta el modal
    formIframe.src = ''; // Limpia el src del iframe para evitar contenido antiguo
    body.classList.remove('no-scroll'); // Habilita el scroll del body
    mainContent.classList.remove('disabled-overlay'); // Habilita interacciones y quita oscurecimiento
}

// Cerrar el modal si el usuario hace clic fuera del contenido del modal
window.onclick = function (event) {
    if (event.target == registerMemberModal) {
        registerMemberModal.style.display = 'none';
        formIframe.src = '';
        body.classList.remove('no-scroll');
        mainContent.classList.remove('disabled-overlay');
    }
}

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

//Función para borrar registros
async function EliminarPersona(id) {
    const confirmacion = confirm("¿Realmente deseas eliminar el registro?");

    //Validamos si el usuario sí escogió borrar
    if (confirmacion) {
        await fetch(`${Api_BrigadaPA}/${id}`, {
            method: "DELETE"
        });

        //Recargar la tabla después de eliminar
        GetMembers();
    }
}

