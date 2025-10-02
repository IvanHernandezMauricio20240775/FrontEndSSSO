const Endpoint_URL = "http://localhost:8080/ActionsDepartment";

export async function getAllDepartment() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllListDepartment`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de departamentos.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllDepartment:", error);
        throw error;
    }
}

export async function InsertNewDepartment(data_Department) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertDepartment`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Department)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Ocurrió un error inesperado al insertar.");
        }
        return await response.json();
    } catch (error) {
        console.error("Error en InsertNewDepartment:", error);
        throw error;
    }
}

export async function UpdatedDepartment(id_Department, data_Department) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateDepartment/${id_Department}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Department)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Ocurrió un error inesperado al actualizar.");
        }
        return await response.json();
    } catch (error) {
        console.error("Error en UpdatedDepartment:", error);
        throw error;
    }
}

export async function DeleteDepartment(id_Department) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteDepartment/${id_Department}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al eliminar el departamento.");
        }
        
        // La API de borrado no devuelve un cuerpo, así que no necesitas parsear JSON.
        // Simplemente retornas true o un objeto vacío para indicar éxito.
        return true; 
    } catch (error) {
        console.error("Error en DeleteDepartment:", error);
        throw error;
    }
}