const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/EmployeeActions"

async function toJsonSafe(response) {
  try { return await response.json(); } catch { return null; }
}

function assertApiOk(response, json, fallbackMsg) {
  if (!response.ok) {
    const msg = (json && json.message) || `${fallbackMsg} (HTTP ${response.status})`;
    throw new Error(msg);
  }
  // Si el backend devuelve ApiResponse
  if (json && typeof json === "object" && "success" in json) {
    if (!json.success) {
      throw new Error(json.message || fallbackMsg);
    }
  }
}

export async function getPageEmployee(page = 0, size = 10) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllPagesEmployee?page=${page}&size=${size}`, {
            credentials: "include"
        });
        // ¡Esta es la clave! Verifica si la respuesta es exitosa.
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Empleados paginadas.');
        }

        return await response.json(); 
    } catch (error) {
        console.error("Error en getPageEmployee():", error);
        throw error;
    }
}

export async function UploadImage(file, { folder, type } = {}) {
  if (!(file instanceof File || file instanceof Blob)) {
    throw new Error("El parámetro 'file' debe ser un File o Blob.");
  }
  if (!folder && !type) {
    // Para ubicaciones puedes usar cualquiera; te dejo type por defecto
    type = "employee";
  }

  const fd = new FormData();
  fd.append("file", file);
  if (folder) fd.append("folder", folder);
  if (type) fd.append("type", type);

  const response = await fetch(`${Endpoint_URL}/UploadImage`, {
    method: "POST",
    credentials: "include",
    body: fd
  });

  const json = await toJsonSafe(response);
  // ApiResponse<String> → data = URL
  assertApiOk(response, json, "Error al subir la imagen.");
  return json; // { success, message, data: 'https://...' }
}


export async function getALlEmployees() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllEmployee`,{
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Ubicaciones.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllZone:", error);
        throw error;
    }
}

export async function GetALlRolForUser() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllRol`,{
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Roles.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetALlRolForUser:", error);
        throw error;
    }
}

export async function RegisterNewEmployeeAndUser(data_Employee) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertEmployeeAndUser`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Employee)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en RegisterNewEmployeeAndUser:", error);
        throw error;
    }
}

export async function UpdateEmployeeAndUser(nit_employee, data_Employee) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateEmployeeAndUser/${nit_employee}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Employee)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdateEmployeeAndUser:", error);
        throw error;
    }
}

export async function DeleteEmployeeAndUser(nit_employee) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteEmployeeAndUser/${nit_employee}`, {
            method: "DELETE",
            credentials:"include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteEmployeeAndUser:", error);
        throw error;
    }
}