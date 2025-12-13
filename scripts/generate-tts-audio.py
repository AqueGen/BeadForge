#!/usr/bin/env python3
"""
TTS Audio File Generator for BeadForge
=======================================

This script generates pre-recorded audio files for color names in multiple languages.
It uses Google Text-to-Speech (gTTS) by default, but can be adapted for other TTS engines.

Requirements:
    pip install gtts pydub

Usage:
    python generate-tts-audio.py                    # Generate all colors for all languages
    python generate-tts-audio.py --language ru     # Generate only Russian
    python generate-tts-audio.py --colors Red Blue  # Generate specific colors only

Output Structure:
    public/audio/tts/{language}/{voice-folder}/{color}.mp3

Examples:
    public/audio/tts/ru/female-default/red.mp3
    public/audio/tts/uk/female-default/blue.mp3
    public/audio/tts/en/female-default/white.mp3
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Optional

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    print("Warning: gTTS not installed. Run: pip install gtts")

# Color translations matching colorNames.ts
COLOR_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "White": {"ru": "белый", "uk": "білий", "en": "white"},
    "Black": {"ru": "чёрный", "uk": "чорний", "en": "black"},
    "Red": {"ru": "красный", "uk": "червоний", "en": "red"},
    "Green": {"ru": "зелёный", "uk": "зелений", "en": "green"},
    "Blue": {"ru": "синий", "uk": "синій", "en": "blue"},
    "Yellow": {"ru": "жёлтый", "uk": "жовтий", "en": "yellow"},
    "Orange": {"ru": "оранжевый", "uk": "помаранчевий", "en": "orange"},
    "Purple": {"ru": "фиолетовый", "uk": "фіолетовий", "en": "purple"},
    "Pink": {"ru": "розовый", "uk": "рожевий", "en": "pink"},
    "Cyan": {"ru": "голубой", "uk": "блакитний", "en": "cyan"},
    "Brown": {"ru": "коричневый", "uk": "коричневий", "en": "brown"},
    "Gray": {"ru": "серый", "uk": "сірий", "en": "gray"},
    "Silver": {"ru": "серебряный", "uk": "срібний", "en": "silver"},
    "Gold": {"ru": "золотой", "uk": "золотий", "en": "gold"},
    "Navy": {"ru": "тёмно-синий", "uk": "темно-синій", "en": "navy"},
    "Maroon": {"ru": "бордовый", "uk": "бордовий", "en": "maroon"},
    # Extended colors
    "Beige": {"ru": "бежевый", "uk": "бежевий", "en": "beige"},
    "Turquoise": {"ru": "бирюзовый", "uk": "бірюзовий", "en": "turquoise"},
    "Coral": {"ru": "коралловый", "uk": "кораловий", "en": "coral"},
    "Lavender": {"ru": "лавандовый", "uk": "лавандовий", "en": "lavender"},
    "Mint": {"ru": "мятный", "uk": "м'ятний", "en": "mint"},
    "Peach": {"ru": "персиковый", "uk": "персиковий", "en": "peach"},
    "Olive": {"ru": "оливковый", "uk": "оливковий", "en": "olive"},
    "Lime": {"ru": "лаймовый", "uk": "лаймовий", "en": "lime"},
    "Teal": {"ru": "бирюзово-синий", "uk": "синьо-зелений", "en": "teal"},
    "Ivory": {"ru": "слоновая кость", "uk": "слонова кістка", "en": "ivory"},
    "Khaki": {"ru": "хаки", "uk": "хакі", "en": "khaki"},
    "Crimson": {"ru": "малиновый", "uk": "малиновий", "en": "crimson"},
    "Indigo": {"ru": "индиго", "uk": "індиго", "en": "indigo"},
    "Magenta": {"ru": "пурпурный", "uk": "пурпуровий", "en": "magenta"},
    "Violet": {"ru": "фиалковый", "uk": "фіалковий", "en": "violet"},
    "Salmon": {"ru": "лососевый", "uk": "лососевий", "en": "salmon"},
    "Tan": {"ru": "загар", "uk": "засмага", "en": "tan"},
    "Aqua": {"ru": "аква", "uk": "аква", "en": "aqua"},
    "Azure": {"ru": "лазурный", "uk": "лазурний", "en": "azure"},
}

# Modifier translations for color mapping feature
MODIFIER_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "light": {"ru": "светлый", "uk": "світлий", "en": "light"},
    "dark": {"ru": "тёмный", "uk": "темний", "en": "dark"},
    "transparent": {"ru": "прозрачный", "uk": "прозорий", "en": "transparent"},
    "matte": {"ru": "матовый", "uk": "матовий", "en": "matte"},
    "glossy": {"ru": "глянцевый", "uk": "глянцевий", "en": "glossy"},
    "pearl": {"ru": "перламутровый", "uk": "перламутровий", "en": "pearl"},
    "metallic": {"ru": "металлик", "uk": "металік", "en": "metallic"},
    "pastel": {"ru": "пастельный", "uk": "пастельний", "en": "pastel"},
    "bright": {"ru": "яркий", "uk": "яскравий", "en": "bright"},
}

# Event sound translations for cell events feature
# Note: Signal sounds (beep, double-beep, melody) should be actual audio files, not TTS
EVENT_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    # Beading techniques - spoken announcements
    "petlya-pidyomu": {"uk": "петля підйому"},
    "prybavka": {"uk": "прибавка"},
    "ubavka": {"uk": "убавка"},
    "zakriplennya": {"uk": "закріплення"},
    # Attention signal - spoken
    "attention": {"uk": "увага"},
}

# Language to gTTS language code mapping
LANGUAGE_CODES: Dict[str, str] = {
    "ru": "ru",
    "uk": "uk",
    "en": "en",
}

# Voice configurations
VOICE_CONFIGS = [
    {"language": "ru", "folder": "female-default", "tld": "com"},
    {"language": "uk", "folder": "female-default", "tld": "com"},
    {"language": "en", "folder": "female-default", "tld": "com"},
]


def get_project_root() -> Path:
    """Get the project root directory (where package.json is)"""
    script_dir = Path(__file__).parent
    return script_dir.parent


def get_output_dir(language: str, voice_folder: str) -> Path:
    """Get the output directory for audio files"""
    root = get_project_root()
    return root / "public" / "audio" / "tts" / language / voice_folder


def generate_audio_gtts(
    text: str,
    language: str,
    output_path: Path,
    tld: str = "com",
    slow: bool = False
) -> bool:
    """Generate audio file using gTTS"""
    if not GTTS_AVAILABLE:
        print(f"Error: gTTS not available. Install with: pip install gtts")
        return False

    try:
        tts = gTTS(text=text, lang=LANGUAGE_CODES[language], tld=tld, slow=slow)
        tts.save(str(output_path))
        return True
    except Exception as e:
        print(f"Error generating audio for '{text}': {e}")
        return False


def generate_color_audio(
    color_key: str,
    languages: Optional[List[str]] = None,
    voice_configs: Optional[List[dict]] = None,
    overwrite: bool = False
) -> int:
    """Generate audio files for a single color in specified languages"""
    if languages is None:
        languages = list(LANGUAGE_CODES.keys())

    if voice_configs is None:
        voice_configs = VOICE_CONFIGS

    translations = COLOR_TRANSLATIONS.get(color_key)
    if not translations:
        print(f"Warning: No translations found for color '{color_key}'")
        return 0

    generated = 0
    filename = color_key.lower()

    for config in voice_configs:
        lang = config["language"]
        if lang not in languages:
            continue

        text = translations.get(lang)
        if not text:
            print(f"Warning: No {lang} translation for '{color_key}'")
            continue

        output_dir = get_output_dir(lang, config["folder"])
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / f"{filename}.mp3"

        if output_path.exists() and not overwrite:
            print(f"Skipping (exists): {output_path}")
            continue

        print(f"Generating: {output_path} - '{text}'")

        if generate_audio_gtts(text, lang, output_path, config.get("tld", "com")):
            generated += 1

    return generated


def generate_number_audio(
    max_number: int = 100,
    languages: Optional[List[str]] = None,
    voice_configs: Optional[List[dict]] = None,
    overwrite: bool = False
) -> int:
    """Generate audio files for numbers (for grouped format)"""
    if languages is None:
        languages = list(LANGUAGE_CODES.keys())

    if voice_configs is None:
        voice_configs = VOICE_CONFIGS

    generated = 0

    for config in voice_configs:
        lang = config["language"]
        if lang not in languages:
            continue

        output_dir = get_output_dir(lang, config["folder"]) / "numbers"
        output_dir.mkdir(parents=True, exist_ok=True)

        for num in range(1, max_number + 1):
            output_path = output_dir / f"{num}.mp3"

            if output_path.exists() and not overwrite:
                continue

            print(f"Generating number: {output_path} - '{num}'")

            if generate_audio_gtts(str(num), lang, output_path, config.get("tld", "com")):
                generated += 1

    return generated


def generate_modifier_audio(
    modifier_key: str,
    languages: Optional[List[str]] = None,
    voice_configs: Optional[List[dict]] = None,
    overwrite: bool = False
) -> int:
    """Generate audio files for a single modifier in specified languages"""
    if languages is None:
        languages = list(LANGUAGE_CODES.keys())

    if voice_configs is None:
        voice_configs = VOICE_CONFIGS

    translations = MODIFIER_TRANSLATIONS.get(modifier_key)
    if not translations:
        print(f"Warning: No translations found for modifier '{modifier_key}'")
        return 0

    generated = 0
    filename = modifier_key.lower()

    for config in voice_configs:
        lang = config["language"]
        if lang not in languages:
            continue

        text = translations.get(lang)
        if not text:
            print(f"Warning: No {lang} translation for '{modifier_key}'")
            continue

        output_dir = get_output_dir(lang, config["folder"]) / "modifiers"
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / f"{filename}.mp3"

        if output_path.exists() and not overwrite:
            print(f"Skipping (exists): {output_path}")
            continue

        print(f"Generating: {output_path} - '{text}'")

        if generate_audio_gtts(text, lang, output_path, config.get("tld", "com")):
            generated += 1

    return generated


def generate_all_modifiers(
    languages: Optional[List[str]] = None,
    modifiers: Optional[List[str]] = None,
    overwrite: bool = False
) -> int:
    """Generate audio files for all modifiers"""
    if modifiers is None:
        modifiers = list(MODIFIER_TRANSLATIONS.keys())

    generated = 0
    for modifier in modifiers:
        generated += generate_modifier_audio(
            modifier, languages=languages, overwrite=overwrite
        )

    return generated


def get_events_output_dir(language: str) -> Path:
    """Get the output directory for event audio files"""
    root = get_project_root()
    return root / "public" / "audio" / "events" / language


def generate_event_audio(
    event_key: str,
    languages: Optional[List[str]] = None,
    overwrite: bool = False
) -> int:
    """Generate audio files for a single event sound in specified languages"""
    if languages is None:
        languages = ["uk"]  # Events are Ukrainian-only by default

    translations = EVENT_TRANSLATIONS.get(event_key)
    if not translations:
        print(f"Warning: No translations found for event '{event_key}'")
        return 0

    generated = 0

    for lang in languages:
        text = translations.get(lang)
        if not text:
            print(f"Warning: No {lang} translation for event '{event_key}'")
            continue

        output_dir = get_events_output_dir(lang)
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / f"{event_key}.mp3"

        if output_path.exists() and not overwrite:
            print(f"Skipping (exists): {output_path}")
            continue

        print(f"Generating event: {output_path} - '{text}'")

        if generate_audio_gtts(text, lang, output_path, tld="com"):
            generated += 1

    return generated


def generate_all_events(
    languages: Optional[List[str]] = None,
    events: Optional[List[str]] = None,
    overwrite: bool = False
) -> int:
    """Generate audio files for all event sounds"""
    if events is None:
        events = list(EVENT_TRANSLATIONS.keys())

    generated = 0
    for event in events:
        generated += generate_event_audio(
            event, languages=languages, overwrite=overwrite
        )

    return generated


def generate_all_audio(
    languages: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    include_numbers: bool = True,
    include_modifiers: bool = True,
    include_events: bool = True,
    overwrite: bool = False
) -> Dict[str, int]:
    """Generate all audio files"""
    if colors is None:
        colors = list(COLOR_TRANSLATIONS.keys())

    stats = {"colors": 0, "numbers": 0, "modifiers": 0, "events": 0}

    print(f"\n{'='*60}")
    print("BeadForge TTS Audio Generator")
    print(f"{'='*60}")
    print(f"Languages: {languages or 'all'}")
    print(f"Colors: {len(colors)}")
    print(f"Include numbers: {include_numbers}")
    print(f"Include modifiers: {include_modifiers}")
    print(f"Include events: {include_events}")
    print(f"Overwrite existing: {overwrite}")
    print(f"{'='*60}\n")

    # Generate color audio
    print("Generating color audio files...")
    for color in colors:
        stats["colors"] += generate_color_audio(
            color, languages=languages, overwrite=overwrite
        )

    # Generate number audio
    if include_numbers:
        print("\nGenerating number audio files...")
        stats["numbers"] = generate_number_audio(
            max_number=100, languages=languages, overwrite=overwrite
        )

    # Generate modifier audio
    if include_modifiers:
        print("\nGenerating modifier audio files...")
        stats["modifiers"] = generate_all_modifiers(
            languages=languages, overwrite=overwrite
        )

    # Generate event audio
    if include_events:
        print("\nGenerating event audio files...")
        stats["events"] = generate_all_events(
            languages=["uk"],  # Events are Ukrainian-only
            overwrite=overwrite
        )

    print(f"\n{'='*60}")
    print(f"Generation complete!")
    print(f"Colors generated: {stats['colors']}")
    print(f"Numbers generated: {stats['numbers']}")
    print(f"Modifiers generated: {stats['modifiers']}")
    print(f"Events generated: {stats['events']}")
    print(f"{'='*60}\n")

    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Generate TTS audio files for BeadForge",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    parser.add_argument(
        "--language", "-l",
        choices=["ru", "uk", "en"],
        action="append",
        help="Language to generate (can be used multiple times)"
    )

    parser.add_argument(
        "--colors", "-c",
        nargs="+",
        help="Specific colors to generate (default: all)"
    )

    parser.add_argument(
        "--no-numbers",
        action="store_true",
        help="Skip generating number audio files"
    )

    parser.add_argument(
        "--no-modifiers",
        action="store_true",
        help="Skip generating modifier audio files"
    )

    parser.add_argument(
        "--modifiers-only",
        action="store_true",
        help="Generate only modifier audio files"
    )

    parser.add_argument(
        "--events-only",
        action="store_true",
        help="Generate only event audio files (techniques, attention)"
    )

    parser.add_argument(
        "--no-events",
        action="store_true",
        help="Skip generating event audio files"
    )

    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing audio files"
    )

    parser.add_argument(
        "--list-colors",
        action="store_true",
        help="List all available color names and exit"
    )

    parser.add_argument(
        "--list-modifiers",
        action="store_true",
        help="List all available modifier names and exit"
    )

    parser.add_argument(
        "--list-events",
        action="store_true",
        help="List all available event sound names and exit"
    )

    args = parser.parse_args()

    if args.list_colors:
        print("Available colors:")
        for color in sorted(COLOR_TRANSLATIONS.keys()):
            trans = COLOR_TRANSLATIONS[color]
            print(f"  {color}: ru='{trans['ru']}', uk='{trans['uk']}', en='{trans['en']}'")
        return

    if args.list_modifiers:
        print("Available modifiers:")
        for modifier in sorted(MODIFIER_TRANSLATIONS.keys()):
            trans = MODIFIER_TRANSLATIONS[modifier]
            print(f"  {modifier}: ru='{trans['ru']}', uk='{trans['uk']}', en='{trans['en']}'")
        return

    if args.list_events:
        print("Available event sounds:")
        for event in sorted(EVENT_TRANSLATIONS.keys()):
            trans = EVENT_TRANSLATIONS[event]
            print(f"  {event}: uk='{trans.get('uk', 'N/A')}'")
        return

    if not GTTS_AVAILABLE:
        print("\nError: gTTS is required but not installed.")
        print("Install it with: pip install gtts")
        print("\nAlternatively, you can use other TTS engines:")
        print("  - Edge TTS: pip install edge-tts")
        print("  - AWS Polly: pip install boto3")
        print("  - Azure Speech: pip install azure-cognitiveservices-speech")
        sys.exit(1)

    # Handle --modifiers-only flag
    if args.modifiers_only:
        print("\nGenerating modifier audio files only...")
        generated = generate_all_modifiers(
            languages=args.language,
            overwrite=args.overwrite
        )
        print(f"\nModifiers generated: {generated}")
        return

    # Handle --events-only flag
    if args.events_only:
        print("\nGenerating event audio files only...")
        generated = generate_all_events(
            languages=["uk"],  # Events are Ukrainian-only
            overwrite=args.overwrite
        )
        print(f"\nEvents generated: {generated}")
        return

    generate_all_audio(
        languages=args.language,
        colors=args.colors,
        include_numbers=not args.no_numbers,
        include_modifiers=not args.no_modifiers,
        include_events=not args.no_events,
        overwrite=args.overwrite
    )


if __name__ == "__main__":
    main()
