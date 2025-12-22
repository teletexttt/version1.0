// === TELEtext Radio - Sistema de Horarios por Carpeta (Basado en versión estable) ===

// ---- Estado del reproductor (IGUAL QUE TU VERSIÓN) ----
let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let audio = document.getElementById('radioPlayer');
let playlistLoaded = false;
let isFirstPlay = true;

// ---- Nuevo: Estado para horarios ----
let currentSchedule = null;
let scheduleData = null;
let lastCheckedHour = -1;

// ---- Elementos de la nueva interfaz (version1.0) ----
const playButton = document.getElementById('radioPlayButton');
const playPath = document.getElementById('playPath');
const pausePath1 = document.getElementById('pausePath1');
const pausePath2 = document.getElementById('pausePath2');
const currentShow = document.getElementById('currentShow');
const currentTimeName = document.getElementById('currentTimeName');
const currentTimeRange = document.getElementById('currentTimeRange');

// === FUNCIÓN PRINCIPAL: Determinar carpeta según hora (NUEVO) ===
function getCurrentSchedule() {
    const now = new Date();
    const argentinaOffset = -3 * 60; // UTC-3
    const localOffset = now.getTimezoneOffset();
    const offsetDiff = argentinaOffset + localOffset;
    const argentinaTime = new Date(now.getTime() + offsetDiff * 60000);
    
    const currentHour = argentinaTime.getHours();
    const currentMinute = argentinaTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Si ya verificamos esta hora, no recalcular (optimización)
    if (currentHour === lastCheckedHour && currentSchedule) {
        return currentSchedule;
    }
    
    lastCheckedHour = currentHour;
    
    // Horarios fijos (los mismos de tu schedule.json)
    const schedules = [
        { name: "madrugada", start: 1, end: 6, folder: "music/madrugada/", displayName: "Madrugada txt" },
        { name: "manana", start: 6, end: 12, folder: "music/manana/", displayName: "Telesoft" },
        { name: "tarde", start: 12, end: 16, folder: "music/tarde/", displayName: "Radio 404" },
        { name: "mediatarde", start: 16, end: 20, folder: "music/mediatarde/", displayName: "Floppy Disk" },
        { name: "noche", start: 20, end: 1, folder: "music/noche/", displayName: "Piratas Informaticos" }
    ];
    
    // Buscar el horario actual
    for (let schedule of schedules) {
        let startTime = schedule.start * 60;
        let endTime = schedule.end * 60;
        
        // Manejar horarios que pasan de medianoche (noche: 20-01)
        if (endTime < startTime) {
            endTime += 24 * 60;
            const adjustedCurrentTime = currentTime + (currentTime < startTime ? 24 * 60 : 0);
            if (adjustedCurrentTime >= startTime && adjustedCurrentTime < endTime) {
                return schedule;
            }
        } else {
            if (currentTime >= startTime && currentTime < endTime) {
                return schedule;
            }
        }
    }
    
    // Fallback por si acaso
    return schedules[2]; // "tarde"
}

// === FUNCIÓN PRINCIPAL: Cargar playlist de la carpeta activa (MODIFICADA) ===
function loadSchedulePlaylist() {
    currentSchedule = getCurrentSchedule();
    console.log(`📻 Cambio a: ${currentSchedule.displayName} (${currentSchedule.folder})`);
    
    // Actualizar interfaz
    if (currentShow) currentShow.textContent = isPlaying ? '🔴 EN VIVO' : currentSchedule.displayName;
    if (currentTimeName) currentTimeName.textContent = currentSchedule.displayName;
    if (currentTimeRange) {
        const format = (h) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
        currentTimeRange.textContent = `${format(currentSchedule.start)} - ${format(currentSchedule.end)}`;
    }
    
    // Cargar playlist.json de la carpeta actual
    fetch(currentSchedule.folder + "playlist.json")
        .then(response => response.json())
        .then(data => {
            // Formatear rutas completas
            playlist = (data.tracks || []).map(track => {
                // Si track es un string (nombre de archivo), convertirlo a objeto
                if (typeof track === 'string') {
                    return currentSchedule.folder + track;
                }
                // Si track es un objeto con propiedad 'file'
                return currentSchedule.folder + track.file;
            });
            
            // Fallback si la playlist está vacía
            if (playlist.length === 0) {
                playlist = [
                    currentSchedule.folder + "jazzcartel.mp3",
                    currentSchedule.folder + "andresnewforu.mp3"
                ];
            }
            
            playlistLoaded = true;
            shufflePlaylist();
            loadTrack(0);
            
            // Si estaba reproduciendo, continuar
            if (isPlaying && audio.paused) {
                audio.play().catch(() => playNextTrack());
            }
        })
        .catch(() => {
            // Fallback robusto
            playlist = [
                currentSchedule.folder + "jazzcartel.mp3",
                currentSchedule.folder + "andresnewforu.mp3"
            ];
            playlistLoaded = true;
            shufflePlaylist();
            loadTrack(0);
        });
}

