const categoryHeader = document.querySelector('.category-header');
// Select the first element with the class 'category-content'
const categoryContent = document.querySelector('.category-content');

// Always good to check if the elements were found before adding listeners
if (categoryHeader && categoryContent) {
    categoryHeader.addEventListener('click', () => {
        categoryContent.classList.toggle('expanded');
        categoryHeader.classList.toggle('expanded');
    });
} else {
    console.error("Error: One or both elements with classes 'category-header' or 'category-content' not found.");
}