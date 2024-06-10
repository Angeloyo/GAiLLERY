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
    recognition.continuous = true;
    recognition.interimResults = false;

    micButton.addEventListener('click', () => {
        if (micButton.classList.contains('bg-red-600')) {
            recognition.stop();
        } else {
            recognition.start();
        }
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
        let lastResultIndex = event.results.length - 1;
        var transcript = event.results[lastResultIndex][0].transcript.toLowerCase().trim();
        console.log('Transcript received:', transcript);
        handleVoiceCommand(transcript);
    };
}

function handleVoiceCommand(command) {
    if (command.startsWith("show" || "show me" || "display" || "filter by") 
            && command.endsWith("photos" || "images" || "pictures")) {
        let tag = command.slice(8, -7).trim();
        tag = tag.replace(/\s+/g, '_');
        plugin.closeGallery();
        loadGallery(false, tag);
    } else if (command === "open gallery" || command === "open the gallery") {
        plugin.openGallery();
    }
    else if (command === "next" || command === "forward" || command === "go forward" || command === "next photo" || command === "next image" || command === "next picture") {
        plugin.goToNextSlide();
    }
    else if (command === "previous" || command === "back" || command === "go back" || command === "previous photo" || command === "previous image" || command === "previous picture") {
        plugin.goToPrevSlide();
    }
    else if (command === "close gallery" || command === "close the gallery" || command === "exit gallery" || command === "exit the gallery" || command === "close" || command === "exit") {
        plugin.closeGallery();
    }
}