// Función para filtrar y buscar miembros
function filtrarYBuscar() {
  const estado = document.getElementById("filtroEstado").value;
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const miembros = document.querySelectorAll(".miembro");

  miembros.forEach(miembro => {
    const esActivo = miembro.classList.contains("activo");
    const texto = miembro.textContent.toLowerCase();
    
    // Aplicar ambos filtros
    const mostrarPorEstado = estado === "todos" || 
                          (estado === "activo" && esActivo) || 
                          (estado === "inactivo" && !esActivo);
    
    const mostrarPorBusqueda = searchTerm === "" || texto.includes(searchTerm);
    
    // Mostrar u ocultar según ambos criterios
    miembro.style.display = (mostrarPorEstado && mostrarPorBusqueda) ? "flex" : "none";
  });
}

// Evento para el filtro de estado
document.getElementById("filtroEstado").addEventListener("change", filtrarYBuscar);

// Evento para la búsqueda (con Enter y mientras escribe)
document.getElementById("searchInput").addEventListener("input", filtrarYBuscar);
document.getElementById("searchInput").addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    filtrarYBuscar();
  }
});

// Aplicar filtros al cargar la página
document.addEventListener("DOMContentLoaded", filtrarYBuscar);