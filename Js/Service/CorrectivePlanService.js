const Endpoint_URL = "http://localHost:8080/ActionsPlanCorrective"

export async function GetAllPlans() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllPlans`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Zonas.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetAllPlans:", error);
        throw error;
    }
}

export async function GetAllPagePlans(page = 0, size = 10) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllPagePlans?page=${page}&size=${size}`, {
            credentials: "include"
        });
        // ¡Esta es la clave! Verifica si la respuesta es exitosa.
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Planes paginadas.');
        }

        return await response.json(); 
    } catch (error) {
        console.error("Error en GetAllPagePlans():", error);
        throw error;
    }
}

export async function GetAllPagePlansByDepartment(id_department, page = 0, size = 10) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllPagePlansByDepartment?id_department=${id_department}&page=${page}&size=${size}`, {
            credentials: "include"
        });
        // ¡Esta es la clave! Verifica si la respuesta es exitosa.
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Planes paginadas por departamento.');
        }

        return await response.json(); 
    } catch (error) {
        console.error("Error en GetAllPagePlans():", error);
        throw error;
    }
}


export async function GetPlansByStatus() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetPlansByStatus`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Planes por estado.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetPlansByStatus:", error);
        throw error;
    }
}

export async function GetPlanByID(ID_PlanCorrective) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetPlanByID/${ID_PlanCorrective}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo obtener el Plan por ID.`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetPlanByID:", error);
        throw error;
    }
}

export async function GetPlansByDepartment(ID_Department) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetPlansByDepartment/${ID_Department}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo obtener el Plan por Departamento.`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetPlansByDepartment:", error);
        throw error;
    }
}

export async function GetActionsByPlan(ID_PlanCorrective) {
    try {
        const response = await fetch(`${Endpoint_URL}/Actions/ByPlan/${ID_PlanCorrective}`,{
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo obtener las acciones por plan .`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetActionsByPlan:", error);
        throw error;
    }
}




export async function InsertPlan(data_Plan) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertPlan`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Plan)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en InsertPlan:", error);
        throw error;
    }
}

export async function ActionsAdd(ID_PlanCorrective ,data_Plan) {
    try {
        const response = await fetch(`${Endpoint_URL}/Actions/Add/${ID_PlanCorrective}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Plan)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en InsertPlan:", error);
        throw error;
    }
}


export async function UpdatePlan(ID_PlanCorrective, data_Plan) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdatePlan/${ID_PlanCorrective}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Plan)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdatedDepartment:", error);
        throw error;
    }
}

export async function ActionsUpdate(ID_ActionCorrective, data_Plan) {
    try {
        const response = await fetch(`${Endpoint_URL}/Actions/Update/${ID_ActionCorrective}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Plan)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en ActionsUpdate:", error);
        throw error;
    }
}

export async function ChangeStatus(ID_PlanCorrective, data_Plan) {
    try {
        const response = await fetch(`${Endpoint_URL}/ChangeStatus/${ID_PlanCorrective}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Plan)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en ChangeStatus:", error);
        throw error;
    }
}

export async function Verify(ID_PlanCorrective, data_Plan) {
    try {
        const response = await fetch(`${Endpoint_URL}/Verify/${ID_PlanCorrective}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Plan)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en Verify:", error);
        throw error;
    }
}


export async function ActionsProgress(ID_ActionCorrective, data_Actions) {
    try {
        const response = await fetch(`${Endpoint_URL}/Actions/Progress/${ID_ActionCorrective}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Actions)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en ActionsProgress:", error);
        throw error;
    }
}


export async function ActionsDelete(ID_ActionCorrective) {
    try {
        const response = await fetch(`${Endpoint_URL}/Actions/Delete/${ID_ActionCorrective}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en ActionsDelete:", error);
        throw error;
    }
}

export async function DeletePlan(ID_PlanCorrective) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeletePlan/${ID_PlanCorrective}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeletePlan:", error);
        throw error;
    }
}

