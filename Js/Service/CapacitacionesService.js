const Endpoint_URL = "http://localHost:8080/ActionsTraining"


export async function GetAllTraining() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllListTraining`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Capacitaciones.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetAllTraining:", error);
        throw error;
    }
}

export async function GetAllBrigadesTraining() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllBrigadeTrainings`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Brigadas Capacitadas.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en GetAllTraining:", error);
        throw error;
    }
}


export async function getTrainingByID(id) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetTrainingById/${id}`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Capacitacion no encontrada.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getTrainingByID:", error);
        throw error;
    }
}



export async function ProgramNewTraining(data_Training) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertTraining`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Training)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en ProgramNewTraining:", error);
        throw error;
    }
}



export async function UpdatedTraining(ID_Training, data_Training) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateTraining/${ID_Training}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Training)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdatedTraining:", error);
        throw error;
    }
}


export async function DeleteTraining(ID_Training) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteTraining/${ID_Training}`, {
            method: "DELETE"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteTraining:", error);
        throw error;
    }
}
