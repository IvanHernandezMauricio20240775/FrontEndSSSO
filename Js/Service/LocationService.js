// LocationService.js
const Endpoint_URL = "http://localhost:8080/ActionsLocation";

/* Utilidad para intentar parsear JSON siempre */
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


export async function getAllLocation() {
  try {
    const response = await fetch(`${Endpoint_URL}/GetAllLocations`, {
      method: "GET",
      credentials: "include",
      headers: { "Accept": "application/json" }
    });
    const json = await toJsonSafe(response);
    // Este endpoint devuelve LISTA cruda de LocationDTO
    if (!response.ok) {
      throw new Error((json && json.message) || "Error al obtener la lista de Ubicaciones.");
    }
    return json; // List<LocationDTO>
  } catch (error) {
    console.error("Error en getAllLocation:", error);
    throw error;
  }
}

export async function getLocationByZone(ID_Zone) {
  try {
    const response = await fetch(
      `${Endpoint_URL}/GetLocationsByZone/${encodeURIComponent(ID_Zone)}`,
      { method: "GET", credentials: "include", headers: { "Accept": "application/json" } }
    );
    const json = await toJsonSafe(response);
    // Este endpoint devuelve ApiResponse<List<LocationDTO>>
    assertApiOk(response, json, "Ubicaciones no encontradas.");
    return json; // { success, message, data }
  } catch (error) {
    console.error("Error en getLocationByZone:", error);
    throw error;
  }
}

export async function InsertNewLocation(data_Location) {
  try {
    const response = await fetch(`${Endpoint_URL}/InsertLocation`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data_Location)
    });
    const json = await toJsonSafe(response);
    // ApiResponse<LocationDTO>
    assertApiOk(response, json, "Error al registrar la Ubicación.");
    return json;
  } catch (error) {
    console.error("Error en InsertNewLocation:", error);
    throw error;
  }
}

export async function UpdatedLocation(id_Location, data_Location) {
  // Para update tu backend no obliga id_location en el body.
  try {
    const response = await fetch(`${Endpoint_URL}/UpdateLocation/${encodeURIComponent(id_Location)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data_Location)
    });
    const json = await toJsonSafe(response);
    // ApiResponse<LocationDTO>
    assertApiOk(response, json, "Error al actualizar la Ubicación.");
    return json;
  } catch (error) {
    console.error("Error en UpdatedLocation:", error);
    throw error;
  }
}

export async function DeleteLocation(id_Location) {
  try {
    const response = await fetch(`${Endpoint_URL}/DeleteLocation/${encodeURIComponent(id_Location)}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Accept": "application/json" }
    });
    const json = await toJsonSafe(response);
    // ApiResponse<Void>
    assertApiOk(response, json, "Error al eliminar la Ubicación.");
    return json;
  } catch (error) {
    console.error("Error en DeleteLocation:", error);
    throw error;
  }
}

/* =========================
   Categorías de Ubicación
   ========================= */

export async function GetAllLocationCategory() {
  try {
    const response = await fetch(`${Endpoint_URL}/GetAllCategoryLocation`, {
      method: "GET",
      credentials: "include",
      headers: { "Accept": "application/json" }
    });
    const json = await toJsonSafe(response);
    // Este endpoint devuelve LISTA cruda de CategoryLocationDTO
    if (!response.ok) {
      throw new Error((json && json.message) || "Error al obtener la lista de Categorías de Ubicaciones.");
    }
    return json; // List<CategoryLocationDTO>
  } catch (error) {
    console.error("Error en GetAllLocationCategory:", error);
    throw error;
  }
}

export async function InsertCategoryLocation(data_Category) {
  try {
    const response = await fetch(`${Endpoint_URL}/InsertCategoryLocation`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data_Category)
    });
    const json = await toJsonSafe(response);
    // ApiResponse<CategoryLocationDTO>
    assertApiOk(response, json, "Error al registrar la Categoría de Ubicación.");
    return json;
  } catch (error) {
    console.error("Error en InsertCategoryLocation:", error);
    throw error;
  }
}

export async function UpdatedCategoryLocation(ID_Category_Location, data_Category) {
  try {
    const response = await fetch(`${Endpoint_URL}/UpdateCategoryLocation/${encodeURIComponent(ID_Category_Location)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data_Category)
    });
    const json = await toJsonSafe(response);
    // ApiResponse<CategoryLocationDTO>
    assertApiOk(response, json, "Error al actualizar la Categoría de Ubicación.");
    return json;
  } catch (error) {
    console.error("Error en UpdatedCategoryLocation:", error);
    throw error;
  }
}

export async function DeleteCategoryLocation(ID_Category_Location) {
  try {
    const response = await fetch(`${Endpoint_URL}/DeleteCategoryLocation/${encodeURIComponent(ID_Category_Location)}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Accept": "application/json" }
    });
    const json = await toJsonSafe(response);
    // ApiResponse<Void>
    assertApiOk(response, json, "Error al eliminar la Categoría de Ubicación.");
    return json;
  } catch (error) {
    console.error("Error en DeleteCategoryLocation:", error);
    throw error;
  }
}


export async function UploadImage(file, { folder, type } = {}) {
  if (!(file instanceof File || file instanceof Blob)) {
    throw new Error("El parámetro 'file' debe ser un File o Blob.");
  }
  if (!folder && !type) {
    // Para ubicaciones puedes usar cualquiera; te dejo type por defecto
    type = "location";
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
