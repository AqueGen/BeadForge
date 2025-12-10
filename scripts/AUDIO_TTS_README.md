# Audio TTS Generation Guide

This guide explains how to generate and manage pre-recorded audio files for BeadForge's Text-to-Speech feature.

## Quick Start

1. Install Python dependencies:
   ```bash
   pip install gtts pydub
   ```

2. Generate all audio files:
   ```bash
   python scripts/generate-tts-audio.py
   ```

## Directory Structure

```
public/audio/tts/
├── ru/
│   └── female-default/
│       ├── white.mp3
│       ├── black.mp3
│       ├── red.mp3
│       └── numbers/
│           ├── 1.mp3
│           ├── 2.mp3
│           └── ...
├── uk/
│   └── female-default/
│       └── ...
└── en/
    └── female-default/
        └── ...
```

## Adding New Colors

1. Add the color to `src/lib/tts/colorNames.ts`:
   ```typescript
   export const COLOR_TRANSLATIONS: ColorTranslations = {
     // ...existing colors
     MyNewColor: {
       ru: 'мой новый цвет',
       uk: 'мій новий колір',
       en: 'my new color',
     },
   };
   ```

2. Add to `src/lib/tts/audioTTS.ts`:
   ```typescript
   const COLOR_AUDIO_FILES: Record<string, string> = {
     // ...existing colors
     MyNewColor: 'mynewcolor',
   };
   ```

3. Add to `scripts/generate-tts-audio.py`:
   ```python
   COLOR_TRANSLATIONS = {
       # ...existing colors
       "MyNewColor": {"ru": "мой новый цвет", "uk": "мій новий колір", "en": "my new color"},
   }
   ```

4. Generate the new audio:
   ```bash
   python scripts/generate-tts-audio.py --colors MyNewColor
   ```

## Adding New Voice Variations

### Adding a Male Voice

1. Create voice folder:
   ```bash
   mkdir -p public/audio/tts/ru/male-default
   mkdir -p public/audio/tts/uk/male-default
   mkdir -p public/audio/tts/en/male-default
   ```

2. Add voice config to `src/lib/tts/audioTTS.ts`:
   ```typescript
   export const AUDIO_VOICES: AudioVoiceConfig[] = [
     // ...existing voices
     {
       id: 'ru-male-default',
       name: 'Дмитрий',
       language: 'ru',
       gender: 'male',
       isDefault: false,
     },
   ];
   ```

3. Generate audio using a different TTS engine that supports male voices (see Alternative TTS Engines below).

### Adding a Custom Speaker

For a custom speaker (e.g., human recording or different TTS service):

1. Create a new voice folder:
   ```bash
   mkdir -p public/audio/tts/ru/female-speaker2
   ```

2. Add voice config:
   ```typescript
   {
     id: 'ru-female-speaker2',
     name: 'Мария',
     language: 'ru',
     gender: 'female',
     isDefault: false,
   },
   ```

3. Record/generate audio files with the same filenames as the default voice.

## Alternative TTS Engines

### Edge TTS (Recommended for better quality)

```bash
pip install edge-tts

# List available voices
edge-tts --list-voices

# Generate audio
edge-tts --voice ru-RU-SvetlanaNeural --text "красный" --write-media red.mp3
edge-tts --voice uk-UA-PolinaNeural --text "червоний" --write-media red.mp3
edge-tts --voice en-US-JennyNeural --text "red" --write-media red.mp3
```

Edge TTS voices by language:
- **Russian**: ru-RU-SvetlanaNeural (F), ru-RU-DmitryNeural (M)
- **Ukrainian**: uk-UA-PolinaNeural (F), uk-UA-OstapNeural (M)
- **English**: en-US-JennyNeural (F), en-US-GuyNeural (M)

### AWS Polly

```python
import boto3

polly = boto3.client('polly')
response = polly.synthesize_speech(
    Text='красный',
    OutputFormat='mp3',
    VoiceId='Tatyana',  # Russian female
    Engine='neural'
)

with open('red.mp3', 'wb') as file:
    file.write(response['AudioStream'].read())
```

AWS Polly voices:
- **Russian**: Tatyana (F)
- **Ukrainian**: Not available (use Russian or Edge TTS)
- **English**: Joanna (F), Matthew (M)

### Azure Speech Services

```python
import azure.cognitiveservices.speech as speechsdk

speech_config = speechsdk.SpeechConfig(subscription="key", region="region")
speech_config.speech_synthesis_voice_name = "ru-RU-SvetlanaNeural"

synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
result = synthesizer.speak_text_async("красный").get()
```

### Human Recording

For the highest quality, record audio files manually:

1. Use consistent recording settings:
   - Sample rate: 44100 Hz
   - Bit depth: 16-bit
   - Format: MP3 (128+ kbps) or OGG
   - Normalize audio levels

2. Name files according to the `COLOR_AUDIO_FILES` mapping in `audioTTS.ts`

3. Place files in the appropriate language/voice folder

## Batch Generation Script (Edge TTS)

Create `scripts/generate-edge-tts.py`:

```python
#!/usr/bin/env python3
import asyncio
import edge_tts
from pathlib import Path

COLORS = {
    "white": {"ru": "белый", "uk": "білий", "en": "white"},
    "black": {"ru": "чёрный", "uk": "чорний", "en": "black"},
    # ... add all colors
}

VOICES = {
    "ru": "ru-RU-SvetlanaNeural",
    "uk": "uk-UA-PolinaNeural",
    "en": "en-US-JennyNeural",
}

async def generate(text: str, voice: str, output: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output)

async def main():
    for color_key, translations in COLORS.items():
        for lang, text in translations.items():
            output_dir = Path(f"public/audio/tts/{lang}/female-default")
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = output_dir / f"{color_key}.mp3"

            print(f"Generating: {output_path}")
            await generate(text, VOICES[lang], str(output_path))

if __name__ == "__main__":
    asyncio.run(main())
```

## Audio File Requirements

- **Format**: MP3 (recommended), OGG, or WAV
- **Sample rate**: 22050 Hz minimum (44100 Hz recommended)
- **Duration**: 0.5-2 seconds per color
- **Silence**: Minimal leading/trailing silence
- **Normalization**: Consistent volume levels across all files

## Testing Audio Files

After generating, test the audio in the browser:

1. Start the dev server: `npm run dev`
2. Open the TTS panel
3. Select a color and click play
4. Check browser console for any loading errors

## Troubleshooting

### Audio not playing
- Check browser console for 404 errors
- Verify file exists in the correct path
- Ensure filename matches `COLOR_AUDIO_FILES` mapping

### Wrong pronunciation
- Re-generate with a different TTS engine
- Use phonetic spelling in the text (e.g., "ла-зур-ный" instead of "лазурный")
- Record manually for best results

### Inconsistent volume
- Use audio normalization tools:
  ```bash
  pip install pydub
  # Normalize all files in a folder
  for f in *.mp3; do
    ffmpeg -i "$f" -filter:a loudnorm -ar 44100 "normalized_$f"
  done
  ```
