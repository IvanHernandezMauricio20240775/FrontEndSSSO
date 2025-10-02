
document.addEventListener('DOMContentLoaded', () => {

    const allOptionsButton = document.getElementById('AllOptions');
    const AlarmDisabledButton = document.getElementById('AlarmDisabled');
    const AlarmWorkingButton = document.getElementById('AlarmWorking');

    // Agrupa estos botones en un array para facilitar la iteración
    const optionButtons = [allOptionsButton, AlarmDisabledButton, AlarmWorkingButton];
    function handleOptionButtonClick(event) {
        optionButtons.forEach(button => {
            if (button) {
                button.classList.remove('selected-option');
            }
        });

        if (event.currentTarget) {
            event.currentTarget.classList.add('selected-option');
        }

        const selectedId = event.currentTarget.id;
        console.log(`Opción seleccionada: ${selectedId}`);

    }

    optionButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', handleOptionButtonClick);
        }
    });

    if (allOptionsButton) {
        allOptionsButton.classList.add('selected-option');
    }
});


