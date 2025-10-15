const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsDashBoard"

export async function getInspectionsInfo() {
    try {
        const response = await fetch(`${Endpoint_URL}/inspections/status`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la informacion de estado de las Inspecciones.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getInspectionsInfo:", error);
        throw error;
    }
}

export async function getInfoCards() {
    try {
        const response = await fetch(`${Endpoint_URL}/cards`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la informacion de las Tarjetas.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getInfoCards:", error);
        throw error;
    }
}

function toISODateOnly(d) {
  if (!d) return undefined;
  if (typeof d === "string") return d; // ya viene yyyy-MM-dd
  const dt = d instanceof Date ? d : new Date(d);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export async function getIncidentsByRiskType({ from, to } = {}) {
  try {
    const params = new URLSearchParams();
    const f = toISODateOnly(from);
    const t = toISODateOnly(to);
    if (f) params.set("from", f);
    if (t) params.set("to", t);

    const url = `${Endpoint_URL}/risks/incidents-by-type${params.toString() ? `?${params}` : ""}`;

    const response = await fetch(url, { method: "GET", credentials: "include" });
    if (!response.ok) throw new Error("Error al obtener incidentes por tipo de peligro.");
    // Respuesta = { status, message, data: { categories:[], data:[] } }
    return await response.json();
  } catch (err) {
    console.error("Error en getIncidentsByRiskType:", err);
    throw err;
  }
}
