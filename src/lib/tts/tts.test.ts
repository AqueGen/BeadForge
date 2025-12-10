import { describe, it, expect } from 'vitest';
import {
  getColorName,
  getLanguageCode,
  getAvailableLanguages,
  COLOR_TRANSLATIONS,
  UI_TRANSLATIONS,
} from './colorNames';
import {
  generateBeadListForTTS,
  groupBeadList,
  getIndividualText,
  getGroupedText,
} from './ttsService';
import { createPattern, setBead } from '../pattern';

describe('colorNames', () => {
  describe('getColorName', () => {
    it('should return Russian color name', () => {
      expect(getColorName('Red', 'ru')).toBe('красный');
      expect(getColorName('Blue', 'ru')).toBe('синий');
      expect(getColorName('White', 'ru')).toBe('белый');
    });

    it('should return Ukrainian color name', () => {
      expect(getColorName('Red', 'uk')).toBe('червоний');
      expect(getColorName('Blue', 'uk')).toBe('синій');
      expect(getColorName('White', 'uk')).toBe('білий');
    });

    it('should return English color name', () => {
      expect(getColorName('Red', 'en')).toBe('red');
      expect(getColorName('Blue', 'en')).toBe('blue');
      expect(getColorName('White', 'en')).toBe('white');
    });

    it('should fallback to color number if no name', () => {
      expect(getColorName(undefined, 'ru', 5)).toBe('цвет 6');
      expect(getColorName(undefined, 'en', 0)).toBe('color 1');
    });

    it('should return original name if no translation', () => {
      expect(getColorName('UnknownColor', 'ru')).toBe('UnknownColor');
    });
  });

  describe('getLanguageCode', () => {
    it('should return correct language codes', () => {
      expect(getLanguageCode('ru')).toBe('ru-RU');
      expect(getLanguageCode('uk')).toBe('uk-UA');
      expect(getLanguageCode('en')).toBe('en-US');
    });
  });

  describe('getAvailableLanguages', () => {
    it('should return all available languages', () => {
      const languages = getAvailableLanguages();
      expect(languages).toHaveLength(3);
      expect(languages.map((l) => l.code)).toEqual(['ru', 'uk', 'en']);
    });

    it('should include native names', () => {
      const languages = getAvailableLanguages();
      const ru = languages.find((l) => l.code === 'ru');
      expect(ru?.nativeName).toBe('Русский');
    });
  });

  describe('COLOR_TRANSLATIONS', () => {
    it('should have translations for standard colors', () => {
      const standardColors = [
        'White', 'Black', 'Red', 'Green', 'Blue', 'Yellow',
        'Orange', 'Purple', 'Pink', 'Cyan', 'Brown', 'Gray',
        'Silver', 'Gold', 'Navy', 'Maroon',
      ];

      for (const color of standardColors) {
        expect(COLOR_TRANSLATIONS[color]).toBeDefined();
        expect(COLOR_TRANSLATIONS[color].ru).toBeDefined();
        expect(COLOR_TRANSLATIONS[color].uk).toBeDefined();
        expect(COLOR_TRANSLATIONS[color].en).toBeDefined();
      }
    });
  });

  describe('UI_TRANSLATIONS', () => {
    it('should have all UI strings for each language', () => {
      const requiredKeys = [
        'play', 'pause', 'stop', 'previous', 'next',
        'speed', 'slow', 'normal', 'fast',
        'voice', 'male', 'female', 'language',
        'mode', 'auto', 'manual', 'format',
      ];

      for (const lang of ['ru', 'uk', 'en'] as const) {
        for (const key of requiredKeys) {
          expect(UI_TRANSLATIONS[lang][key as keyof typeof UI_TRANSLATIONS['ru']]).toBeDefined();
        }
      }
    });
  });
});

