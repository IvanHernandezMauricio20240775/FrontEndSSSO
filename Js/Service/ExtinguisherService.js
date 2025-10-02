const Endpoint_URL = "http://localHost:8080/ActionsExtinguisher"

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

export async function UploadImage(file, { folder, type } = {}) {
  if (!(file instanceof File || file instanceof Blob)) {
    throw new Error("El parámetro 'file' debe ser un File o Blob.");
  }
  if (!folder && !type) {
    // Para ubicaciones puedes usar cualquiera; te dejo type por defecto
    type = "extinguisher";
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


export async function getAllExtinguisher() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllExtinguisher`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Zonas.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllExtinguisher:", error);
        throw error;
    }
}

export async function getExtinguisherById(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetExtinguisherByID/${id}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Extintor no encontrado.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getExtinguisherById:", error);
        throw error;
    }
}


export async function getExtinguishersByLocation(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetExtinguisherByLocation/${id}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Extintores no encontrados.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getExtinguishersByLocation:", error);
        throw error;
    }
}

export async function GetAllPageExtinguisher() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllPageExtinguisher`, {
            method: "GET",
            credentials: "include"
        });
        
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Extintores paginadas.');
        }

        return await response.json(); 
    } catch (error) {
        console.error("Error en GetAllPageExtinguisher():", error);
        throw error;
    }
}

export async function InsertNewExtinguisher(data_Extinguisher) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertExtinguisher`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Extinguisher)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en InsertNewZone:", error);
        throw error;
    }
}

export async function UpdatedExtinguisher(id_Extinguisher, data_Extinguisher) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateExtinguisher/${id_Extinguisher}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Extinguisher)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdatedExtinguisher:", error);
        throw error;
    }
}

export async function DeleteExtinguisher(id_Extinguisher) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteExtinguisher/${id_Extinguisher}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteExtinguisher:", error);
        throw error;
    }
}