# BeadForge - Project Instructions for Claude

## Development Rules

### Server Management
- **DO NOT** start the dev server (`npm run dev`) - the user will start it manually
- **DO** run builds (`npm run build`) to verify code compiles correctly
- **DO** run tests (`npm test`) when needed to verify functionality
- **DO** run type checking (`npx tsc --noEmit`) for quick validation

### Code Quality
- Always run `npm run build` after making changes to verify compilation
- Fix any TypeScript errors before considering a task complete
- Follow existing code patterns and conventions in the project

## Project Structure

- `/src/app/` - Next.js pages (rope editor at `/`, ball editor at `/ball`)
- `/src/components/` - React components
- `/src/hooks/` - Custom React hooks (usePattern, useTTS, useBallTTS, useBallPattern)
- `/src/lib/` - Utility libraries (TTS, pattern formats)
- `/src/types/` - TypeScript type definitions
- `/public/tts/` - Pre-generated TTS audio files
- `/examples_jbb/` - Example JBB files for testing import

## Key Files

### Pattern Formats
- `src/lib/pattern/jbbFormat.ts` - JBead .jbb file format parser/serializer
- `src/types/index.ts` - Core types including BeadPattern, BeadColor

### TTS System
- `src/lib/tts/index.ts` - TTS controller and utilities
- `src/hooks/useTTS.ts` - Rope pattern TTS hook
- `src/hooks/useBallTTS.ts` - Ball pattern TTS hook
- `src/components/tts/TTSPanel.tsx` - Rope pattern TTS panel
- `src/components/tts/BallTTSPanel.tsx` - Ball pattern TTS panel

### Editors
- `src/app/page.tsx` - Main rope pattern editor
- `src/app/ball/page.tsx` - Ball pattern editor
