// === TELEtext Radio - Sistema de Horarios (Versión Simplificada) ===

// ---- Estado del reproductor ----
let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let audio = document.getElementById('radioPlayer');
let playlistLoaded = false;
let isFirstPlay = true;

// ---- Estado para horarios ----
let currentSchedule = null;
let lastCheckedHour = -1;

// ---- Elementos de la nueva interfaz ----
const playButton = document.getElementById('radioPlayButton');
const playPath = document.getElementById('playPath');
const pausePath1 = document.getElementById('pausePath1');
const pausePath2 = document.getElementById('pausePath2');
const currentShow = document.getElementById('currentShow');
const currentTimeName = document.getElementById('currentTimeName');
const currentTimeRange = document.getElementById('currentTimeRange');

// === FUNCIÓN: Determinar carpeta según hora ===
function getCurrentSchedule() {
    const now = new Date();
    const argentinaOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const offsetDiff = argentinaOffset + localOffset;
    const argentinaTime = new Date(now.getTime() + offsetDiff * 60000);
    
    const currentHour = argentinaTime.getHours();
    const currentMinute = argentinaTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Si ya verificamos esta hora, no recalcular
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
    
    // Fallback
    return schedules[2]; // "tarde"
}

// === FUNCIÓN: Cargar playlist de la carpeta activa ===
function loadSchedulePlaylist() {
    currentSchedule = getCurrentSchedule();
    console.log(`📻 Carpeta activa: ${currentSchedule.displayName} (${currentSchedule.folder})`);
    
    // Actualizar interfaz
    updateDisplayInfo();
    
    // Cargar playlist.json de la carpeta actual
    fetch(currentSchedule.folder + "playlist.json")
        .then(response => response.json())
        .then(data => {
            // Formatear rutas completas
            playlist = (data.tracks || []).map(track => {
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
            
            // Solo cargar la pista, NO reproducir aún
            loadTrack(0, false);
        })
        .catch(() => {
            // Fallback robusto
            playlist = [
                currentSchedule.folder + "jazzcartel.mp3",
                currentSchedule.folder + "andresnewforu.mp3"
            ];
            playlistLoaded = true;
            shufflePlaylist();
            loadTrack(0, false);
        });
}

// === FUNCIONES DE REPRODUCCIÓN (SIMPLIFICADAS) ===
function shufflePlaylist() {
    for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
}

// Función para cargar una pista (con opción de autoplay)
function loadTrack(index, autoplay = false) {
    if (!playlistLoaded || index >= playlist.length) return;
    
    currentIndex = index;
    const track = playlist[index];
    
    // Pausar ANTES de cambiar la fuente
    audio.pause();
    audio.src = track;
    audio.volume = 1;
    
    // Configurar eventos UNA SOLA VEZ al cargar
    audio.onloadedmetadata = () => {
        if (isFirstPlay && audio.duration > 60) {
            audio.currentTime = Math.random() * (audio.duration - 60);
            isFirstPlay = false;
        } else {
            audio.currentTime = 0;
        }
        
        // Si se solicitó autoplay, reproducir ahora
        if (autoplay) {
            audio.play().then(() => {
                isPlaying = true;
                updatePlayButton();
                if (currentShow) currentShow.textContent = '🔴 EN VIVO';
            }).catch(e => {
                console.error("Error al reproducir:", e);
                // No intentar siguiente canción automáticamente
            });
        }
    };
    
    // Configurar eventos de fin y error
    audio.onended = () => {
        setTimeout(() => playNextTrack(), 500);
    };
    
    audio.onerror = () => {
        console.error(`Error cargando: ${track}`);
        // Esperar más tiempo antes de intentar siguiente
        setTimeout(() => playNextTrack(), 4000);
    };
}

// Función para siguiente pista
function playNextTrack() {
    if (!playlistLoaded || playlist.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % playlist.length;
    loadTrack(nextIndex, true); // Cargar y reproducir automáticamente
}

// === FUNCIONES DE INTERFAZ ===
function updateDisplayInfo() {
    if (!currentSchedule) return;
    
    const displayName = currentSchedule.displayName;
    const statusText = isPlaying ? '🔴 EN VIVO' : displayName;
    
    if (currentShow) currentShow.textContent = statusText;
    if (currentTimeName) currentTimeName.textContent = displayName;
    
    if (currentTimeRange) {
        const format = (h) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
        currentTimeRange.textContent = `${format(currentSchedule.start)} - ${format(currentSchedule.end)}`;
    }
}

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

// Control principal de play/pause
function togglePlay() {
    if (!playlistLoaded) return;
    
    if (!isPlaying || audio.paused) {
        // Si no hay pista cargada, cargar la actual
        if (!audio.src) {
            loadTrack(currentIndex, true);
        } else {
            // Reproducir la pista actual
            audio.play().then(() => {
                isPlaying = true;
                updatePlayButton();
                if (currentShow) currentShow.textContent = '🔴 EN VIVO';
            }).catch(e => {
                console.error("Error al reproducir:", e);
            });
        }
    } else {
        // Pausar
        audio.pause();
        isPlaying = false;
        updatePlayButton();
        if (currentShow) currentShow.textContent = currentSchedule.displayName;
    }
}

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    // Configurar botón de play/pause (ÚNICO control)
    if (playButton) {
        playButton.addEventListener('click', togglePlay);
    }
    
    // Cargar playlist inicial (solo carga, NO reproduce)
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
});

// === Botón de compartir ===
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
