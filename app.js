// TELEtext RADIO - Sistema de Radio en Vivo Simulado
// Archivo: app.js (VERSIÓN CORREGIDA - Audio Real)

console.log('📻 Teletext Radio - Inicializando...');

// ===== ELEMENTOS DEL DOM =====
const audioPlayer = document.getElementById('radioPlayer');
const playButton = document.getElementById('radioPlayButton');
const shareButton = document.getElementById('shareRadioButton');
const playPath = document.getElementById('playPath');
const pausePath1 = document.getElementById('pausePath1');
const pausePath2 = document.getElementById('pausePath2');
const currentShow = document.getElementById('currentShow');
const currentTimeName = document.getElementById('currentTimeName');
const currentTimeRange = document.getElementById('currentTimeRange');

// ===== VARIABLES DE ESTADO =====
let isPlaying = false;
let currentPlaylist = [];
let currentTrackIndex = 0;
let currentSchedule = null;

// ===== CONFIGURACIÓN DE HORARIOS (RUTAS CORREGIDAS) =====
const scheduleConfig = {
    "timeZone": "America/Argentina/Buenos_Aires",
    "schedules": [
        {
            "name": "madrugada",
            "displayName": "Madrugada txt",
            "start": "01:00",
            "end": "06:00",
            "folder": "music/madrugada/",
            "startHour": 1
        },
        {
            "name": "manana",      // CORREGIDO: Sin 'ñ'
            "displayName": "Telesoft",
            "start": "06:00",
            "end": "12:00",
            "folder": "music/manana/", // CORREGIDO: Sin 'ñ'
            "startHour": 6
        },
        {
            "name": "tarde",
            "displayName": "Radio 404",
            "start": "12:00",
            "end": "16:00",
            "folder": "music/tarde/",
            "startHour": 12
        },
        {
            "name": "mediatarde",
            "displayName": "Floppy Disk",
            "start": "16:00",
            "end": "20:00",
            "folder": "music/mediatarde/",
            "startHour": 16
        },
        {
            "name": "noche",
            "displayName": "Piratas Informaticos",
            "start": "20:00",
            "end": "01:00",
            "folder": "music/noche/",
            "startHour": 20
        }
    ],
    "specialSchedules": [
        {
            "days": [5],
            "name": "viernes_20_22",
            "displayName": "Trasnoche Teletext",
            "start": "20:00",
            "end": "22:00",
            "folder": "music/especiales/viernes_20_22/",
            "startHour": 20
        },
        {
            "days": [5],
            "name": "viernes_22_01",
            "displayName": "Trasnoche Teletext",
            "start": "22:00",
            "end": "01:00",
            "folder": "music/especiales/viernes_22_01/",
            "startHour": 22
        },
        {
            "days": [6],
            "name": "sabado_20_22",
            "displayName": "Trasnoche Teletext",
            "start": "20:00",
            "end": "22:00",
            "folder": "music/especiales/sabado_20_22/",
            "startHour": 20
        },
        {
            "days": [6],
            "name": "sabado_22_01",
            "displayName": "Trasnoche Teletext",
            "start": "22:00",
            "end": "01:00",
            "folder": "music/especiales/sabado_22_01/",
            "startHour": 22
        }
    ]
};

// ===== FUNCIONES BÁSICAS =====
function getArgentinaTime() {
    const now = new Date();
    const argentinaOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const offsetDiff = argentinaOffset + localOffset;
    return new Date(now.getTime() + offsetDiff * 60000);
}

function formatTimeForDisplay(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function getCurrentSchedule() {
    const now = getArgentinaTime();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Primero verificar horarios especiales (viernes y sábado)
    if (currentDay === 5 || currentDay === 6) {
        for (const special of scheduleConfig.specialSchedules) {
            if (special.days.includes(currentDay)) {
                const startTime = parseInt(special.start.split(':')[0]) * 60 + parseInt(special.start.split(':')[1]);
                let endTime = parseInt(special.end.split(':')[0]) * 60 + parseInt(special.end.split(':')[1]);
                
                if (endTime < startTime) {
                    endTime += 24 * 60;
                    const adjustedCurrentTime = currentTime + (currentTime < startTime ? 24 * 60 : 0);
                    if (adjustedCurrentTime >= startTime && adjustedCurrentTime < endTime) {
                        return special;
                    }
                } else {
                    if (currentTime >= startTime && currentTime < endTime) {
                        return special;
                    }
                }
            }
        }
    }
    
    // Si no es horario especial, usar horarios regulares
    for (const regular of scheduleConfig.schedules) {
        const startTime = parseInt(regular.start.split(':')[0]) * 60 + parseInt(regular.start.split(':')[1]);
        let endTime = parseInt(regular.end.split(':')[0]) * 60 + parseInt(regular.end.split(':')[1]);
        
        if (endTime < startTime) {
            endTime += 24 * 60;
            const adjustedCurrentTime = currentTime + (currentTime < startTime ? 24 * 60 : 0);
            if (adjustedCurrentTime >= startTime && adjustedCurrentTime < endTime) {
                return regular;
            }
        } else {
            if (currentTime >= startTime && currentTime < endTime) {
                return regular;
            }
        }
    }
    
    return scheduleConfig.schedules[0];
}

// ===== FUNCIONES DE REPRODUCCIÓN DE AUDIO REAL =====
async function loadCurrentPlaylist() {
    currentSchedule = getCurrentSchedule();
    
    try {
        const response = await fetch(currentSchedule.folder + 'playlist.json');
        if (!response.ok) throw new Error('No se encontró playlist.json');
        
        const data = await response.json();
        currentPlaylist = data.tracks || [];
        
        if (currentPlaylist.length === 0) {
            // Playlist vacía: usar fallback
            console.log('ℹ️ Playlist vacía, usando canción de fallback');
            currentPlaylist = [{file: "fallback.mp3", duration: 300}];
        }
    } catch (error) {
        console.log('⚠️ Error cargando playlist:', error.message);
        // Fallback robusto si no hay playlist
        currentPlaylist = [{file: "fallback.mp3", duration: 300}];
    }
    
    console.log(`✅ Playlist cargada para: ${currentSchedule.displayName}`);
}

function playCurrentTrack() {
    if (currentPlaylist.length === 0) {
        console.log('⏸️ No hay canciones en la playlist');
        return;
    }
    
    const track = currentPlaylist[currentTrackIndex];
    const audioPath = currentSchedule.folder + track.file;
    
    console.log(`🎵 Intentando reproducir: ${audioPath}`);
    
    // Detener reproducción anterior y establecer nueva fuente
    audioPlayer.pause();
    audioPlayer.src = audioPath;
    audioPlayer.volume = 0.8;
    
    // Intentar reproducir
    const playPromise = audioPlayer.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            isPlaying = true;
            updatePlayButton();
            console.log("✅ Reproducción iniciada correctamente");
        }).catch(error => {
            console.error('❌ Error al reproducir:', error);
            // Intentar siguiente canción si falla
            setTimeout(playNextTrack, 2000);
        });
    }
}

