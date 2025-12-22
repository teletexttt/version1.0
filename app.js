// TELEtext RADIO - Sistema Simple y Funcional
console.log('📻 Radio iniciando...');

// ===== ELEMENTOS DEL DOM =====
let audio = document.getElementById('radioPlayer');
let playButton = document.getElementById('radioPlayButton');

// ===== ESTADO =====
let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let playlistLoaded = false;

// ===== DETERMINAR CARPETA SEGÚN HORA (Versión Simple) =====
function getFolderByTime() {
    const now = new Date();
    const horaArgentina = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
    const hora = horaArgentina.getHours();

    if (hora >= 1 && hora < 6) return 'music/madrugada/';
    if (hora >= 6 && hora < 12) return 'music/manana/';
    if (hora >= 12 && hora < 16) return 'music/tarde/';
    if (hora >= 16 && hora < 20) return 'music/mediatarde/';
    return 'music/noche/'; // De 20:00 a 00:59
}

// ===== CARGAR PLAYLIST =====
function loadPlaylist() {
    const folder = getFolderByTime();
    console.log('🕐 Carpeta activa:', folder);

    fetch(folder + 'playlist.json')
        .then(response => response.json())
        .then(data => {
            // Asegurar que sea un array
            playlist = Array.isArray(data.tracks) ? data.tracks : [];
            
            if (playlist.length === 0) {
                console.warn('Playlist vacía, usando canción por defecto');
                playlist = [{ file: 'jazzcartel.mp3' }];
            }
            
            // Convertir a rutas completas
            playlist = playlist.map(track => folder + track.file);
            playlistLoaded = true;
            console.log('✅ Playlist cargada:', playlist.length, 'temas');
            
            // Precargar la primera canción
            loadCurrentTrack();
        })
        .catch(() => {
            console.error('Error cargando playlist, usando respaldo');
            playlist = [folder + 'jazzcartel.mp3'];
            playlistLoaded = true;
            loadCurrentTrack();
        });
}

// ===== CARGA UNA CANCIÓN (Sistema Sólido) =====
function loadCurrentTrack() {
    if (!playlistLoaded || currentIndex >= playlist.length) return;
    
    const track = playlist[currentIndex];
    console.log('🎵 Cargando:', track);
    
    // PAUSAR antes de cambiar
    audio.pause();
    
    // Limpiar eventos anteriores (IMPORTANTE)
    audio.onerror = null;
    audio.onloadeddata = null;
    
    // Asignar nueva fuente
    audio.src = track;
    audio.volume = 0.8;
    
    // Configurar eventos NUEVOS
    audio.onloadeddata = function() {
        console.log('✅ Audio listo para reproducir');
        // Si estaba reproduciendo, reanudar
        if (isPlaying) {
            audio.play().catch(e => {
                console.error('Error al reanudar:', e);
                isPlaying = false;
            });
        }
    };
    
    audio.onerror = function() {
        console.error('❌ Error cargando el audio. Probando siguiente...');
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % playlist.length;
            loadCurrentTrack();
        }, 2000);
    };
    
    audio.onended = function() {
        console.log('⏭️ Canción terminada');
        currentIndex = (currentIndex + 1) % playlist.length;
        setTimeout(() => loadCurrentTrack(), 500);
    };
}

// ===== CONTROL PLAY/PAUSE (Simple) =====
function togglePlay() {
    if (!playlistLoaded) {
        loadPlaylist();
        return;
    }
    
    if (!isPlaying) {
        // Si no hay canción cargada, cargar la actual
        if (!audio.src) {
            loadCurrentTrack();
        }
        
        audio.play().then(() => {
            isPlaying = true;
            console.log('▶️ Reproduciendo');
            updatePlayButton();
        }).catch(e => {
            console.error('Error al iniciar reproducción:', e);
            // Intentar siguiente canción
            currentIndex = (currentIndex + 1) % playlist.length;
            loadCurrentTrack();
        });
    } else {
        audio.pause();
        isPlaying = false;
        console.log('⏸️ Pausado');
        updatePlayButton();
    }
}

// ===== ACTUALIZAR BOTÓN (Si existe) =====
function updatePlayButton() {
    if (!playButton) return;
    
    const playIcon = playButton.querySelector('#playPath');
    const pauseIcon1 = playButton.querySelector('#pausePath1');
    const pauseIcon2 = playButton.querySelector('#pausePath2');
    
    if (!playIcon || !pauseIcon1 || !pauseIcon2) return;
    
    if (isPlaying) {
        playIcon.style.opacity = '0';
        pauseIcon1.style.opacity = '1';
        pauseIcon2.style.opacity = '1';
    } else {
        playIcon.style.opacity = '1';
        pauseIcon1.style.opacity = '0';
        pauseIcon2.style.opacity = '0';
    }
}

// ===== INICIAR =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM listo');
    
    // Configurar botón
    if (playButton) {
        playButton.addEventListener('click', togglePlay);
    }
    
    // Iniciar con clic en cualquier parte (como tu versión original)
    document.addEventListener('click', function initClick() {
        if (!playlistLoaded) {
            loadPlaylist();
        }
        document.removeEventListener('click', initClick);
    }, { once: true });
    
    // Cargar playlist inicial
    loadPlaylist();
    
    // Verificar cambio de horario cada minuto
    setInterval(() => {
        const oldFolder = getFolderByTime();
        // La función loadPlaylist ya usa getFolderByTime(), 
        // así que se actualizará automáticamente si cambia la hora
    }, 60000);
});
