document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');

    // Manejar el envío del formulario
    contactForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Evita el envío por defecto

        // Aquí puedes agregar la lógica para enviar el formulario
        // por ejemplo, usando fetch() o AJAX
        console.log('Formulario enviado');

        // Resetear el formulario
        contactForm.reset();
        alert('¡Gracias por contactarnos! Tu mensaje ha sido enviado.');
    });

    // Lógica para las animaciones al hacer scroll
    const animatedElements = document.querySelectorAll('.animate__animated');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add(entry.target.dataset.animation);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    animatedElements.forEach(element => {
        const animationClass = element.classList.value.split(' ').find(cls => cls.startsWith('animate__'));
        element.dataset.animation = animationClass;
        element.classList.remove(animationClass); // Eliminamos la clase al inicio
        observer.observe(element);
    });
});