const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsAssignInspection"


export async function getAllAssignInspection() {
    try {
        const response = await fetch(`${Endpoint_URL}/AllInspections`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Zonas.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllAssignInspection:", error);
        throw error;
    }
}

export async function getAssignInspectionsByNit(Nit_Employee) {
    try {
        const response = await fetch(`${Endpoint_URL}/InspectionsBy/${Nit_Employee}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Zonas.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAssignInspectionsByNit:", error);
        throw error;
    }
}

export async function getAssignsImplementAndTypeByInspection(ID_Inspection) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetInspectionsAssign/${ID_Inspection}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Zonas.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAssignsImplementAndTypeByInspection:", error);
        throw error;
    }
}


export async function getAssignPendingInspection(Nit_Employee) {
    try {
        const response = await fetch(`${Endpoint_URL}/MyPendingInspection/${Nit_Employee}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Zonas.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAssignPendingInspection:", error);
        throw error;
    }
}


export async function AssignInspection(data_Assign) {
    try {
        const response = await fetch(`${Endpoint_URL}/AssignInspection`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Assign)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en AssignInspection:", error);
        throw error;
    }
}

export async function UpdateAssignInspection(id_Assign, data_Assign) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateInspection/${id_Assign}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Assign)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdateAssignInspection:", error);
        throw error;
    }
}

//Metodos de Details
export async function RegisterDetailExtinguisher(data_DetailEXT) {
    try {
        const response = await fetch(`${Endpoint_URL}/extinguishers/details`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_DetailEXT)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en AssignInspection:", error);
        throw error;
    }
}

export async function UpdateDetailExtinguisher(id_Detail, data_DetailEXT) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateExtinguishersDetails/${id_Detail}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_DetailEXT)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdateAssignInspection:", error);
        throw error;
    }
}


export async function RegisterDetailSmokeDetector(data_DetailSMKDT) {
    try {
        const response = await fetch(`${Endpoint_URL}/detectorsDetails`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_DetailSMKDT)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en AssignInspection:", error);
        throw error;
    }
}

export async function UpdateDetailSmokeDetector(id_Detail, data_DetailSMKDT) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateDetectorsDetails/${id_Detail}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_DetailSMKDT)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdateAssignInspection:", error);
        throw error;
    }
}



export async function RegisterDetailLocation(data_Location) {
    try {
        const response = await fetch(`${Endpoint_URL}/locationsDetails`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Location)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en RegisterDetailLocation:", error);
        throw error;
    }
}

export async function UpdateDetailLocation(id_Detail, data_Location) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateLocationsDetails/${id_Detail}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Location)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdateDetailLocation:", error);
        throw error;
    }
}


