# Color Mapping Feature Specification

## Overview

Extended color system with automatic mapping of imported colors to voiced colors, user override capability, and modifier support.

## Requirements Summary

1. **Auto-mapping**: Imported colors automatically map to closest voiced color (16 base colors)
2. **User override**: Users can change mapping and select modifiers
3. **Modifiers**: brightness, transparency, finish, saturation (all optional)
4. **TTS modes**: "color only" or "full info" (with modifiers)
5. **Storage**: localStorage with pattern (future: database)
6. **UI**: Toolbar warning indicator + mapping panel

## Data Types

```typescript
// src/types/colorMapping.ts

// Modifier types
export type BrightnessModifier = 'light' | 'dark' | null;
export type TransparencyModifier = 'transparent' | null;
export type FinishModifier = 'matte' | 'glossy' | 'pearl' | 'metallic' | null;
export type SaturationModifier = 'pastel' | 'bright' | null;

export interface ColorModifiers {
  brightness: BrightnessModifier;
  transparency: TransparencyModifier;
  finish: FinishModifier;
  saturation: SaturationModifier;
}

export interface ColorMapping {
  originalIndex: number;        // index in pattern.colors
  originalColor: BeadColor;     // original RGB
  mappedColorIndex: number;     // voiced color index (0-15)
  modifiers: ColorModifiers;
  isAutoMapped: boolean;        // auto or user-set
}

export type TTSMode = 'colorOnly' | 'full';

// Extended pattern storage
export interface PatternColorSettings {
  mappings: ColorMapping[];
  ttsMode: TTSMode;
}
```

## Voice Order

**Format**: `"<колір> <модифікатори>"`

**Example**: `"червоний темний матовий прозорий"` (red dark matte transparent)

**Modifier order**:
1. Color name (base)
2. Brightness (світлий/темний)
3. Finish (матовий/глянцевий/перламутровий/металік)
4. Transparency (прозорий)
5. Saturation (пастельний/яскравий)

## Audio Files Required

### New modifier audio files (9 total):

| Key | Ukrainian | File Path |
|-----|-----------|-----------|
| `light` | світлий | `/tts/uk/modifiers/light.mp3` |
| `dark` | темний | `/tts/uk/modifiers/dark.mp3` |
| `transparent` | прозорий | `/tts/uk/modifiers/transparent.mp3` |
| `matte` | матовий | `/tts/uk/modifiers/matte.mp3` |
| `glossy` | глянцевий | `/tts/uk/modifiers/glossy.mp3` |
| `pearl` | перламутровий | `/tts/uk/modifiers/pearl.mp3` |
| `metallic` | металік | `/tts/uk/modifiers/metallic.mp3` |
| `pastel` | пастельний | `/tts/uk/modifiers/pastel.mp3` |
| `bright` | яскравий | `/tts/uk/modifiers/bright.mp3` |

## Color Matching Algorithm

```typescript
// Weighted Euclidean distance for human color perception
function colorDistance(c1: BeadColor, c2: BeadColor): number {
  const rMean = (c1.r + c2.r) / 2;
  const dR = c1.r - c2.r;
  const dG = c1.g - c2.g;
  const dB = c1.b - c2.b;

  return Math.sqrt(
    (2 + rMean / 256) * dR * dR +
    4 * dG * dG +
    (2 + (255 - rMean) / 256) * dB * dB
  );
}

function findClosestVoicedColor(
  color: BeadColor,
  voicedColors: BeadColor[]
): number {
  let minDist = Infinity;
  let closestIndex = 0;

  voicedColors.forEach((vc, i) => {
    const dist = colorDistance(color, vc);
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  });

  return closestIndex;
}
```

## UI Components

### 1. ColorMappingButton (Toolbar)

Location: Toolbar, near other pattern tools

States:
- **Warning** (yellow/orange): Unmapped colors exist or no voice for some
- **OK** (green): All colors have valid voice mapping
- **Neutral** (gray): No colors in pattern

```tsx
<ColorMappingButton
  hasWarning={hasUnmappedColors}
  onClick={() => setShowMappingPanel(true)}
/>
```

### 2. ColorMappingPanel (Modal/Dropdown)

```
┌─────────────────────────────────────────────────────────────┐
│  Налаштування кольорів                                  [×] │
├─────────────────────────────────────────────────────────────┤
│  Режим озвучки:                                             │
│  ○ Тільки колір    ● Повна інформація (з модифікаторами)   │
├─────────────────────────────────────────────────────────────┤
│  Кольори схеми (5 кольорів, 1250 бісерин)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [■] #FF5733  (450 шт)   →   [▼ Червоний        ]          │
│       ┌─ Модифікатори ─────────────────────────┐           │
│       │ ☐ світлий   ☑ темний                   │           │
│       │ ☐ прозорий                              │           │
│       │ ☑ матовий ☐ глянцевий ☐ перлам ☐ метал │           │
│       │ ☐ пастельний ☐ яскравий                │           │
│       └────────────────────────────────────────┘           │
│       Озвучка: "червоний темний матовий"         [▶ Тест]  │
│                                                             │
│  [■] #2ECC71  (320 шт)   →   [▼ Зелений         ] ✓ auto   │
│       ...                                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Скинути до авто] [Зберегти]  │
└─────────────────────────────────────────────────────────────┘
```

