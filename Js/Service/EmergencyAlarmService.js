const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsEmergencyAlarm"

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
    type = "emergencyalarm";
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

export async function getAllEmergencyAlarm() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllEmergencyAlarm`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Alarmas de Emergencia.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetAllEmergencyAlarm:", error);
        throw error;
    }
}


export async function getEmergencyAlarmById(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetEmergencyAlarmByID/${id}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('ALarma no encontrada.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getEmergencyAlarmById:", error);
        throw error;
    }
}

export async function getPageEmergencyAlarm(page = 0, size = 10) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllPageEmergencyAlarm?page=${page}&size=${size}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Extintores paginadas.');
        }

        return await response.json(); 
    } catch (error) {
        console.error("Error en getPageEmergencyAlarm():", error);
        throw error;
    }
}

export async function InsertNewEmergencyAlarm(data_EmergencyAlarm) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertEmergencyAlarm`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_EmergencyAlarm)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en InsertNewZone:", error);
        throw error;
    }
}

export async function UpdatedEmergencyAlarm(ID_EmergencyAlarm, data_EmergencyAlarm) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateEmergencyAlarm/${ID_EmergencyAlarm}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_EmergencyAlarm)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdatedExtinguisher:", error);
        throw error;
    }
}

export async function DeleteEmergencyAlarm(ID_EmergencyAlarm) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteEmergencyAlarm/${ID_EmergencyAlarm}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteExtinguisher:", error);
        throw error;
    }
}