function playNextTrack() {
    if (currentPlaylist.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    playCurrentTrack();
}

function togglePlay() {
    if (!isPlaying) {
        // Si es la primera vez, cargar playlist y empezar
        if (currentPlaylist.length === 0) {
            loadCurrentPlaylist().then(() => {
                playCurrentTrack();
            });
        } else {
            playCurrentTrack();
        }
    } else {
        audioPlayer.pause();
        isPlaying = false;
        updatePlayButton();
    }
}

// ===== INTERFAZ DE USUARIO =====
function updateDisplayInfo() {
    if (!currentSchedule) {
        currentSchedule = getCurrentSchedule();
    }
    
    const displayName = currentSchedule.displayName;
    
    if (currentShow) {
        currentShow.textContent = isPlaying ? '🔴 EN VIVO' : displayName;
    }
    
    if (currentTimeName) {
        currentTimeName.textContent = displayName;
    }
    
    if (currentTimeRange) {
        currentTimeRange.textContent = `${formatTimeForDisplay(currentSchedule.start)} - ${formatTimeForDisplay(currentSchedule.end)}`;
    }
}

function updatePlayButton() {
    if (!playPath || !pausePath1 || !pausePath2) return;
    
    if (isPlaying) {
        playPath.setAttribute('opacity', '0');
        pausePath1.setAttribute('opacity', '1');
        pausePath2.setAttribute('opacity', '1');
        if (playButton) playButton.setAttribute('aria-label', 'Pausar');
    } else {
        playPath.setAttribute('opacity', '1');
        pausePath1.setAttribute('opacity', '0');
        pausePath2.setAttribute('opacity', '0');
        if (playButton) playButton.setAttribute('aria-label', 'Reproducir');
    }
}

function shareRadio() {
    const url = 'https://www.txtradio.site';
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            if (!shareButton) return;
            
            const originalHTML = shareButton.innerHTML;
            shareButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            shareButton.style.borderColor = '#00FF37';
            shareButton.style.color = '#00FF37';
            shareButton.title = '¡Enlace copiado!';
            
            setTimeout(() => {
                shareButton.innerHTML = originalHTML;
                shareButton.style.borderColor = '';
                shareButton.style.color = '';
                shareButton.title = 'Copiar enlace';
            }, 2000);
        }).catch(err => {
            console.log('ℹ️ No se pudo copiar el enlace:', err);
        });
    }
}

// ===== INICIALIZACIÓN =====
function init() {
    console.log('🎯 Iniciando sistema de radio...');
    
    // Configurar controles
    if (playButton) {
        playButton.addEventListener('click', togglePlay);
    }
    
    if (shareButton) {
        shareButton.addEventListener('click', shareRadio);
    }
    
    // Configurar eventos del reproductor de audio
    if (audioPlayer) {
        audioPlayer.addEventListener('ended', playNextTrack);
        audioPlayer.addEventListener('error', function(e) {
            console.error('❌ Error en el elemento de audio:', e);
            setTimeout(playNextTrack, 3000);
        });
    }
    
    // Cargar playlist inicial y mostrar información
    loadCurrentPlaylist().then(() => {
        updateDisplayInfo();
    });
    
    // Verificar cambios de horario cada minuto
    setInterval(() => {
        const oldScheduleName = currentSchedule ? currentSchedule.name : null;
        currentSchedule = getCurrentSchedule();
        
        if (oldScheduleName !== currentSchedule.name) {
            console.log(`🔄 Cambio de horario detectado: ${oldScheduleName} → ${currentSchedule.name}`);
            updateDisplayInfo();
            
            if (isPlaying) {
                console.log('🔄 Recargando playlist por cambio de horario...');
                loadCurrentPlaylist().then(() => {
                    currentTrackIndex = 0;
                    playCurrentTrack();
                });
            }
        }
    }, 60000);
    
    console.log('✅ Sistema de radio listo');
}

// ===== EJECUCIÓN =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
