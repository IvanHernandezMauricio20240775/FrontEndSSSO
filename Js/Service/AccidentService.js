const Endpoint_URL = "http://localhost:8080/ActionsAccident"

/** maneja ApiResponse {status, message, data} y errores HTTP */
async function handle(response) {
  let data = null;
  try { data = await response.json(); } catch (_) {}

  if (!response.ok) {
    const msg = data?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  if (data && data.status === false) {
    throw new Error(data.message || "Operación fallida");
  }
  return data; 
}


export async function getAllAccidentPage ({
  page = 0,
  size = 10,
  type_insecurity,
  id_category,
  month,
  q
} = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  if (type_insecurity) params.set("type_insecurity", type_insecurity);
  if (id_category != null) params.set("id_category", String(id_category));
  if (month != null) params.set("month", String(month));
  if (q) params.set("q", q);

  const res = await fetch(`${Endpoint_URL}/Accident/List?${params.toString()}`, {
    credentials: "include"
  });
  return handle(res);
}

/** DETALLE por ID */
export async function getAccidentDetail(ID_Accident_Detail) {
  const res = await fetch(`${Endpoint_URL}/Detail/${ID_Accident_Detail}`, {
    method: "GET",
    credentials: "include"
  });
  return handle(res);
}

/** CABECERA por ID */
export async function getAccidentHeader(ID_Accident) {
  const res = await fetch(`${Endpoint_URL}/Header/${ID_Accident}`, {
    method: "GET",
    credentials: "include"
  });
  return handle(res);
}

/** TODOS LOS DETALLES de un accidente */
export async function GetDetailsByAccident(ID_Accident) {
  const res = await fetch(`${Endpoint_URL}/DetailsByAccident/${ID_Accident}`, {
    method: "GET",
    credentials: "include"
  });
  return handle(res);
}

/** CATEGORÍAS */
export async function GetCategoriesAccident() {
  const res = await fetch(`${Endpoint_URL}/Categories`, {
    method: "GET",
    credentials: "include"
  });
  return handle(res);
}

/** PARTES DEL CUERPO */
export async function GetBodyParts() {
  const res = await fetch(`${Endpoint_URL}/BodyParts`, {
    method: "GET",
    credentials: "include"
  });
  return handle(res);
}

/** CREAR accidente + detalle (payload = { accident, detail }) */
export async function CreateAccident(payload) {
  const res = await fetch(`${Endpoint_URL}/CreateAccident`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return handle(res);
}

/** ACTUALIZAR SOLO detalle (payload = AccidentDetailDTO con campos a cambiar) */
export async function UpdateDetail(ID_Detail, payload) {
  const res = await fetch(`${Endpoint_URL}/UpdateDetail/${ID_Detail}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return handle(res);
}

/** ELIMINAR detalle */
export async function DeleteDetail(ID_Detail) {
  const res = await fetch(`${Endpoint_URL}/DeleteDetail/${ID_Detail}`, {
    method: "DELETE",
    credentials: "include"
  });
  return handle(res);
}

/** ELIMINAR accidente */
export async function DeleteAccident(ID_Accident) {
  const res = await fetch(`${Endpoint_URL}/DeleteAccident/${ID_Accident}`, {
    method: "DELETE",
    credentials: "include"
  });
  return handle(res);
}