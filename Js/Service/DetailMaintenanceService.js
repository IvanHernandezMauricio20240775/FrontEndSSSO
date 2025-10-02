const API_URL = "http://localhost:8080/DetailMaitanenceActions";

export async function getAllDetailMaintenance() {
    const res = await fetch(`${API_URL}/GetAllDetails`);
    return res.json();
}

export async function getDetailMaintenanceById(id) {
    const res = await fetch(`${API_URL}/GetDetailByID/${id}`);
    return res.json();
}

export async function createDetailMaintenance(detail) {
    const res = await fetch(`${API_URL}/InsertDetailMaitanence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detail)
    });
    return res.json();
}

export async function updateDetailMaintenance(id, detail) {
    const res = await fetch(`${API_URL}/UpdateDetail/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detail)
    });
    return res.json();
}

export async function deleteDetailMaintenance(id) {
    const res = await fetch(`${API_URL}/DeleteDetail/${id}`, {
        method: "DELETE"
    });
    return res.json();
}