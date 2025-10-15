import {
    getALlEmployeesAndUserByEmail
} from "../Service/EmployeeService.js"

import {
    AuthStatus
} from "../Service/AuthService.js"

document.addEventListener("DOMContentLoaded", () => {
    LoadMyInfo()
})

async function LoadMyInfo(){

    const AUTH = await AuthStatus()
    const UserData = AUTH.data;

    if(UserData){
        
        const Employee = await getALlEmployeesAndUserByEmail(UserData.email)
        const DataEmployee = Employee.data;
        if(DataEmployee){
            const nameUser = document.getElementById("NameUser")
            const imgEmployee = document.getElementById("imgUser")

            const email = document.getElementById("EmailUser")
            const BirthDay = document.getElementById("DateUser")
            const nitEmployee = document.getElementById("NitUser")
            const rolUser = document.getElementById("RolUser");
            const commiteRole = document.getElementById("committeRol")

            nameUser.textContent = `${DataEmployee.first_name}  ${DataEmployee.last_name}`
            imgEmployee.src = `${DataEmployee.img_user}`

            email.value = `${DataEmployee.email}`
            BirthDay.value = `${DataEmployee.birth_day}`
            nitEmployee.value = `${DataEmployee.nit_employee}`
            rolUser.value = `${UserData.role}`

            if(UserData.committeeRole){
                commiteRole.value = `${UserData.committeeRole}`
            }else{
                commiteRole.value = 'NO PERETENECE AL COMITE'
            }
        }else{
          Swal.fire({ icon: "error", title: "No se encontro el Token" });
          window.location.replace("index.html");
        }
    }else{
        Swal.fire({ icon: "error", title: "No se encontro el Token" });
        window.location.replace("index.html");
    }
}
