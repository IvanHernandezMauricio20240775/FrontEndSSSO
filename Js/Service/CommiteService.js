const Endpoint_URL = "http://localHost:8080/ActionCommittee"

export async function GetAllListMemberCommite() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllListMembers`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Miembros del Commite.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetAllListMemberCommite:", error);
        throw error;
    }
}

export async function getPageMembers(page = 0, size = 10) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetMembersView?page=${page}&size=${size}`, {
            method: "GET",
            credentials: "include"
        });
        // ¡Esta es la clave! Verifica si la respuesta es exitosa.
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Miembros paginadas.');
        }

        return await response.json();
    } catch (error) {
        console.error("Error en getPageMembers():", error);
        throw error;
    }
}

export async function getAllPosition() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllPosition`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Posiciones.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllPosition:", error);
        throw error;
    }
}


export async function insertMembersToCommite(members) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertMultipleCommitteMembers`, {
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
        console.error('Error al insertar miembros al Commite:', error);
        throw new Error('Error al añadir miembros a al Commite.');
    }
}
export async function UpdatedRolMember(ID_Member, data_member) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateCommitteMember/${ID_Member}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_member)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdatedRolMember:", error);
        throw error;
    }
}


export async function DeleteMember(ID_Member) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteCommitteMember/${ID_Member}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteMember:", error);
        throw error;
    }
}