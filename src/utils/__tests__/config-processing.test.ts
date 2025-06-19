import { processConfigValues, createDeepLink } from '../config-processing';
import type { ConfigTags } from '@/types';

describe('config-processing', () => {
  describe('processConfigValues', () => {
    it('returns empty arrays when configValues is null', () => {
      const result = processConfigValues(null);
      expect(result).toEqual({ require: [], deny: [] });
    });

    it('processes require tags correctly', () => {
      const configValues: ConfigTags = {
        require: [{ tag: 'required1' }, { tag: 'required2' }],
        deny: [],
        accept: [],
        constrain: []
      };

      const result = processConfigValues(configValues);
      expect(result).toEqual({
        require: ['required1', 'required2'],
        deny: []
      });
    });

    it('processes deny tags correctly', () => {
      const configValues: ConfigTags = {
        require: [],
        deny: [{ tag: 'denied1' }, { tag: 'denied2' }],
        accept: [],
        constrain: []
      };

      const result = processConfigValues(configValues);
      expect(result).toEqual({
        require: [],
        deny: ['denied1', 'denied2']
      });
    });

    it('processes require and deny tags together', () => {
      const configValues: ConfigTags = {
        require: [{ tag: 'required1' }, { tag: 'required2' }],
        deny: [{ tag: 'denied1' }, { tag: 'denied2' }],
        accept: [],
        constrain: []
      };

      const result = processConfigValues(configValues);
      expect(result).toEqual({
        require: ['required1', 'required2'],
        deny: ['denied1', 'denied2']
      });
    });

    it('filters out empty tag properties', () => {
      const configValues: ConfigTags = {
        require: [{ tag: 'required1' }, { tag: '' }],
        deny: [{ tag: 'denied1' }, { tag: '' }],
        accept: [],
        constrain: []
      };

      const result = processConfigValues(configValues);
      expect(result).toEqual({
        require: ['required1'],
        deny: ['denied1']
      });
    });

    it('handles configValues with no tags section', () => {
      const configValues: ConfigTags = {
        require: [],
        deny: [],
        accept: [],
        constrain: []
      };

      const result = processConfigValues(configValues);
      expect(result).toEqual({
        require: [],
        deny: []
      });
    });

    it('processes constrain tags with tag constraints', () => {
      const configValues: ConfigTags = {
        require: [],
        deny: [],
        accept: [],
        constrain: [
          { tag: 'base' },
          { filter: 'base|level1' },
          { filter: 'base|level2' }
        ]
      };

      const tagsFromOtherSelections = ['base|level1|sub', 'base|level3|sub', 'other|tag'];
      const result = processConfigValues(configValues, tagsFromOtherSelections);

      expect(result).toEqual({
        require: ['base|level3|sub'], // Should include this as it starts with 'base' but doesn't match any filter
        deny: []
      });
    });

    it('handles constrain logic with no matching tags', () => {
      const configValues: ConfigTags = {
        require: [],
        deny: [],
        accept: [],
        constrain: [
          { tag: 'base' },
          { filter: 'base|level1' }
        ]
      };

      const tagsFromOtherSelections = ['other|tag', 'different|tag'];
      const result = processConfigValues(configValues, tagsFromOtherSelections);

      expect(result).toEqual({
        require: [],
        deny: []
      });
    });

    it('handles constrain logic with exact filter match', () => {
      const configValues: ConfigTags = {
        require: [],
        deny: [],
        accept: [],
        constrain: [
          { tag: 'base' },
          { filter: 'base|level1' }
        ]
      };

      const tagsFromOtherSelections = ['base|level1'];
      const result = processConfigValues(configValues, tagsFromOtherSelections);

      expect(result).toEqual({
        require: [], // Should be empty as the tag exactly matches the filter
        deny: []
      });
    });

    it('handles constrain logic with prefix filter match', () => {
      const configValues: ConfigTags = {
        require: [],
        deny: [],
        accept: [],
        constrain: [
          { tag: 'base' },
          { filter: 'base|level1' }
        ]
      };

      const tagsFromOtherSelections = ['base|level1|sub'];
      const result = processConfigValues(configValues, tagsFromOtherSelections);

      expect(result).toEqual({
        require: [], // Should be empty as the tag starts with the filter
        deny: []
      });
    });

    it('handles constrain logic when tag starts with filter', () => {
      const configValues: ConfigTags = {
        require: [],
        deny: [],
        accept: [],
        constrain: [
          { tag: 'base' },
          { filter: 'base|level1|sub' }
        ]
      };

      const tagsFromOtherSelections = ['base|level1'];
      const result = processConfigValues(configValues, tagsFromOtherSelections);

      expect(result).toEqual({
        require: [], // Should be empty as the filter starts with the tag
        deny: []
      });
    });

    it('filters out more specific tags while keeping same-level tags', () => {
      const configValues: ConfigTags = {
        require: [],
        deny: [],
        accept: [],
        constrain: [
          { tag: 'texture' }
        ]
      };

      const tagsFromOtherSelections = [
        'texture|wood',
        'texture|dungeon_stone',
        'texture|dungeon_stone|block',
        'texture|cave|detailed',
        'texture|cave'
      ];

      const result = processConfigValues(configValues, tagsFromOtherSelections);

      expect(result).toEqual({
        require: ['texture|wood', 'texture|dungeon_stone', 'texture|cave'],
        deny: []
      });
    });

    it('handles multiple levels of tag specificity', () => {
      const configValues: ConfigTags = {
        require: [],
        deny: [],
        accept: [],
        constrain: [
          { tag: 'texture' }
        ]
      };

      const tagsFromOtherSelections = [
        'texture|stone',
        'texture|stone|rough',
        'texture|stone|rough|cracked',
        'texture|wood',
        'texture|wood|oak|stained'
      ];

      const result = processConfigValues(configValues, tagsFromOtherSelections);

      expect(result).toEqual({
        require: ['texture|stone', 'texture|wood'],
        deny: []
      });
    });

    it('selects tag with least segments when multiple tags match constraint', () => {
      const configValues: ConfigTags = {
        require: [],
        deny: [],
        accept: [],
        constrain: [
          { tag: 'texture' }
        ]
      };

      const tagsFromOtherSelections = [
        'texture|dungeon_stone',
        'texture|dungeon_stone|block',
        'texture|cave',
        'texture|cave|detailed'
      ];

      const result = processConfigValues(configValues, tagsFromOtherSelections);

      expect(result).toEqual({
        require: ['texture|dungeon_stone', 'texture|cave'],
        deny: []
      });
    });
  });

  describe('createDeepLink', () => {
    it('creates deep link with tags only', () => {
      const tags = ['tag1', 'tag2'];
      const result = createDeepLink(tags);
      expect(result).toBe('tag=tag1&tag=tag2');
    });

    it('creates deep link with tags and search term', () => {
      const tags = ['tag1', 'tag2'];
      const searchTerm = 'test search';
      const result = createDeepLink(tags, searchTerm);
      expect(result).toBe('tag=tag1&tag=tag2&search=test%20search');
    });

    it('handles empty tags array', () => {
      const tags: string[] = [];
      const result = createDeepLink(tags);
      expect(result).toBe('');
    });

    it('handles tags with special characters', () => {
      const tags = ['tag with spaces', 'tag|with|pipes'];
      const result = createDeepLink(tags);
      expect(result).toBe('tag=tag%20with%20spaces&tag=tag%7Cwith%7Cpipes');
    });

    it('handles search term with special characters', () => {
      const tags = ['tag1'];
      const searchTerm = 'search with spaces & symbols';
      const result = createDeepLink(tags, searchTerm);
      expect(result).toBe('tag=tag1&search=search%20with%20spaces%20%26%20symbols');
    });
  });
}); 