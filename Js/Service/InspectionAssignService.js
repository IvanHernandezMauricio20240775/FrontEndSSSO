export const Endpoint_URL = "https://sssoserver-d5bbca7fec4b.herokuapp.com/ActionsInspection";

/* Helpers genéricos (mismo patrón que usas en otros módulos) */
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

/* Construye ProgramInspectionDTO a partir de banderas y listas (opcional) */
export function BuildProgramInspectionBody({
    inspection,
    includeGeneral = false,
    extinguishers = [],   // ["EXT-001", ...]
    detectors = []        // ["SMKDT-001", ...]
}) {
    const assignments = [];

    // GENERAL (usa ID_Location como ID_Implement)
    if (includeGeneral && inspection?.ID_Location) {
        assignments.push({
            ID_Inspection: inspection.ID_Inspection || "",
            ID_Implement: inspection.ID_Location,
            State_Assign: "PENDIENTE",
            ID_TypeImplement: 1
        });
    }

    // EXTINTORES
    extinguishers.forEach(code => {
        if (!code) return;
        assignments.push({
            ID_Inspection: inspection.ID_Inspection || "",
            ID_Implement: code,
            State_Assign: "PENDIENTE",
            ID_TypeImplement: 2
        });
    });

    // DETECTORES
    detectors.forEach(code => {
        if (!code) return;
        assignments.push({
            ID_Inspection: inspection.ID_Inspection || "",
            ID_Implement: code,
            State_Assign: "PENDIENTE",
            ID_TypeImplement: 3
        });
    });

    return { inspection: { State_Inspection: "PENDIENTE", ...inspection }, assignments };
}

/* ================== LISTADOS / CATÁLOGOS ================== */
/**
 * GET /ActionsInspection/List?state=&q=&page=&size=
 * -> ApiResponse<InspectionPageDTO>
 */
export async function GetInspectionsPage({ state = "ALL", q = "", page = 0, size = 10 } = {}) {
    const params = new URLSearchParams();
    if (state) params.append("state", state);
    if (q) params.append("q", q);
    params.append("page", page);
    params.append("size", size);

    const res = await fetch(`${Endpoint_URL}/GetInspectionsPage?${params.toString()}`, { credentials: "include" });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "Error al obtener inspecciones.");
    return json?.data ?? json; // Page<InspectionListRowDTO>
}

export async function GetInspectionsPageByMember({
    memberId,
    state = "ALL",
    q = "",
    page = 0,
    size = 10
} = {}) {
    if (!memberId) throw new Error("memberId es requerido.");

    const params = new URLSearchParams();
    params.append("memberId", memberId);
    if (state) params.append("state", state);
    if (q) params.append("q", q);
    params.append("page", page);
    params.append("size", size);

    const res = await fetch(
        `${Endpoint_URL}/GetInspectionsPageByMember?${params.toString()}`,
        { credentials: "include" }
    );
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "Error al obtener inspecciones del miembro.");
    return json?.data ?? json;
}

/**
 * GET /ActionsInspection/GetInspection/{idInspection}
 * -> ApiResponse<InspectionDTO>
 */
export async function GetInspectionById(idInspection) {
    const res = await fetch(`${Endpoint_URL}/GetInspectionByIDInspection/${encodeURIComponent(idInspection)}`, {
        credentials: "include"
    });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "Inspección no encontrada.");
    return json?.data ?? json;
}

/**
 * GET /ActionsInspection/Assignments/{idInspection}
 * -> ApiResponse<List<AssignInspectionDTO>>
 */
export async function GetAssignmentsByInspection(idInspection) {
    const res = await fetch(`${Endpoint_URL}/GetAssignmentsByInspection/${encodeURIComponent(idInspection)}`, {
        credentials: "include"
    });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "Error al obtener asignaciones.");
    return json?.data ?? json;
}

/**
 * GET /ActionsInspection/CountsByCategory
 * -> ApiResponse<Map<String, Long>>
 */
export async function GetCountsByCategory() {
    const res = await fetch(`${Endpoint_URL}/GetCountsByCategory`, { credentials: "include" });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "Error al obtener conteos por categoría.");
    return json?.data ?? json;
}

/**
 * GET /ActionsInspection/TypeImplements
 * -> ApiResponse<List<TypeImplementDTO>>
 */
export async function GetTypeImplements() {
    const res = await fetch(`${Endpoint_URL}/TypeImplements`, { credentials: "include" });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "Error al obtener tipos de implemento.");
    return json?.data ?? json;
}

export async function CreateAssignInspection(programInspectionDTO) {
    const res = await fetch(`${Endpoint_URL}/CreateAssignInspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(programInspectionDTO)
    });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "No se pudo programar la inspección.");
    return json; // ApiResponse<InspectionDTO>
}

export async function UpdateAssignInspection(ID_Report, programInspectionDTO) {
    const res = await fetch(`${Endpoint_URL}/UpdateAssignInspection/${ID_Report}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(programInspectionDTO)
    });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "No se pudo actualizar la inspección.");
    return json;
}

export async function CompleteDetailExtinguisher(extinguisherDetailDTO) {
    const res = await fetch(`${Endpoint_URL}/CompleteDetailExtinguisher`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(extinguisherDetailDTO)
    });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "No se pudo guardar el detalle de extintor.");
    return json;
}

export async function CompleteDetailDetector(detectorDetailDTO) {
    const res = await fetch(`${Endpoint_URL}/CompleteDetailDetector`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(detectorDetailDTO)
    });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "No se pudo guardar el detalle de detector.");
    return json;
}

export async function CompleteDetailLocation(locationDetailDTO) {
    const res = await fetch(`${Endpoint_URL}/CompleteDetailLocation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(locationDetailDTO)
    });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "No se pudo guardar el detalle general.");
    return json;
}

export async function DeleteInspection(idInspection) {
    const res = await fetch(`${Endpoint_URL}/DeleteInspection/${encodeURIComponent(idInspection)}`, {
        method: "DELETE",
        credentials: "include"
    });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "No se pudo eliminar la inspección.");
    return json;
}

export async function DeleteAllAssignInspection(idInspection) {
    const res = await fetch(`${Endpoint_URL}/DeleteAllAssignInspection/${encodeURIComponent(idInspection)}`, {
        method: "DELETE",
        credentials: "include"
    });
    const json = await toJsonSafe(res);
    assertApiOk(res, json, "No se pudieron eliminar las asignaciones.");
    return json;
}