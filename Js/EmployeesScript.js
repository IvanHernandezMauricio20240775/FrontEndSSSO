const Api_Employees = "https://retoolapi.dev/Zuy541/Employees";

async function GetEmployees() {
    const respuesta = await fetch(Api_Employees);

    const Data_Employees = await respuesta.json();

    ShowAllEmployees(Data_Employees);
    
}

function ShowAllEmployees(AllData){
    const tableEmployee = document.querySelector("#table tbody");

    tableEmployee.innerHTML = "";

    AllData.forEach(Employee => {
        tableEmployee.innerHTML +=`<tr>
          <td>${tableEmployee.id}</td>
          <td>${tableEmployee.FirstName}</td>
          <td>${tableEmployee.LastName}</td>
          <td>${tableEmployee.BirthDay}</td>
          <td>${tableEmployee.Rol}</td>
          <td>${tableEmployee.state}</td>
          <td>
           <button> Editar </button>
           <button> Eliminar </button>
         </td>
        </tr>
        `;
    });

}

document.addEventListener('DOMContentLoaded', GetEmployees);

