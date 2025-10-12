const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsMaintenance";

/* ===================== Helpers ===================== */
async function toJsonSafe(response) {
  try { return await response.json(); } catch { return null; }
}
/* Lanza con mensaje si viene ApiResponse con success=false o HTTP !ok */
function assertApiOk(response, json, fallbackMsg) {
  if (!response.ok) {
    const msg =
      (json && json.message) ||
      (json && json.error) ||
      (Array.isArray(json?.errors) ? json.errors.join(", ") : null) ||
      `${fallbackMsg} (HTTP ${response.status})`;
    throw new Error(msg);
  }
  // Si el backend devuelve ApiResponse
  if (json && typeof json === "object" && "success" in json) {
    if (!json.success) {
      throw new Error(json.message || fallbackMsg);
    }
  }
}
/* Wrapper genérico para fetch + validación ApiResponse */
async function apiJson(path, { method = "GET", body = undefined, headers = {} } = {}, fallbackMsg = "Error de solicitud") {
  const response = await fetch(`${Endpoint_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body
  });
  const json = await toJsonSafe(response);
  assertApiOk(response, json, fallbackMsg);
  return json; // <- ApiResponse { success, message, data }
}

/* ===================== Upload (se queda igual) ===================== */
export async function UploadImage(file, { folder, type } = {}) {
  if (!(file instanceof File || file instanceof Blob)) {
    throw new Error("El parámetro 'file' debe ser un File o Blob.");
  }
  if (!folder && !type) {
    // Por defecto para esta sección
    type = "DetailMaintenance";
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

/* ===================== TYPES ===================== */
/** GET /GetAllTypeMaintenance */
export async function getAllTypes() {
  try {
    return await apiJson(`/GetAllTypeMaintenance`, { method: "GET" }, "Error al listar tipos de mantenimiento");
  } catch (err) {
    console.error("getAllTypes:", err);
    throw err;
  }
}

/* ===================== VIEW (JOIN) ===================== */
/** GET /GetAllAssignMaintenanceView  → lista todas las tarjetas */
export async function getAllAssignMaintenanceView() {
  try {
    return await apiJson(`/GetAllAssignMaintenanceView`, { method: "GET" }, "Error al listar asignaciones");
  } catch (err) {
    console.error("getAllAssignMaintenanceView:", err);
    throw err;
  }
}

/** GET /AssignViewByMember/{idMember}  → tarjetas filtradas por miembro */
export async function getAssignViewByMember(idMember) {
  try {
    if (idMember == null) throw new Error("idMember requerido");
    return await apiJson(`/AssignViewByMember/${encodeURIComponent(idMember)}`, { method: "GET" }, "Error al listar asignaciones por miembro");
  } catch (err) {
    console.error("getAssignViewByMember:", err);
    throw err;
  }
}

/** GET /AssignViewById/{idAssign}  → una tarjeta por id de asignación */
export async function getAssignViewById(idAssign) {
  try {
    if (idAssign == null) throw new Error("idAssign requerido");
    return await apiJson(`/AssignViewById/${encodeURIComponent(idAssign)}`, { method: "GET" }, "Error al obtener asignación");
  } catch (err) {
    console.error("getAssignViewById:", err);
    throw err;
  }
}

/* ===================== CREATE (Maintenance + Assign) ===================== */
/**
 * POST /InsertMaintenanceAndAssign
 * body: { maintenance: MaintenanceDTO, assign: AssignMaintenanceDTO }
 */
export async function insertMaintenanceAndAssign({ maintenance, assign }) {
  try {
    if (!maintenance || !assign) throw new Error("Payload inválido: { maintenance, assign } requerido");
    return await apiJson(
      `/InsertMaintenanceAndAssign`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance, assign })
      },
      "Error al crear la asignación"
    );
  } catch (err) {
    console.error("insertMaintenanceAndAssign:", err);
    throw err;
  }
}

/* ===================== UPDATE ASSIGNMENT ===================== */
/**
 * PUT /UpdateAssignment/{idAssign}
 * body: { maintenance: MaintenanceDTO, assign: AssignMaintenanceDTO }
 */
export async function updateAssignment(idAssign, { maintenance, assign }) {
  try {
    if (idAssign == null) throw new Error("idAssign requerido");
    if (!maintenance || !assign) throw new Error("Payload inválido: { maintenance, assign } requerido");
    return await apiJson(
      `/UpdateAssignment/${encodeURIComponent(idAssign)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance, assign })
      },
      "Error al actualizar la asignación"
    );
  } catch (err) {
    console.error("updateAssignment:", err);
    throw err;
  }
}

/* ===================== DELETE ASSIGNMENT (cascade) ===================== */
/** DELETE /DeleteAssignment/{idAssign} */
export async function deleteAssignment(idAssign) {
  try {
    if (idAssign == null) throw new Error("idAssign requerido");
    return await apiJson(
      `/DeleteAssignment/${encodeURIComponent(idAssign)}`,
      { method: "DELETE" },
      "Error al eliminar la asignación"
    );
  } catch (err) {
    console.error("deleteAssignment:", err);
    throw err;
  }
}

/* ===================== DETAIL (REALIZAR) ===================== */
/**
 * POST /InsertDetail
 * body: DetailMaintenanceDTO
 */
export async function insertDetail(detailDto) {
  try {
    if (!detailDto) throw new Error("detailDto requerido");
    return await apiJson(
      `/InsertDetail`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detailDto)
      },
      "Error al crear el detalle"
    );
  } catch (err) {
    console.error("insertDetail:", err);
    throw err;
  }
}

/** GET /DetailByAssign/{idAssign} */
export async function detailByAssign(idAssign) {
  try {
    if (idAssign == null) throw new Error("idAssign requerido");
    return await apiJson(
      `/DetailByAssign/${encodeURIComponent(idAssign)}`,
      { method: "GET" },
      "Error al obtener el detalle"
    );
  } catch (err) {
    console.error("detailByAssign:", err);
    throw err;
  }
}

/* ===================== NEXT ID HELP ===================== */
/** GET /NextMaintenanceId */
export async function nextMaintenanceId() {
  try {
    return await apiJson(`/NextMaintenanceId`, { method: "GET" }, "Error al generar el siguiente ID");
  } catch (err) {
    console.error("nextMaintenanceId:", err);
    throw err;
  }
}
