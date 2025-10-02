const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsSmokeDetector"

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
    type = "smokedetector";
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

export async function getAllSmokeDetector() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllSmokeDetector`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de de Detectores de Humo.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllSmokeDetector:", error);
        throw error;
    }
}

export async function getPageSmokeDetector(page = 0, size = 10) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllPageSmokeDetector?page=${page}&size=${size}`, {
            method: "GET",
            credentials: "include"
        });
        // ¡Esta es la clave! Verifica si la respuesta es exitosa.
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Detectores de Humo paginadas.');
        }

        return await response.json(); 
    } catch (error) {
        console.error("Error en getPageSmokeDetector():", error);
        throw error;
    }
}

export async function getSmokeDetectorById(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetSmokeDetectorByID/${id}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Detectores no encontrados.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetSmokeDetectorByID:", error);
        throw error;
    }
}

export async function getSmokeDetectorByLocation(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetSmokeDetectorByLocation/${id}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Detectores no encontrados.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getSmokeDetectorByLocation:", error);
        throw error;
    }
}


export async function InsertNewSmokeDetector(data_Detector) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertSmokeDetector`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Detector)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en InsertNewSmokeDetector:", error);
        throw error;
    }
}

export async function UpdateSmokeDetector(id_Detector, data_Detector) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateSmokeDetector/${id_Detector}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Detector)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdateSmokeDetector:", error);
        throw error;
    }
}

export async function DeleteSmokeDetector(id_Detector) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteSmokeDetector/${id_Detector}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteSmokeDetector:", error);
        throw error;
    }
}