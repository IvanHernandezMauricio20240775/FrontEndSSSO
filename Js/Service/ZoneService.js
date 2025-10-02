const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsZone"

async function toJsonSafe(response) {
  try { return await response.json(); } catch { return null; }
}
/* Lanza con mensaje si viene ApiResponse con success=false o HTTP !ok */
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

export async function getAllZone() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllZone`,{
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Zonas.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllZone:", error);
        throw error;
    }
}

export async function getPageZone(page = 0, size = 10) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllPagesZone?page=${page}&size=${size}`, {
            credentials: "include"
        });
        // ¡Esta es la clave! Verifica si la respuesta es exitosa.
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Zonas paginadas.');
        }

        return await response.json(); 
    } catch (error) {
        console.error("Error en getPageZone():", error);
        throw error;
    }
}

export async function UploadImage(file, { folder, type } = {}) {
  if (!(file instanceof File || file instanceof Blob)) {
    throw new Error("El parámetro 'file' debe ser un File o Blob.");
  }
  if (!folder && !type) {
    // Para ubicaciones puedes usar cualquiera; te dejo type por defecto
    type = "zone";
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


export async function InsertNewZone(data_Zone) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertZone`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Zone)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en InsertNewZone:", error);
        throw error;
    }
}

export async function UpdatedZone(id_Zone, data_Zone) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateZone/${id_Zone}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Zone)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdatedDepartment:", error);
        throw error;
    }
}

export async function DeleteZone(id_Zone) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteZone/${id_Zone}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteZone:", error);
        throw error;
    }
}