 const phrases = [
      "La seguridad es una actitud, no un accesorio.",
      "Trabajar seguro es vivir tranquilo.",
      "Tu familia te espera, cuídate en el trabajo.",
      "Prevenir es vivir, protege tu integridad.",
      "La salud ocupacional empieza contigo.",
      "Un segundo de descuido, una vida de consecuencias.",
      "La mejor herramienta es la prevención.",
      "Más vale perder un segundo de tu vida, que la vida en un segundo."
    ];

    let phraseIndex = 0;
    const phraseElement = document.getElementById("phrase");

    setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      phraseElement.style.opacity = 0;
      setTimeout(() => {
        phraseElement.textContent = phrases[phraseIndex];
        phraseElement.style.opacity = 1;
      }, 300);
    }, 3000); // cambia cada 4 segundos

    // Progress bar animation
    let progress = 0;
    const progressBar = document.getElementById("progressBar");

    const progressInterval = setInterval(() => {
      if (progress < 100) {
        progress++;
        progressBar.style.width = progress + "%";
        progressBar.textContent = progress + "%";
      } else {
        clearInterval(progressInterval);

         window.location.href = "index.html";
      }
    }, 100) // velocidad de carga: 100 * 50ms = 5 segundos