Features:
- Show original color swatch
- Show bead count per color
- Dropdown to select base voiced color
- Checkboxes for modifiers (grouped)
- Preview of voice phrase
- Test button to hear pronunciation
- Auto-mapped indicator
- Reset to auto button
- Save button

## Storage Format

```typescript
// localStorage key: `beadforge_pattern_${patternId}`
interface StoredPattern {
  pattern: BeadPatternDto;
  colorSettings?: {
    mappings: Array<{
      originalIndex: number;
      mappedColorIndex: number;
      modifiers: ColorModifiers;
      isAutoMapped: boolean;
    }>;
    ttsMode: TTSMode;
  };
}
```

## File Structure

```
src/
├── types/
│   └── colorMapping.ts          # NEW: color mapping types
├── lib/
│   ├── pattern/
│   │   └── colorMatching.ts     # NEW: color distance algorithm
│   └── tts/
│       ├── modifierVoices.ts    # NEW: modifier voice config
│       └── ttsService.ts        # UPDATE: support modifiers
├── components/
│   └── editor/
│       ├── ColorMappingButton.tsx   # NEW: toolbar button
│       └── ColorMappingPanel.tsx    # NEW: mapping panel
├── hooks/
│   └── useColorMapping.ts       # NEW: mapping logic hook
public/
└── tts/
    └── uk/
        └── modifiers/           # NEW: modifier audio files
            ├── light.mp3
            ├── dark.mp3
            ├── transparent.mp3
            ├── matte.mp3
            ├── glossy.mp3
            ├── pearl.mp3
            ├── metallic.mp3
            ├── pastel.mp3
            └── bright.mp3
```

## Implementation Order

1. **Phase 1: Types & Algorithm**
   - Add color mapping types
   - Implement color distance algorithm
   - Add voiced colors constant (16 base colors with names)

2. **Phase 2: TTS Integration**
   - Create modifier voice configuration
   - Update TTS service to support modifiers
   - Generate placeholder/silent audio files for testing

3. **Phase 3: Hook & Storage**
   - Create useColorMapping hook
   - Implement auto-mapping on pattern load
   - Add localStorage save/load for mappings

4. **Phase 4: UI Components**
   - Create ColorMappingButton with warning state
   - Create ColorMappingPanel with full functionality
   - Integrate into Toolbar

5. **Phase 5: Audio Generation**
   - Generate actual Ukrainian audio files for modifiers
   - Test full flow

## Voiced Colors Reference (16 base)

```typescript
export const VOICED_COLORS = [
  { index: 0, name: 'білий', nameUk: 'білий', rgb: { r: 255, g: 255, b: 255 } },
  { index: 1, name: 'чорний', nameUk: 'чорний', rgb: { r: 0, g: 0, b: 0 } },
  { index: 2, name: 'червоний', nameUk: 'червоний', rgb: { r: 255, g: 0, b: 0 } },
  { index: 3, name: 'синій', nameUk: 'синій', rgb: { r: 0, g: 0, b: 255 } },
  { index: 4, name: 'зелений', nameUk: 'зелений', rgb: { r: 0, g: 255, b: 0 } },
  { index: 5, name: 'жовтий', nameUk: 'жовтий', rgb: { r: 255, g: 255, b: 0 } },
  { index: 6, name: 'помаранчевий', nameUk: 'помаранчевий', rgb: { r: 255, g: 165, b: 0 } },
  { index: 7, name: 'фіолетовий', nameUk: 'фіолетовий', rgb: { r: 128, g: 0, b: 128 } },
  { index: 8, name: 'рожевий', nameUk: 'рожевий', rgb: { r: 255, g: 192, b: 203 } },
  { index: 9, name: 'коричневий', nameUk: 'коричневий', rgb: { r: 139, g: 69, b: 19 } },
  { index: 10, name: 'сірий', nameUk: 'сірий', rgb: { r: 128, g: 128, b: 128 } },
  { index: 11, name: 'блакитний', nameUk: 'блакитний', rgb: { r: 135, g: 206, b: 235 } },
  { index: 12, name: 'бірюзовий', nameUk: 'бірюзовий', rgb: { r: 0, g: 206, b: 209 } },
  { index: 13, name: 'бежевий', nameUk: 'бежевий', rgb: { r: 245, g: 245, b: 220 } },
  { index: 14, name: 'золотий', nameUk: 'золотий', rgb: { r: 255, g: 215, b: 0 } },
  { index: 15, name: 'срібний', nameUk: 'срібний', rgb: { r: 192, g: 192, b: 192 } },
];
```

## Notes

- Skip color (index 255) should not appear in mapping panel
- Auto-mapping runs on pattern import/load
- User changes override auto-mapping (isAutoMapped = false)
- "Reset to auto" recalculates mapping for that color
- TTS mode saved per pattern, not global
