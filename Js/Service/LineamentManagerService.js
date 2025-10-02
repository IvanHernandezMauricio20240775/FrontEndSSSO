const Endpoint_URL = "http://localHost:8080/ActionsCategoryLineamient"

export async function getAllCategoryLineament() {
    try {
        const response = await fetch(`${Endpoint_URL}/GetAllCategories`,{
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Error al obtener la lista de Categorias de los Lineamientos.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getAllCategoryLineamient:", error);
        throw error;
    }
}


export async function getCategoryLineamentByID(id_CategoryLineament) {
    try {
        const response = await fetch(`${Endpoint_URL}/GetCategoryById/${id_CategoryLineament}`,{
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error('Extintor no encontrado.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error en getExtinguisherById:", error);
        throw error;
    }
}

export async function InsertNewCategoryLineament(data_Category) {
    try {
        const response = await fetch(`${Endpoint_URL}/InsertCategory`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Category)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en InsertNewZone:", error);
        throw error;
    }
}

export async function UpdatedCategoryLineament(id_CategoryLineament, data_Category) {
    try {
        const response = await fetch(`${Endpoint_URL}/UpdateCategory/${id_CategoryLineament}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data_Category)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en UpdatedExtinguisher:", error);
        throw error;
    }
}


export async function DeleteCategory(id_CategoryLineament) {
    try {
        const response = await fetch(`${Endpoint_URL}/DeleteCategory/${id_CategoryLineament}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await response.json();
    } catch (error) {
        console.error("Error en DeleteExtinguisher:", error);
        throw error;
    }
}