// === TUS FUNCIONES ORIGINALES (PRÁCTICAMENTE INTACTAS) ===
function shufflePlaylist() {
    for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
}

function loadTrack(index) {
    if (!playlistLoaded || index >= playlist.length) return;
    
    currentIndex = index;
    const track = playlist[index];
    
    // Pausar y cargar nueva pista
    audio.pause();
    audio.src = track;
    audio.volume = 1;
    
    // Inicio aleatorio solo en primera canción (IGUAL QUE TU VERSIÓN)
    audio.onloadedmetadata = () => {
        if (isFirstPlay && audio.duration > 60) {
            audio.currentTime = Math.random() * (audio.duration - 60);
            isFirstPlay = false;
        } else {
            audio.currentTime = 0;
        }
    };
    
    // Manejo de errores (IGUAL QUE TU VERSIÓN)
    audio.onended = () => setTimeout(playNextTrack, 500);
    audio.onerror = () => {
        console.error(`❌ Error cargando: ${track}`);
        setTimeout(playNextTrack, 2000);
    };
    
    // Actualizar botón de play/pause
    updatePlayButton();
}

function playNextTrack() {
    if (!playlistLoaded || playlist.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % playlist.length;
    
    // Fade out simple (IGUAL QUE TU VERSIÓN)
    const fadeOut = setInterval(() => {
        if (audio.volume > 0.1) {
            audio.volume -= 0.1;
        } else {
            clearInterval(fadeOut);
            loadTrack(nextIndex);
            audio.play().then(() => {
                isPlaying = true;
                updatePlayButton();
            }).catch(() => playNextTrack());
        }
    }, 50);
}

// === FUNCIONES NUEVAS PARA LA INTERFAZ ===
function updatePlayButton() {
    if (!playPath || !pausePath1 || !pausePath2) return;
    
    if (isPlaying && !audio.paused) {
        playPath.style.opacity = '0';
        pausePath1.style.opacity = '1';
        pausePath2.style.opacity = '1';
        if (playButton) playButton.setAttribute('aria-label', 'Pausar');
    } else {
        playPath.style.opacity = '1';
        pausePath1.style.opacity = '0';
        pausePath2.style.opacity = '0';
        if (playButton) playButton.setAttribute('aria-label', 'Reproducir');
    }
}

function togglePlay() {
    if (!playlistLoaded) return;
    
    if (!isPlaying || audio.paused) {
        if (!audio.src) loadTrack(currentIndex);
        audio.play().then(() => {
            isPlaying = true;
            updatePlayButton();
            if (currentShow) currentShow.textContent = '🔴 EN VIVO';
        }).catch(() => playNextTrack());
    } else {
        audio.pause();
        isPlaying = false;
        updatePlayButton();
        if (currentShow) currentShow.textContent = currentSchedule.displayName;
    }
}

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    // Configurar botón de play/pause (nueva interfaz)
    if (playButton) {
        playButton.addEventListener('click', togglePlay);
    }
    
    // Iniciar con clic en cualquier parte (TU MÉTODO ORIGINAL)
    document.addEventListener('click', () => {
        if (!isPlaying && playlistLoaded) {
            if (!audio.src) loadTrack(currentIndex);
            audio.play().then(() => {
                isPlaying = true;
                updatePlayButton();
                if (currentShow) currentShow.textContent = '🔴 EN VIVO';
            });
        }
    }, { once: true });
    
    // Cargar playlist inicial
    loadSchedulePlaylist();
    
    // Verificar cambio de horario cada minuto
    setInterval(() => {
        const oldScheduleName = currentSchedule ? currentSchedule.name : null;
        const newSchedule = getCurrentSchedule();
        
        if (oldScheduleName !== newSchedule.name) {
            console.log(`🔄 Cambio de horario: ${oldScheduleName} → ${newSchedule.name}`);
            loadSchedulePlaylist();
        }
    }, 60000);
    
    // Monitoreo automático (TU MÉTODO ORIGINAL)
    setInterval(() => {
        if (isPlaying && audio.paused && !audio.ended) {
            audio.play().catch(() => playNextTrack());
        }
    }, 3000);
});

// === Compatibilidad con la nueva interfaz ===
// Esto permite que el botón de compartir funcione si existe
const shareButton = document.getElementById('shareRadioButton');
if (shareButton) {
    shareButton.addEventListener('click', () => {
        const url = 'https://www.txtradio.site';
        navigator.clipboard.writeText(url).then(() => {
            const originalHTML = shareButton.innerHTML;
            shareButton.innerHTML = '✓';
            setTimeout(() => shareButton.innerHTML = originalHTML, 2000);
        });
    });
}
