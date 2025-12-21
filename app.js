// TELEtext RADIO - Sistema con simulación EN VIVO
// Archivo: app.js
// Compatible con: 01.html (tu estructura original)

console.log('📻 Teletext Radio - Modo EN VIVO inicializando...');

// ===== ELEMENTOS DEL DOM (usando tus IDs exactos) =====
const audio = document.getElementById('radioPlayer');
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
let currentPlaylist = []; // Formato: [{file: "track.mp3", duration: 300}, ...]
let currentSchedule = null;
let nextTrackTimeout = null;
let isAudioLoading = false; // NUEVO: Evita múltiples cargas simultáneas

// ===== DATOS DE HORARIOS (igual a tu HTML) =====
const programNames = {
    "madrugada": "Madrugada txt",
    "mañana": "Telesoft", 
    "tarde": "Radio 404",
    "mediatarde": "Floppy Disk",
    "noche": "Piratas Informaticos",
    "viernes_20_22": "Trasnoche Teletext",
    "viernes_22_01": "Trasnoche Teletext",
    "sabado_20_22": "Trasnoche Teletext",
    "sabado_22_01": "Trasnoche Teletext"
};

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
            "name": "mañana",
            "displayName": "Telesoft",
            "start": "06:00",
            "end": "12:00",
            "folder": "music/mañana/",
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

// ===== NÚCLEO DE SIMULACIÓN EN VIVO =====

function getSecondsIntoCurrentBlock(schedule) {
    const now = getArgentinaTime();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    const currentTotalSeconds = (currentHour * 3600) + (currentMinute * 60) + currentSecond;
    const startTotalSeconds = schedule.startHour * 3600;
    
    let secondsIntoBlock;
    if (schedule.startHour > currentHour && schedule.startHour >= 20) {
        secondsIntoBlock = currentTotalSeconds + (24 * 3600) - startTotalSeconds;
    } else {
        secondsIntoBlock = currentTotalSeconds - startTotalSeconds;
    }
    
    return Math.max(0, secondsIntoBlock);
}

function calculateLiveStartPosition() {
    if (currentPlaylist.length === 0) {
        return { trackIndex: 0, startSeconds: 0 };
    }
    
    const secondsIntoBlock = getSecondsIntoCurrentBlock(currentSchedule);
    console.log(`⏱️ Segundos en bloque: ${secondsIntoBlock}s`);
    
    let totalDuration = 0;
    for (const track of currentPlaylist) {
        totalDuration += track.duration || 300;
    }
    
    if (totalDuration === 0) {
        return { trackIndex: 0, startSeconds: 0 };
    }
    
    const cyclicPosition = secondsIntoBlock % totalDuration;
    console.log(`🎯 Posición en lista: ${cyclicPosition}s/${totalDuration}s`);
    
    let accumulatedTime = 0;
    for (let i = 0; i < currentPlaylist.length; i++) {
        const trackDuration = currentPlaylist[i].duration || 300;
        
        if (cyclicPosition < accumulatedTime + trackDuration) {
            const startSeconds = cyclicPosition - accumulatedTime;
            console.log(`🎵 Canción ${i+1}: inicio en segundo ${Math.round(startSeconds)}`);
            return { trackIndex: i, startSeconds: startSeconds };
        }
        
        accumulatedTime += trackDuration;
    }
    
    return { trackIndex: 0, startSeconds: 0 };
}

// ===== CARGA DE PLAYLIST =====

async function loadCurrentPlaylist() {
    currentSchedule = getCurrentSchedule();
    
    try {
        const response = await fetch(`${currentSchedule.folder}playlist.json`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
                currentPlaylist = data.tracks;
                console.log(`✅ Playlist cargada: ${currentPlaylist.length} canciones`);
                return true;
            }
        }
        
        // Fallback si no hay playlist.json
        currentPlaylist = [{file: "emergency.mp3", duration: 300}];
        console.log('⚠️ Usando playlist de emergencia');
        return false;
        
    } catch (error) {
        console.error('❌ Error cargando playlist:', error);
        currentPlaylist = [{file: "emergency.mp3", duration: 300}];
        return false;
    }
}

