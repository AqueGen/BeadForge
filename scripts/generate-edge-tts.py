#!/usr/bin/env python3
"""
Edge TTS Audio Generator for BeadForge
=======================================

Uses Microsoft Edge TTS (free, high quality) to generate color audio files.

Requirements:
    pip install edge-tts

Usage:
    python scripts/generate-edge-tts.py           # Generate all
    python scripts/generate-edge-tts.py --lang ru # Russian only
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    print("Error: edge-tts not installed. Run: pip install edge-tts")
    sys.exit(1)

# Color translations
COLORS: Dict[str, Dict[str, str]] = {
    "white": {"ru": "белый", "uk": "білий", "en": "white"},
    "black": {"ru": "чёрный", "uk": "чорний", "en": "black"},
    "red": {"ru": "красный", "uk": "червоний", "en": "red"},
    "green": {"ru": "зелёный", "uk": "зелений", "en": "green"},
    "blue": {"ru": "синий", "uk": "синій", "en": "blue"},
    "yellow": {"ru": "жёлтый", "uk": "жовтий", "en": "yellow"},
    "orange": {"ru": "оранжевый", "uk": "помаранчевий", "en": "orange"},
    "purple": {"ru": "фиолетовый", "uk": "фіолетовий", "en": "purple"},
    "pink": {"ru": "розовый", "uk": "рожевий", "en": "pink"},
    "cyan": {"ru": "голубой", "uk": "блакитний", "en": "cyan"},
    "brown": {"ru": "коричневый", "uk": "коричневий", "en": "brown"},
    "gray": {"ru": "серый", "uk": "сірий", "en": "gray"},
    "silver": {"ru": "серебряный", "uk": "срібний", "en": "silver"},
    "gold": {"ru": "золотой", "uk": "золотий", "en": "gold"},
    "navy": {"ru": "тёмно-синий", "uk": "темно-синій", "en": "navy"},
    "maroon": {"ru": "бордовый", "uk": "бордовий", "en": "maroon"},
}

# Voice IDs for each language (female default)
VOICES: Dict[str, str] = {
    "ru": "ru-RU-SvetlanaNeural",  # Russian female
    "uk": "uk-UA-PolinaNeural",    # Ukrainian female
    "en": "en-US-JennyNeural",     # English female
}

def get_project_root() -> Path:
    """Get project root directory"""
    return Path(__file__).parent.parent

async def generate_audio(text: str, voice: str, output_path: Path) -> bool:
    """Generate audio file using Edge TTS"""
    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(output_path))
        return True
    except Exception as e:
        print(f"Error generating {output_path}: {e}")
        return False

async def generate_all(languages: Optional[List[str]] = None, overwrite: bool = False):
    """Generate all color audio files"""
    if languages is None:
        languages = list(VOICES.keys())

    root = get_project_root()
    generated = 0
    skipped = 0

    print(f"\n{'='*60}")
    print("BeadForge Edge TTS Audio Generator")
    print(f"{'='*60}")
    print(f"Languages: {languages}")
    print(f"Colors: {len(COLORS)}")
    print(f"Overwrite: {overwrite}")
    print(f"{'='*60}\n")

    for lang in languages:
        voice = VOICES.get(lang)
        if not voice:
            print(f"Warning: No voice for language '{lang}'")
            continue

        output_dir = root / "public" / "audio" / "tts" / lang / "female-default"
        output_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n[{lang.upper()}] Using voice: {voice}")

        for color_key, translations in COLORS.items():
            text = translations.get(lang)
            if not text:
                continue

            output_path = output_dir / f"{color_key}.mp3"

            if output_path.exists() and not overwrite:
                print(f"  Skip (exists): {color_key}")
                skipped += 1
                continue

            print(f"  Generating: {color_key} -> '{text}'")
            if await generate_audio(text, voice, output_path):
                generated += 1

    print(f"\n{'='*60}")
    print(f"Complete! Generated: {generated}, Skipped: {skipped}")
    print(f"{'='*60}\n")

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate TTS audio with Edge TTS")
    parser.add_argument("--lang", "-l", action="append", help="Language (ru/uk/en)")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing")
    args = parser.parse_args()

    asyncio.run(generate_all(args.lang, args.overwrite))

if __name__ == "__main__":
    main()
