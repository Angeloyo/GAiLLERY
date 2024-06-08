let recognition;
if ('SpeechRecognition' in window) {
    recognition = new window.SpeechRecognition();
} else if ('webkitSpeechRecognition' in window) {
    recognition = new window.webkitSpeechRecognition(); // Safari y Chrome < 25
} else {
    console.error("El navegador no soporta la API de Web Speech.");
}

const micButton = document.getElementById('mic-button');

if (recognition) {
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    micButton.addEventListener('click', () => {
        if (recognition && recognition.abort) {
            recognition.abort();
        }
        if (micButton.classList.contains('bg-red-600')) {
            recognition.stop();
        } else {
            recognition.start();
        }
        // loadGallery(false, 'seashore')
    });

    recognition.onstart = () => {
        micButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        micButton.classList.add('bg-red-600', 'hover:bg-red-700');
    };

    recognition.onend = () => {
        micButton.classList.remove('bg-red-600', 'hover:bg-red-700');
        micButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        // console.log('Transcript:', transcript);
        handleVoiceCommand(transcript);
    };
}

function handleVoiceCommand(command) {
    console.log('Voice command:', command);
    if (command.startsWith("show me") && command.endsWith("photos")) {
        const tag = command.slice(8, -7).trim();
        // console.log('Tag:', tag);
        loadGallery(false, tag);
    } else if (command === "next image") {
        goToNextImage();
    } else if (command === "previous image") {
        goToPreviousImage();
    } else if (command === "close gallery") {
        closeGallery();
    }
}

function filterImagesByTag(tag) {
    console.log('Filtrando imágenes por tag:', tag);
}

function goToNextImage() {
    console.log('Yendo a la siguiente imagen');
}

function goToPreviousImage() {
    console.log('Regresando a la imagen anterior');
}

function closeGallery() {
    console.log('Cerrando galería');
}