// ===== CONTROL DE REPRODUCCIÓN (CORREGIDO PARA AbortError) =====

function playLiveSimulation() {
    if (currentPlaylist.length === 0 || isAudioLoading) {
        console.warn('⚠️ No hay canciones o audio ya cargando');
        return;
    }
    
    isAudioLoading = true; // Bloquear nuevas cargas
    
    const { trackIndex, startSeconds } = calculateLiveStartPosition();
    const track = currentPlaylist[trackIndex];
    const trackUrl = currentSchedule.folder + track.file;
    
    console.log(`🎵 Simulación EN VIVO: ${track.file} (seg. ${Math.round(startSeconds)})`);
    
    // 1. Detener audio actual si está reproduciendo
    if (!audio.paused) {
        audio.pause();
    }
    
    // 2. Resetear tiempo
    audio.currentTime = 0;
    
    // 3. Limpiar eventos anteriores
    audio.onloadeddata = null;
    audio.onerror = null;
    
    // 4. Cambiar fuente
    audio.src = trackUrl;
    
    // 5. Esperar a que cargue
    audio.onloadeddata = () => {
        console.log(`✅ Audio cargado: ${track.file}`);
        audio.currentTime = startSeconds;
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                isAudioLoading = false; // Desbloquear
                updatePlayButton();
                updateDisplayInfo();
                console.log("▶️ Reproduciendo (modo EN VIVO)");
                
                scheduleNextTrack(track.duration || 300, startSeconds);
            }).catch(error => {
                console.error('❌ Error en play():', error);
                isAudioLoading = false; // Desbloquear si falla
                
                // Si es AbortError, esperar más tiempo
                if (error.name === 'AbortError') {
                    console.log('⏳ AbortError, reintentando en 3s...');
                    setTimeout(() => {
                        if (!isPlaying) {
                            playLiveSimulation();
                        }
                    }, 3000);
                } else {
                    setTimeout(() => playNextTrack(), 3000);
                }
            });
        }
        
        audio.onloadeddata = null; // Limpiar evento
    };
    
    // Manejar error de carga
    audio.onerror = (error) => {
        console.error('❌ Error cargando audio:', error);
        isAudioLoading = false;
        
        // Intentar siguiente canción
        setTimeout(() => {
            if (currentPlaylist.length > 1) {
                // Mover esta canción al final y usar la siguiente
                const failedTrack = currentPlaylist.splice(trackIndex, 1)[0];
                currentPlaylist.push(failedTrack);
                console.log(`🔄 Moviendo ${track.file} al final de la lista`);
            }
            playNextTrack();
        }, 3000);
    };
}

function scheduleNextTrack(trackDuration, startSeconds) {
    if (nextTrackTimeout) {
        clearTimeout(nextTrackTimeout);
    }
    
    const timeUntilNextTrack = (trackDuration - startSeconds) * 1000;
    console.log(`⏳ Siguiente canción en: ${Math.round(timeUntilNextTrack/1000)}s`);
    
    nextTrackTimeout = setTimeout(() => {
        if (isPlaying) {
            playNextTrack();
        }
    }, timeUntilNextTrack);
}

