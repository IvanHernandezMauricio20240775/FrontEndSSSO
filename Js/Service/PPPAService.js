
const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsPPA";

/* ===================== Helpers ===================== */
async function toJsonSafe(response) {
  try { return await response.json(); } catch { return null; }
}

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
    if (!json.success) throw new Error(json.message || fallbackMsg);
  }
}

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
const enc = encodeURIComponent;

/* ================================================== ENDPOINTS  ================================================ */


export async function getAllPpa() {
  return apiJson(`/GetAllPpa`, { method: "GET" }, "Error al listar PPA");
}


export async function createPpa(year_ppa) {
  const body = JSON.stringify({ year_ppa });
  return apiJson(
    `/CreatePpa`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
    "Error al crear el PPA"
  );
}

export async function deletePpa(idPpa) {
  return apiJson(`/DeletePpa/${enc(idPpa)}`, { method: "DELETE" }, "Error al eliminar el PPA");
}

export async function getPlanView(year) {
  return apiJson(`/GetPlanView/${enc(year)}`, { method: "GET" }, "Error al obtener el plan");
}


export async function insertActivity({ id_ppa, name_activity, description }) {
  const body = JSON.stringify({ id_ppa, name_activity, description });
  return apiJson(
    `/InsertActivity`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
    "Error al crear la actividad"
  );
}

export async function updateActivity(idActivity, { name_activity, description }) {
  const body = JSON.stringify({ name_activity, description });
  return apiJson(
    `/UpdateActivity/${enc(idActivity)}`,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body },
    "Error al actualizar la actividad"
  );
}

export async function deleteActivity(idActivity) {
  return apiJson(
    `/DeleteActivity/${enc(idActivity)}`,
    { method: "DELETE" },
    "Error al eliminar la actividad"
  );
}

export async function insertAction({ id_activity, name_action, description, state_action }) {
  const body = JSON.stringify({ id_activity, name_action, description, state_action });
  return apiJson(
    `/InsertAction`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
    "Error al crear la acción"
  );
}

export async function updateAction(idAction, { name_action, description, state_action }) {
  const body = JSON.stringify({ name_action, description, state_action });
  return apiJson(
    `/UpdateAction/${enc(idAction)}`,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body },
    "Error al actualizar la acción"
  );
}

export async function deactivateAction(idAction) {
  return apiJson(
    `/DeactivateAction/${enc(idAction)}`,
    { method: "PUT" },
    "Error al desactivar la acción"
  );
}

/** DELETE /DeleteAction/{idAction} → ApiResponse<Void> */
export async function deleteAction(idAction) {
  return apiJson(
    `/DeleteAction/${enc(idAction)}`,
    { method: "DELETE" },
    "Error al eliminar la acción"
  );
}

export async function getSolutionBankByYear(year) {
  return apiJson(
    `/SolutionBank/GetAll/${enc(year)}`,
    { method: "GET" },
    "Error al listar banco de soluciones"
  );
}


export async function ingestSolutionBank({ year, items }) {
  const body = JSON.stringify({ year, items });
  return apiJson(
    `/SolutionBank/Ingest`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
    "Error al ingerir soluciones"
  );
}

/** POST /SolutionBank/Apply/{idSolution}/To/{year} → ApiResponse<Void> */
export async function applySolutionToPpa(idSolution, year) {
  return apiJson(
    `/SolutionBank/Apply/${enc(idSolution)}/To/${enc(year)}`,
    { method: "POST" },
    "Error al aplicar solución al plan"
  );
}

/** DELETE /SolutionBank/Delete/{idSolution} → ApiResponse<Void> */
export async function deleteSolutionBank(idSolution) {
  return apiJson(
    `/SolutionBank/Delete/${enc(idSolution)}`,
    { method: "DELETE" },
    "Error al eliminar solución"
  );
}
