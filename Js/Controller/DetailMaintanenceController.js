import {
    getAllDetailMaintenance,
    getDetailMaintenanceById,
    createDetailMaintenance,
    updateDetailMaintenance,
    deleteDetailMaintenance
} from "../Service/DetailMaintenanceService.js";

const formDetail = document.getElementById("formDetailMaintenance");
const modalDetail = new bootstrap.Modal(document.getElementById("modalDetailMaintenance"));

formDetail.addEventListener("submit", async e => {
    e.preventDefault();

    const detail = {
        name_maintenance: document.getElementById("inputNameDetail").value,
        total_time: document.getElementById("inputTotalTime").value,
        description: document.getElementById("inputDescriptionDetail").value,
        activity: document.getElementById("inputActivityDetail").value,
        img_maintenance: document.getElementById("inputImgDetail").value,
        id_assign_maintenance: document.getElementById("inputIdAssignMaintenance").value
    };

    const action = formDetail.dataset.action;

    if (action === "create") {
        await createDetailMaintenance(detail);
    } else if (action === "update") {
        const id = formDetail.dataset.id;
        await updateDetailMaintenance(id, detail);
    }

    modalDetail.hide();
    formDetail.reset();
});