function playNextTrack() {
    if (currentPlaylist.length === 0 || isAudioLoading) {
        console.log('⏸️ No hay canciones o audio cargando');
        return;
    }
    
    isAudioLoading = true;
    
    // Encontrar índice actual
    let currentTrackIndex = 0;
    if (audio.src && audio.src.includes('/')) {
        const currentSrc = audio.src.split('/').pop();
        currentTrackIndex = currentPlaylist.findIndex(t => t.file === currentSrc);
        if (currentTrackIndex === -1) currentTrackIndex = 0;
    }
    
    const nextIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    
    console.log(`⏭️ Siguiente canción: ${nextIndex + 1}/${currentPlaylist.length}`);
    
    const track = currentPlaylist[nextIndex];
    const trackUrl = currentSchedule.folder + track.file;
    
    // 1. Detener actual
    if (!audio.paused) {
        audio.pause();
    }
    
    // 2. Resetear
    audio.currentTime = 0;
    
    // 3. Limpiar eventos
    audio.onloadeddata = null;
    audio.onerror = null;
    
    // 4. Cambiar fuente
    audio.src = trackUrl;
    
    // 5. Esperar carga
    audio.onloadeddata = () => {
        console.log(`✅ Siguiente audio cargado: ${track.file}`);
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isAudioLoading = false;
                console.log(`▶️ Reproduciendo siguiente: ${track.file}`);
                scheduleNextTrack(track.duration || 300, 0);
            }).catch(error => {
                console.error('❌ Error en playNextTrack:', error);
                isAudioLoading = false;
                
                if (error.name === 'AbortError') {
                    console.log('⏳ AbortError en siguiente, reintentando...');
                    setTimeout(() => {
                        // Saltar esta canción problemática
                        const problemTrack = currentPlaylist.splice(nextIndex, 1)[0];
                        currentPlaylist.push(problemTrack);
                        console.log(`🔄 Saltando ${track.file}, moviendo al final`);
                        playNextTrack();
                    }, 3000);
                } else {
                    setTimeout(() => playNextTrack(), 3000);
                }
            });
        }
        
        audio.onloadeddata = null;
    };
    
    audio.onerror = (error) => {
        console.error('❌ Error cargando siguiente canción:', error);
        isAudioLoading = false;
        
        // Saltar esta canción problemática
        if (currentPlaylist.length > 1) {
            const problemTrack = currentPlaylist.splice(nextIndex, 1)[0];
            currentPlaylist.push(problemTrack);
            console.log(`🔄 ${track.file} movida al final por error`);
        }
        
        setTimeout(() => playNextTrack(), 3000);
    };
}

function togglePlay() {
    if (isPlaying) {
        // Pausar
        audio.pause();
        isPlaying = false;
        updatePlayButton();
        updateDisplayInfo();
        
        if (nextTrackTimeout) {
            clearTimeout(nextTrackTimeout);
            nextTrackTimeout = null;
        }
        
        console.log('⏸️ Pausado por usuario');
    } else {
        // Reproducir
        if (currentPlaylist.length === 0) {
            loadCurrentPlaylist().then((success) => {
                if (success && currentPlaylist.length > 0) {
                    playLiveSimulation();
                } else {
                    console.error('❌ No se pudo cargar playlist');
                }
            });
        } else {
            playLiveSimulation();
        }
    }
}

// ===== INTERFAZ DE USUARIO =====

function updateDisplayInfo() {
    if (!currentSchedule) {
        currentSchedule = getCurrentSchedule();
    }
    
    const displayName = currentSchedule.displayName || programNames[currentSchedule.name] || currentSchedule.name;
    
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
            console.error('Error al copiar:', err);
        });
    }
}

// ===== INICIALIZACIÓN =====