describe('ttsService', () => {
  describe('generateBeadListForTTS', () => {
    it('should generate bead list in reverse order (stringing order)', () => {
      let pattern = createPattern(3, 2);
      // Row 0: [0, 1, 2]
      // Row 1: [3, 4, 5]
      pattern = setBead(pattern, 0, 0, 0);
      pattern = setBead(pattern, 1, 0, 1);
      pattern = setBead(pattern, 2, 0, 2);
      pattern = setBead(pattern, 0, 1, 3);
      pattern = setBead(pattern, 1, 1, 4);
      pattern = setBead(pattern, 2, 1, 5);

      const list = generateBeadListForTTS(pattern, 'en');

      // Should be reversed: row 1 right-to-left, then row 0 right-to-left
      // [5, 4, 3, 2, 1, 0]
      expect(list).toHaveLength(6);
      expect(list[0].colorIndex).toBe(5);
      expect(list[1].colorIndex).toBe(4);
      expect(list[2].colorIndex).toBe(3);
      expect(list[3].colorIndex).toBe(2);
      expect(list[4].colorIndex).toBe(1);
      expect(list[5].colorIndex).toBe(0);
    });

    it('should assign sequential positions starting from 1', () => {
      const pattern = createPattern(2, 2);
      const list = generateBeadListForTTS(pattern, 'ru');

      expect(list[0].position).toBe(1);
      expect(list[1].position).toBe(2);
      expect(list[2].position).toBe(3);
      expect(list[3].position).toBe(4);
    });

    it('should include color names in specified language', () => {
      let pattern = createPattern(2, 1);
      // Default colors: index 0 = White, index 1 = Black
      pattern = setBead(pattern, 0, 0, 0);
      pattern = setBead(pattern, 1, 0, 1);

      const listRu = generateBeadListForTTS(pattern, 'ru');
      expect(listRu.some((item) => item.colorName === 'чёрный')).toBe(true);
      expect(listRu.some((item) => item.colorName === 'белый')).toBe(true);

      const listEn = generateBeadListForTTS(pattern, 'en');
      expect(listEn.some((item) => item.colorName === 'black')).toBe(true);
      expect(listEn.some((item) => item.colorName === 'white')).toBe(true);
    });
  });

  describe('groupBeadList', () => {
    it('should group consecutive same-color beads', () => {
      const items = [
        { colorIndex: 1, colorName: 'red', position: 1 },
        { colorIndex: 1, colorName: 'red', position: 2 },
        { colorIndex: 1, colorName: 'red', position: 3 },
        { colorIndex: 2, colorName: 'blue', position: 4 },
        { colorIndex: 2, colorName: 'blue', position: 5 },
        { colorIndex: 1, colorName: 'red', position: 6 },
      ];

      const grouped = groupBeadList(items);

      expect(grouped).toHaveLength(3);
      expect(grouped[0]).toEqual({
        colorIndex: 1,
        colorName: 'red',
        count: 3,
        startPosition: 1,
      });
      expect(grouped[1]).toEqual({
        colorIndex: 2,
        colorName: 'blue',
        count: 2,
        startPosition: 4,
      });
      expect(grouped[2]).toEqual({
        colorIndex: 1,
        colorName: 'red',
        count: 1,
        startPosition: 6,
      });
    });

    it('should handle single item', () => {
      const items = [{ colorIndex: 1, colorName: 'red', position: 1 }];
      const grouped = groupBeadList(items);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].count).toBe(1);
    });

    it('should handle empty list', () => {
      const grouped = groupBeadList([]);
      expect(grouped).toHaveLength(0);
    });

    it('should handle all same color', () => {
      const items = [
        { colorIndex: 1, colorName: 'red', position: 1 },
        { colorIndex: 1, colorName: 'red', position: 2 },
        { colorIndex: 1, colorName: 'red', position: 3 },
      ];

      const grouped = groupBeadList(items);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].count).toBe(3);
    });

    it('should handle all different colors', () => {
      const items = [
        { colorIndex: 1, colorName: 'red', position: 1 },
        { colorIndex: 2, colorName: 'blue', position: 2 },
        { colorIndex: 3, colorName: 'green', position: 3 },
      ];

      const grouped = groupBeadList(items);

      expect(grouped).toHaveLength(3);
      expect(grouped.every((g) => g.count === 1)).toBe(true);
    });
  });

  describe('getIndividualText', () => {
    it('should return just the color name', () => {
      const item = { colorIndex: 1, colorName: 'красный', position: 5 };
      expect(getIndividualText(item)).toBe('красный');
    });
  });

  describe('getGroupedText', () => {
    it('should return color name only for count of 1', () => {
      const item = { colorIndex: 1, colorName: 'красный', count: 1, startPosition: 1 };
      expect(getGroupedText(item, 'ru')).toBe('красный');
    });

    it('should return color name with count for multiple', () => {
      const item = { colorIndex: 1, colorName: 'красный', count: 5, startPosition: 1 };
      expect(getGroupedText(item, 'ru')).toBe('красный 5');
    });
  });
});
