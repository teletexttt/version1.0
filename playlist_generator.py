#!/usr/bin/env python3
"""
Generador de playlists para Teletext Radio
Analiza archivos MP3 en cada carpeta y genera playlist.json con duraciones
"""

import os
import json
import sys
from pathlib import Path

try:
    import mutagen
    HAS_MUTAGEN = True
except ImportError:
    HAS_MUTAGEN = False
    print("⚠️  Instala mutagen: pip install mutagen")

def get_mp3_duration(filepath):
    """Obtiene duración de archivo MP3 en segundos"""
    if not HAS_MUTAGEN:
        return 300  # Valor por defecto si no hay mutagen
    
    try:
        audio = mutagen.File(filepath)
        if audio is not None:
            return int(audio.info.length)
    except:
        pass
    
    return 300  # 5 minutos por defecto

def generate_playlist_for_folder(folder_path):
    """Genera playlist.json para una carpeta específica"""
    folder = Path(folder_path)
    
    if not folder.exists():
        print(f"❌ Carpeta no existe: {folder}")
        return None
    
    mp3_files = list(folder.glob("*.mp3"))
    
    if not mp3_files:
        print(f"⚠️  No hay archivos MP3 en: {folder}")
        return None
    
    tracks = []
    
    for mp3_file in sorted(mp3_files):
        duration = get_mp3_duration(mp3_file)
        track_info = {
            "file": mp3_file.name,
            "duration": duration
        }
        tracks.append(track_info)
        print(f"  ✓ {mp3_file.name} ({duration}s)")
    
    playlist_data = {
        "tracks": tracks,
        "total_duration": sum(t["duration"] for t in tracks),
        "total_tracks": len(tracks)
    }
    
    return playlist_data

def main():
    print("🎵 Generador de Playlists - Teletext Radio")
    print("=" * 50)
    
    # Definir estructura de carpetas
    music_folders = [
        "music/madrugada",
        "music/manana", 
        "music/tarde",
        "music/mediatarde",
        "music/noche",
        "music/especiales/viernes_20_22",
        "music/especiales/viernes_22_01",
        "music/especiales/sabado_20_22",
        "music/especiales/sabado_22_01"
    ]
    
    # Crear carpetas si no existen
    for folder in music_folders:
        Path(folder).mkdir(parents=True, exist_ok=True)
    
    # Generar playlists para cada carpeta
    playlists_generated = 0
    
    for folder in music_folders:
        print(f"\n📁 Procesando: {folder}/")
        
        playlist_data = generate_playlist_for_folder(folder)
        
        if playlist_data:
            output_file = Path(folder) / "playlist.json"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(playlist_data, f, indent=2, ensure_ascii=False)
            
            print(f"  ✅ playlist.json generado: {len(playlist_data['tracks'])} canciones")
            print(f"  ⏱️  Duración total: {playlist_data['total_duration']}s ({playlist_data['total_duration']//3600}h {(playlist_data['total_duration']%3600)//60}m)")
            playlists_generated += 1
    
    print(f"\n{'='*50}")
    print(f"✅ Proceso completado: {playlists_generated} playlists generadas")
    
    # Instrucciones para crear música de prueba
    print("\n🎧 Para probar localmente, puedes:")
    print("1. Copiar algunos archivos MP3 a las carpetas (ej: music/tarde/)")
    print("2. Ejecutar este script nuevamente")
    print("3. Abrir index.html en el navegador y hacer clic en PLAY")
    
    # Crear archivo de música de prueba si no hay MP3
    if playlists_generated == 0:
        print("\n📝 Creando archivos de prueba...")
        create_test_files()
    
    return 0

def create_test_files():
    """Crea archivos de texto simulando MP3 para prueba"""
    test_folders = ["music/tarde", "music/mañana"]
    
    for folder in test_folders:
        Path(folder).mkdir(parents=True, exist_ok=True)
        
        # Crear archivos de prueba
        for i in range(1, 4):
            test_file = Path(folder) / f"cancion{i}.mp3.txt"
            with open(test_file, 'w') as f:
                f.write(f"Archivo de prueba {i} para {folder}\n")
                f.write(f"Duración simulada: {180 + i*30} segundos\n")
        
        # Crear playlist de prueba
        playlist_data = {
            "tracks": [
                {"file": "cancion1.mp3", "duration": 210},
                {"file": "cancion2.mp3", "duration": 240},
                {"file": "cancion3.mp3", "duration": 270}
            ],
            "total_duration": 720,
            "total_tracks": 3
        }
        
        output_file = Path(folder) / "playlist.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(playlist_data, f, indent=2)
        
        print(f"  ✅ Archivos de prueba creados en: {folder}/")

if __name__ == "__main__":
    sys.exit(main())
