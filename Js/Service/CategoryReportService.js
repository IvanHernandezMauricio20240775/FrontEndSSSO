const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsPotencialRisk";

/* ==================== TYPES RISK ==================== */
export async function getAllTypeReports() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllTypesRisk`, {
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Tipos de Riesgo.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllTypeReports:", error);
        throw error;
    }
}

export async function getAllReportsByNit(Nit_Employee) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetReportsByEmployeeNit/${Nit_Employee}`,{
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo obtener el Reporte por NIT.`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllReportsByNit:", error);
        throw error;
    }
}

/* ==================== REPORTS CRUD ==================== */
export async function getAllReports() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllReports`, {
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo obtener la lista de Reportes.`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllReports:", error);
        throw error;
    }
}

export async function getReportById(idReport) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetReportById/${idReport}`, {
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo obtener el Reporte por ID.`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getReportById:", error);
        throw error;
    }
}

export async function insertReport(dataReport) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertReport`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(dataReport),
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo insertar el reporte.`);
        }
        
        // A diferencia de los GET, los POST a veces no devuelven un cuerpo JSON en caso de éxito.
        // Se añade un check para evitar el error 'Unexpected end of JSON input'.
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            // Devuelve un objeto de éxito si no hay JSON en la respuesta.
            return { status: true, message: "Operación exitosa." };
        }

    } catch (error) {
        console.error("Error en insertReport:", error);
        throw error;
    }
}

export async function updateReport(idReport, dataReport) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateReport/${idReport}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(dataReport),
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo actualizar el reporte.`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            return { status: true, message: "Operación exitosa." };
        }
    } catch (error) {
        console.error("Error en updateReport:", error);
        throw error;
    }
}

export async function deleteReport(idReport) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteReport/${idReport}`, {
            method: "DELETE",
            credentials: "include",
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo eliminar el reporte.`);
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            return { status: true, message: "Operación exitosa." };
        }
    } catch (error) {
        console.error("Error en deleteReport:", error);
        throw error;
    }
}