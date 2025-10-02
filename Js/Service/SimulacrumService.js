const Endpoint_URL = "http://localHost:8080/ActionsSimulacrum"


export async function GetAllSimulacrums() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllSimulacrums`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Simulacros.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetAllSimulacrums:", error);
        throw error;
    }
}

export async function GetSimulacrumById(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetSimulacrumById/${id}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Simulacro no encontrado.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getExtinguisherById:", error);
        throw error;
    }
}

export async function GetAllLSimulacrumPage(page = 0, size = 10) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllLSimulacrumPage?page=${page}&size=${size}`, {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error('Error al obtener la lista de Simulacros paginadas.');
        }

        return await response.json();
    } catch (error) {
        console.error("Error en getPageExtinguisher():", error);
        throw error;
    }
}

export async function InsertSimulacrum(data_simulacrum) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertSimulacrum`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data_simulacrum)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en InsertSimulacrum:", error);
        throw error;
    }
}

export async function UpdateSimulacrum(id_Simulacrum, data_simulacrum) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateSimulacrum/${id_Simulacrum}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_simulacrum)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdateSimulacrum:", error);
        throw error;
    }
}

export async function DeleteSimulacrum(id_Simulacrum) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteSimulacrum/${id_Simulacrum}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteSimulacrum:", error);
        throw error;
    }
}