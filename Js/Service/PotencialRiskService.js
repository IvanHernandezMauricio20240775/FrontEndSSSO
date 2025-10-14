export const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsPotencialRisk";

export async function toJsonSafe(response) {
  try { return await response.json(); } catch { return null; }
}

/* Lanza error si HTTP !ok o ApiResponse.success=false */
export function assertApiOk(response, json, fallbackMsg) {
  if (!response.ok) {
    const msg = (json && (json.message || json.error)) || `${fallbackMsg} (HTTP ${response.status})`;
    throw new Error(msg);
  }
  if (json && typeof json === "object" && "success" in json && !json.success) {
    throw new Error(json.message || fallbackMsg);
  }
}

/* ---------- Cloudinary proxy ---------- */
export async function UploadImage(file, { folder, type } = {}) {
  if (!(file instanceof File || file instanceof Blob)) {
    throw new Error("El parámetro 'file' debe ser un File o Blob.");
  }
  if (!folder && !type) type = "potencial-risk";

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
  assertApiOk(response, json, "Error al subir la imagen.");
  return json; // { success, message, data: 'https://...' }
}

/* ---------- Catálogo ---------- */
export async function GetAllTypesRisk() {
  const res = await fetch(`${Endpoint_URL}/GetAllTypesRisk`, { credentials: "include" });
  const json = await toJsonSafe(res);
  assertApiOk(res, json, "Error al obtener tipos de riesgo.");
  return json?.data ?? json;
}


export async function GetReportsPage({ status = "ALL", type = "", q = "", page = 0, size = 10 } = {}) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (type) params.append("type", type);
  if (q) params.append("q", q);
  params.append("page", page);
  params.append("size", size);

  const res = await fetch(`${Endpoint_URL}/GetReportsPage?${params.toString()}`, { credentials: "include" });
  const json = await toJsonSafe(res);
  assertApiOk(res, json, "Error al obtener reportes paginados.");
  return json?.data ?? json; // Page<ReportPotencialRiskDTO>
}

export async function GetReportsByEmployee(nit, { page = 0, size = 10 } = {}) {
  const res = await fetch(`${Endpoint_URL}/GetReportsByEmployeeNit/${encodeURIComponent(nit)}?page=${page}&size=${size}`, { credentials: "include" });
  const json = await toJsonSafe(res);
  assertApiOk(res, json, "Error al obtener reportes del empleado.");
  return json?.data ?? json;
}

export async function GetReportById(id) {
  const res = await fetch(`${Endpoint_URL}/GetReportById/${encodeURIComponent(id)}`, { credentials: "include" });
  const json = await toJsonSafe(res);
  assertApiOk(res, json, "Reporte no encontrado.");
  return json?.data ?? json;
}

/* ---------- CRUD ---------- */
export async function InsertReport(reportData) {
  const res = await fetch(`${Endpoint_URL}/InsertReport`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(reportData)
  });
  const json = await toJsonSafe(res);
  assertApiOk(res, json, "No se pudo crear el reporte.");
  return json; // ApiResponse<ReportPotencialRiskDTO>
}

export async function UpdateReport(idReport, reportData) {
  const res = await fetch(`${Endpoint_URL}/UpdateReport/${encodeURIComponent(idReport)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(reportData)
  });
  const json = await toJsonSafe(res);
  assertApiOk(res, json, "No se pudo actualizar el reporte.");
  return json;
}

export async function VerifyReport(idReport) {
  const res = await fetch(`${Endpoint_URL}/VerifyReport/${encodeURIComponent(idReport)}`, {
    method: "PATCH",
    credentials: "include"
  });
  const json = await toJsonSafe(res);
  assertApiOk(res, json, "No se pudo verificar el reporte.");
  return json;
}

export async function DeleteReport(idReport) {
  const res = await fetch(`${Endpoint_URL}/DeleteReport/${encodeURIComponent(idReport)}`, {
    method: "DELETE",
    credentials: "include"
  });
  const json = await toJsonSafe(res);
  assertApiOk(res, json, "No se pudo eliminar el reporte.");
  return json;
}