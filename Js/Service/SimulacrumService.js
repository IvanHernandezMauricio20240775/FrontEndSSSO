const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsSimulacrum";

// ===================== Helpers =====================
async function handleResponse(response) {
  let payload = null;
  try { payload = await response.json(); } catch (e) { /* sin body JSON */ }

  if (!response.ok) {
    const msg =
      payload?.message ||
      payload?.error ||
      (Array.isArray(payload?.errors) ? payload.errors.join(", ") : null) ||
      response.statusText ||
      `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return payload;
}

// ===================== Simulacros =====================

async function toJsonSafe(response) {
  try { return await response.json(); } catch { return null; }
}
/* Lanza con mensaje si viene ApiResponse con success=false o HTTP !ok */
function assertApiOk(response, json, fallbackMsg) {
  if (!response.ok) {
    const msg = (json && json.message) || `${fallbackMsg} (HTTP ${response.status})`;
    throw new Error(msg);
  }
  // Si el backend devuelve ApiResponse
  if (json && typeof json === "object" && "success" in json) {
    if (!json.success) {
      throw new Error(json.message || fallbackMsg);
    }
  }
}

export async function UploadImage(file, { folder, type } = {}) {
  if (!(file instanceof File || file instanceof Blob)) {
    throw new Error("El parámetro 'file' debe ser un File o Blob.");
  }
  if (!folder && !type) {
    // Para ubicaciones puedes usar cualquiera; te dejo type por defecto
    type = "simulacrum";
  }

  const fd = new FormData();
  fd.append("file", file);
  if (folder) fd.append("folder", folder);
  if (type) fd.append("type", type);

  const response = await fetch(`${Endpoint_URL}/UploadImage`, {
    method: "POST",
    credentials: "include",
    body: fd
  });

  const json = await toJsonSafe(response);
  // ApiResponse<String> → data = URL
  assertApiOk(response, json, "Error al subir la imagen.");
  return json; // { success, message, data: 'https://...' }
}

export async function GetAllSimulacrums() {
  const res = await fetch(`${Endpoint_URL}/GetAllSimulacrums`, {
    method: "GET",
    credentials: "include"
  });
  return handleResponse(res); // devuelve List<SimulacrumDTO>
}

export async function GetSimulacrumById(id) {
  const res = await fetch(`${Endpoint_URL}/GetSimulacrumById/${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "include"
  });
  return handleResponse(res); // ApiResponse<SimulacrumDTO>
}

export async function GetAllLSimulacrumPage(page = 0, size = 10) {
  const res = await fetch(`${Endpoint_URL}/GetAllLSimulacrumPage?page=${page}&size=${size}`, {
    method: "GET",
    credentials: "include"
  });
  return handleResponse(res); // Page<SimulacrumDTO>
}

// Alias opcional, por si prefieres este nombre:
export const GetSimulacrumPage = GetAllLSimulacrumPage;

export async function InsertSimulacrum(data_simulacrum) {
  const res = await fetch(`${Endpoint_URL}/InsertSimulacrum`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data_simulacrum)
  });
  return handleResponse(res); // ApiResponse<SimulacrumDTO>
}

export async function UpdateSimulacrum(id_Simulacrum, data_simulacrum) {
  const res = await fetch(`${Endpoint_URL}/UpdateSimulacrum/${encodeURIComponent(id_Simulacrum)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data_simulacrum)
  });
  return handleResponse(res); // ApiResponse<SimulacrumDTO>
}

export async function DeleteSimulacrum(id_Simulacrum) {
  const res = await fetch(`${Endpoint_URL}/DeleteSimulacrum/${encodeURIComponent(id_Simulacrum)}`, {
    method: "DELETE",
    credentials: "include"
  });
  return handleResponse(res); // ApiResponse<Void>
}

// Actualizar SOLO el estado (usa query param ?status=)
export async function UpdateSimulacrumStatus(id_Simulacrum, status /* 'PENDIENTE'|'COMPLETADO'|'VENCIDO' */) {
  const url = `${Endpoint_URL}/UpdateSimulacrumStatus/${encodeURIComponent(id_Simulacrum)}?status=${encodeURIComponent(status)}`;
  const res = await fetch(url, {
    method: "PUT",
    credentials: "include"
  });
  return handleResponse(res); // ApiResponse<SimulacrumDTO>
}

// ===================== Tipos =====================

export async function GetTypesSimulacrum() {
  const res = await fetch(`${Endpoint_URL}/GetAllTypesSimulacrum`, {
    method: "GET",
    credentials: "include"
  });
  return handleResponse(res); // List<TypeSimulacrumDTO>
}

// ===================== Reportes =====================

export async function GetAllReportsSimulacrum() {
  const res = await fetch(`${Endpoint_URL}/GetAllReportsSimulacrum`, {
    method: "GET",
    credentials: "include"
  });
  return handleResponse(res); // List<ReportSimulacrumDTO>
}

export async function GetReportBySimulacrum(id_Simulacrum) {
  const res = await fetch(`${Endpoint_URL}/GetReportBySimulacrum/${id_Simulacrum}`, {
    method: "GET",
    credentials: "include"
  });
  return handleResponse(res); 
}

export async function GetReportSimulacrumById(id_ReportSimulacrum) {
  const res = await fetch(`${Endpoint_URL}/GetReportSimulacrumById/${id_ReportSimulacrum}`, {
    method: "GET",
    credentials: "include"
  });
  return handleResponse(res); // ApiResponse<ReportSimulacrumDTO>
}

export async function InsertReportSimulacrum(data_report) {
  const res = await fetch(`${Endpoint_URL}/InsertReportSimulacrum`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data_report)
  });
  return handleResponse(res); // ApiResponse<ReportSimulacrumDTO>
}

export async function UpdateReportSimulacrum(id_ReportSimulacrum, data_report) {
  const res = await fetch(`${Endpoint_URL}/UpdateReportSimulacrum/${encodeURIComponent(id_ReportSimulacrum)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data_report)
  });
  return handleResponse(res); // ApiResponse<ReportSimulacrumDTO>
}

export async function DeleteReportSimulacrum(id_ReportSimulacrum) {
  const res = await fetch(`${Endpoint_URL}/DeleteReportSimulacrum/${encodeURIComponent(id_ReportSimulacrum)}`, {
    method: "DELETE",
    credentials: "include"
  });
  return handleResponse(res); // ApiResponse<Void>
}