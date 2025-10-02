const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsProtocol"
// ===================== PROTOCOLS =====================

export async function GetAllListProtocol() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllProtocols`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) throw new Error("Error al obtener la lista de protocolos.");
        // Lista cruda (no ApiResponse)
        return await response.json();
    } catch (error) {
        console.error("Error en GetAllListProtocol:", error);
        throw error;
    }
}

export async function GetProtocolById(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetProtocolById/${id}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) throw new Error("Protocolo no encontrado.");
        // ApiResponse<ProtocolDTO>
        return await response.json();
    } catch (error) {
        console.error("Error en GetProtocolById:", error);
        throw error;
    }
}

export async function GetProtocolsByCategory(idCategoryProtocol) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetProtocolsByCategory/${idCategoryProtocol}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) throw new Error("Error al obtener protocolos por categoría.");
        // ApiResponse<List<ProtocolDTO>>
        return await response.json();
    } catch (error) {
        console.error("Error en GetProtocolsByCategory:", error);
        throw error;
    }
}

export async function UploadImage(file, { folder, type } = {}) {
    if (!(file instanceof File || file instanceof Blob)) {
        throw new Error("El parámetro 'file' debe ser un File o Blob.");
    }
    if (!folder && !type) {
        throw new Error("Debes indicar 'folder' (p.ej. 'ProtocolCategory') o 'type' (p.ej. 'protocolcategory').");
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

    const json = await response.json().catch(() => null);

    if (!response.ok || !json || json.success === false) {
        const msg = (json && json.message) || `Error al subir imagen (HTTP ${response.status})`;
        throw new Error(msg);
    }
    return json;
}

export async function InsertProtocol(data_Protocol) {
    // IMPORTANTE: el backend espera dt_created desde el JSON (formato yyyy-MM-dd).
    try {
        const response = await fetch(`${Endpoint_URL}/InsertProtocol`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Protocol)
        });
        // ApiResponse<ProtocolDTO>
        return await response.json();
    } catch (error) {
        console.error("Error en InsertProtocol:", error);
        throw error;
    }
}

export async function UpdateProtocol(ID_Protocol, data_Protocol) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateProtocol/${ID_Protocol}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Protocol)
        });
        // ApiResponse<ProtocolDTO>
        return await response.json();
    } catch (error) {
        console.error("Error en UpdateProtocol:", error);
        throw error;
    }
}

export async function DeleteProtocol(ID_Protocol) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteProtocol/${ID_Protocol}`, {
            method: "DELETE",
            credentials: "include"
        });
        // ApiResponse<Void>
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteProtocol:", error);
        throw error;
    }
}

// ===================== CATEGORIES =====================

export async function GetAllListCategoryProtocol() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllCategories`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) throw new Error("Error al obtener la lista de categorías.");
        // Lista cruda (no ApiResponse)
        return await response.json();
    } catch (error) {
        console.error("Error en GetAllListCategoryProtocol:", error);
        throw error;
    }
}

export async function GetCategoryById(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetCategoryById/${id}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) throw new Error("Categoría no encontrada.");
        // ApiResponse<CategoryProtocolDTO>
        return await response.json();
    } catch (error) {
        console.error("Error en GetCategoryById:", error);
        throw error;
    }
}

// Alias por si en tu código viejo llamas a este nombre:
export async function GetCategoryProtocolById(id) {
    return GetCategoryById(id);
}

export async function getAllPageCategoryProtocol(page = 0, size = 10) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetCategoryPage?page=${page}&size=${size}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) throw new Error("Error al obtener categorías paginadas.");
        // Page<CategoryProtocolDTO> (Spring Page JSON)
        return await response.json();
    } catch (error) {
        console.error("Error en getAllPageCategoryProtocol():", error);
        throw error;
    }
}

export async function InsertCategoryProtocol(data_Category) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertCategory`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Category)
        });
        // ApiResponse<CategoryProtocolDTO>
        return await response.json();
    } catch (error) {
        console.error("Error en InsertCategoryProtocol:", error);
        throw error;
    }
}

export async function UpdatedCategoryProtocol(ID_CategoryProtocol, data_Category) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateCategory/${ID_CategoryProtocol}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Category)
        });
        // ApiResponse<CategoryProtocolDTO>
        return await response.json();
    } catch (error) {
        console.error("Error en UpdatedCategoryProtocol:", error);
        throw error;
    }
}

export async function DeleteCategoryProtocol(ID_CategoryProtocol) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteCategory/${ID_CategoryProtocol}`, {
            method: "DELETE",
            credentials: "include"
        });
        // ApiResponse<Void>
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteCategoryProtocol:", error);
        throw error;
    }
}