const Endpoint_URL = "http://localHost:8080/ActionsMaintenance"


export async function getAllMaintenances() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllMaintenances`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de mantenimientos.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllMaintenances:", error);
        throw error;
    }
}

export async function MaintenanceByMemberId(ID_Member) {
 try {
        const response = await fetch(`${Endpoint_URL}/MaintenanceByMemberId/${ID_Member}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Mantenimiento no encontrado.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getMaintenanceById:", error);
        throw error;
    }
}

export async function getAllPageMaintenances(page = 0, size = 10) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllPageMaintenances?page=${page}&size=${size}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de mantenimientos paginada.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllPageMaintenances:", error);
        throw error;
    }
}

export async function getMaintenanceById(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/MaintenanceByID/${id}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Mantenimiento no encontrado.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getMaintenanceById:", error);
        throw error;
    }
}

export async function getAllTypesMaintenance() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllTypeMaintenance`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener los tipos de mantenimiento.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllTypesMaintenance:", error);
        throw error;
    }
}

export async function createNewMaintenance(data_Maintenance) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertNewMaintenance`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Maintenance)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en createNewMaintenance:", error);
        throw error;
    }
}

export async function updateMaintenance(id_Maintenance, data_Maintenance) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateMaintenance/${id_Maintenance}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Maintenance)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en updateMaintenance:", error);
        throw error;
    }
}

export async function deleteMaintenance(id_Maintenance) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteMaintenance/${id_Maintenance}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en deleteMaintenance:", error);
        throw error;
    }
}