function init() {
    console.log('🎯 Iniciando sistema EN VIVO...');
    
    // Configurar audio
    if (audio) {
        audio.volume = 0.8;
        audio.preload = 'auto'; // Mejorar carga
        audio.crossOrigin = 'anonymous';
        
        // Eventos de audio simplificados
        audio.addEventListener('play', () => {
            isPlaying = true;
            updatePlayButton();
            updateDisplayInfo();
            console.log('▶️ Audio event: play');
        });
        
        audio.addEventListener('pause', () => {
            isPlaying = false;
            updatePlayButton();
            updateDisplayInfo();
            console.log('⏸️ Audio event: pause');
        });
        
        audio.addEventListener('ended', () => {
            console.log('✅ Audio event: ended');
            // No hacer nada, scheduleNextTrack ya maneja esto
        });
        
        audio.addEventListener('error', (e) => {
            console.error('❌ Audio event: error', audio.error);
            // No reintentar automáticamente, ya se maneja en playNextTrack
        });
    }
    
    // Configurar controles
    if (playButton) {
        playButton.addEventListener('click', togglePlay);
    }
    
    if (shareButton) {
        shareButton.addEventListener('click', shareRadio);
    }
    
    // Iniciar con clic en página (opcional, descomenta si lo quieres)
    /*
    document.addEventListener('click', (e) => {
        if (playButton && e.target !== playButton && !isPlaying && !isAudioLoading) {
            console.log('🖱️ Clic en página, iniciando radio...');
            playButton.click();
        }
    }, { once: true });
    */
    
    // Cargar playlist inicial y configurar actualizaciones
    loadCurrentPlaylist().then(() => {
        updateDisplayInfo();
        
        // Verificar cambios de horario cada minuto
        setInterval(() => {
            const oldScheduleName = currentSchedule ? currentSchedule.name : null;
            currentSchedule = getCurrentSchedule();
            
            if (oldScheduleName !== currentSchedule.name) {
                console.log(`🔄 Cambio de horario: ${oldScheduleName} → ${currentSchedule.name}`);
                updateDisplayInfo();
                
                if (isPlaying) {
                    console.log('🔄 Recargando playlist por cambio de horario...');
                    loadCurrentPlaylist().then(() => {
                        if (!isAudioLoading) {
                            playLiveSimulation();
                        }
                    });
                }
            }
        }, 60000);
        
        // Actualizar display cada minuto
        setInterval(updateDisplayInfo, 60000);
    });
    
    console.log('✅ Sistema EN VIVO listo para usar');
}

// ===== HERRAMIENTAS DE DEBUG =====

window.debugRadio = {
    forceSchedule: async function(scheduleName) {
        console.log(`🧪 DEBUG: Forzando horario ${scheduleName}`);
        
        const folders = {
            'madrugada': 'music/madrugada/',
            'mañana': 'music/mañana/',
            'tarde': 'music/tarde/',
            'mediatarde': 'music/mediatarde/',
            'noche': 'music/noche/',
            'viernes_20_22': 'music/especiales/viernes_20_22/',
            'viernes_22_01': 'music/especiales/viernes_22_01/',
            'sabado_20_22': 'music/especiales/sabado_20_22/',
            'sabado_22_01': 'music/especiales/sabado_22_01/'
        };
        
        const folder = folders[scheduleName] || 'music/tarde/';
        currentSchedule = {
            name: scheduleName,
            folder: folder,
            displayName: scheduleName,
            startHour: scheduleName.includes('madrugada') ? 1 : 
                      scheduleName.includes('mañana') ? 6 :
                      scheduleName.includes('tarde') ? 12 :
                      scheduleName.includes('mediatarde') ? 16 : 20
        };
        
        await loadCurrentPlaylist();
        
        if (currentShow && !isPlaying) {
            currentShow.textContent = scheduleName;
        }
        
        console.log(`✅ Horario forzado: ${scheduleName}`);
    },
    
    playNow: function() {
        if (playButton) {
            playButton.click();
        }
    },
    
    nextSong: function() {
        playNextTrack();
    },
    
    showInfo: function() {
        console.log('=== DEBUG INFO ===');
        console.log('Reproduciendo:', isPlaying);
        console.log('Cargando audio:', isAudioLoading);
        console.log('Playlist:', currentPlaylist.length, 'canciones');
        console.log('Horario actual:', currentSchedule ? currentSchedule.name : 'N/A');
        console.log('Audio src:', audio.src);
        console.log('Audio tiempo:', audio.currentTime);
        console.log('Audio duración:', audio.duration);
        console.log('Audio estado:', audio.paused ? 'pausado' : 'reproduciendo');
        
        const secondsIntoBlock = currentSchedule ? getSecondsIntoCurrentBlock(currentSchedule) : 0;
        console.log('Segundos en bloque:', secondsIntoBlock);
    },
    
    resetAudio: function() {
        console.log('🔄 DEBUG: Reiniciando audio');
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audio.src = '';
            isPlaying = false;
            isAudioLoading = false;
            updatePlayButton();
            updateDisplayInfo();
            
            if (nextTrackTimeout) {
                clearTimeout(nextTrackTimeout);
                nextTrackTimeout = null;
            }
        }
    }
};

// ===== EJECUCIÓN =====

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('📻 Teletext Radio - Sistema EN VIVO cargado');