// TELEtext RADIO - Compatible con todos los formatos
console.log('📻 Radio iniciando...');

let audio = document.getElementById('radioPlayer');
let playlist = [];
let currentIndex = 0;
let isPlaying = false;

// Determinar carpeta según hora (simple)
function getCurrentFolder() {
    const now = new Date();
    const horaArgentina = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const hora = horaArgentina.getHours();

    if (hora >= 1 && hora < 6) return 'music/madrugada/';
    if (hora >= 6 && hora < 12) return 'music/manana/';
    if (hora >= 12 && hora < 16) return 'music/tarde/';
    if (hora >= 16 && hora < 20) return 'music/mediatarde/';
    return 'music/noche/';
}

// Cargar playlist COMPATIBLE
function loadPlaylist() {
    const folder = getCurrentFolder();
    console.log('📂 Carpeta:', folder);

    fetch(folder + 'playlist.json')
        .then(response => response.json())
        .then(data => {
            // FORMATO 1: El NUEVO { "tracks": [{"file": "nombre.mp3"}] }
            if (data.tracks && Array.isArray(data.tracks)) {
                playlist = data.tracks.map(item => {
                    if (typeof item === 'string') {
                        // Si es string: "nombre.mp3"
                        return folder + item;
                    } else if (item.file) {
                        // Si es objeto: { "file": "nombre.mp3" }
                        return folder + item.file;
                    }
                    return null;
                }).filter(Boolean);
            }
            // FORMATO 2: El ANTIGUO { "tracks": ["cancion.mp3", ...] }
            else if (Array.isArray(data.tracks)) {
                playlist = data.tracks.map(item => folder + item);
            }
            // FORMATO 3: Array directo (por si acaso)
            else if (Array.isArray(data)) {
                playlist = data.map(item => folder + (item.file || item));
            }
            
            // Si sigue vacío, fallback
            if (playlist.length === 0) {
                playlist = [folder + 'jazzcartel.mp3'];
                console.warn('⚠️ Playlist vacía, usando fallback');
            }
            
            console.log('✅ Playlist cargada:', playlist.length, 'temas');
            loadCurrentTrack();
        })
        .catch(() => {
            console.error('❌ Error cargando JSON, usando emergencia');
            playlist = [folder + 'jazzcartel.mp3'];
            loadCurrentTrack();
        });
}

// Cargar canción (robusto)
function loadCurrentTrack() {
    if (playlist.length === 0 || currentIndex >= playlist.length) return;
    
    const track = playlist[currentIndex];
    console.log('🎵 Cargando:', track);
    
    // Pausar y limpiar
    audio.pause();
    
    // Crear NUEVO elemento de audio (evita errores)
    const newAudio = new Audio();
    newAudio.src = track;
    newAudio.volume = 0.8;
    
    newAudio.oncanplay = () => {
        console.log('✅ Audio listo');
        // Reemplazar el elemento viejo
        if (audio.parentNode) {
            audio.parentNode.replaceChild(newAudio, audio);
        }
        audio = newAudio;
        audio.id = 'radioPlayer';
        
        // Configurar eventos
        audio.onended = () => {
            console.log('⏭️ Siguiente');
            currentIndex = (currentIndex + 1) % playlist.length;
            setTimeout(() => loadCurrentTrack(), 500);
        };
        
        audio.onerror = () => {
            console.error('❌ Error en audio');
            currentIndex = (currentIndex + 1) % playlist.length;
            setTimeout(() => loadCurrentTrack(), 2000);
        };
        
        // Reproducir si estaba en play
        if (isPlaying) {
            audio.play().catch(e => console.log('Error play:', e));
        }
    };
    
    newAudio.onerror = () => {
        console.error('❌ No se pudo cargar');
        currentIndex = (currentIndex + 1) % playlist.length;
        setTimeout(() => loadCurrentTrack(), 1000);
    };
}

// Control play/pause
function togglePlay() {
    if (playlist.length === 0) {
        loadPlaylist();
        return;
    }
    
    if (!isPlaying) {
        if (!audio.src) loadCurrentTrack();
        
        audio.play().then(() => {
            isPlaying = true;
            console.log('▶️ Reproduciendo');
        }).catch(e => {
            console.error('Error:', e);
            // Intentar siguiente
            currentIndex = (currentIndex + 1) % playlist.length;
            loadCurrentTrack();
        });
    } else {
        audio.pause();
        isPlaying = false;
        console.log('⏸️ Pausado');
    }
}

// Iniciar
document.addEventListener('DOMContentLoaded', () => {
    // Botón de play
    const playBtn = document.getElementById('radioPlayButton');
    if (playBtn) playBtn.addEventListener('click', togglePlay);
    
    // Clic en cualquier parte (tu método)
    document.addEventListener('click', () => {
        if (!isPlaying && playlist.length === 0) {
            loadPlaylist();
        }
    }, { once: true });
    
    // Cargar playlist inicial
    loadPlaylist();
});
