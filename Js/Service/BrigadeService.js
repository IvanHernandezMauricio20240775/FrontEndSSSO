const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsBrigade"

export async function getAllBrigades() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllBrigade`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Brigadas.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllBrigades:", error);
        throw error;
    }
}

export async function getBrigadeByID(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetBrigadeByID/${id}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Brigada no encontrada.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetBrigadeByID:", error);
        throw error;
    }
}

export async function InsertNewBrigade(data_Brigade) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertBrigade`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Brigade)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en InsertNewZone:", error);
        throw error;
    }
}

export async function UpdatedBrigade(id_Brigade, data_Brigade) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateBrigade/${id_Brigade}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Brigade)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdatedBrigade:", error);
        throw error;
    }
}

export async function DeleteBrigade(id_Brigade) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteBrigade/${id_Brigade}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteBrigade:", error);
        throw error;
    }
}

export async function getMembersByBrigadeId(idBrigade) {
    try {
        const response = await fetch(`${Endpoint_URL}/BrigadesMemberByID/${idBrigade}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error(`Error en la solicitud: ${response.statusText}`);
        }
        const members = await response.json();
        return members;
    } catch (error) {
        console.error("Error al obtener los miembros de la brigada:", error);
        throw error;
    }
}

export async function getRoles() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetRolBrigade`,{
            method: "GET",
            credentials: "include"
        }); // Asegúrate de que este es el endpoint para roles
        if (!response.ok) {
            throw new Error('Error al obtener la lista de roles.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getRoles:", error);
        throw error;
    }
}

export async function insertMembersToBrigade(brigadeId, members) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertMembers/${brigadeId}`, {
            method: 'POST',
            credentials: "include",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(members)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error en la solicitud: ${response.statusText}. Detalles: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error al insertar miembros en la Brigada:', error);
        throw new Error('Error al añadir miembros a la Brigada.');
    }
}