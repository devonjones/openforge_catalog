import { getOtherBlueprintTags, getParentBlueprintTags, getSelectionsWithSamePrefix } from '../tags';

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('tags.ts', () => {
  const mockBlueprint = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    blueprint_name: 'Test Blueprint',
    tags: ['test', 'model', 'base']
  };

  const mockConfigSelections = {
    'part1': {
      id: 'part1-id',
      blueprint_name: 'Part 1',
      tags: ['part1', 'component']
    },
    'part1|subpart1': {
      id: 'subpart1-id',
      blueprint_name: 'Subpart 1',
      tags: ['subpart1', 'detail']
    },
    'part2': {
      id: 'part2-id',
      blueprint_name: 'Part 2',
      tags: ['part2', 'component']
    },
    'part1|subpart2': {
      id: 'subpart2-id',
      blueprint_name: 'Subpart 2',
      tags: ['subpart2', 'detail']
    }
  };

  describe('getParentBlueprintTags', () => {
    it('should return parent blueprint tags for nested parts', () => {
      const result = getParentBlueprintTags(mockConfigSelections, 'part1|subpart1', mockBlueprint);
      expect(result).toEqual(new Set(['part1', 'component']));
    });

    it('should return main blueprint tags for top-level parts', () => {
      const result = getParentBlueprintTags(mockConfigSelections, 'part1', mockBlueprint);
      expect(result).toEqual(new Set(['test', 'model', 'base']));
    });

    it('should handle parts without parent in configSelections', () => {
      const result = getParentBlueprintTags(mockConfigSelections, 'nonexistent|subpart', mockBlueprint);
      expect(result).toEqual(new Set());
    });

    it('should handle parent blueprint without tags', () => {
      const configSelectionsWithoutTags = {
        'part1': {
          id: 'part1-id',
          blueprint_name: 'Part 1'
          // no tags property
        }
      };
      const result = getParentBlueprintTags(configSelectionsWithoutTags, 'part1|subpart1', mockBlueprint);
      expect(result).toEqual(new Set());
    });

    it('should handle main blueprint without tags', () => {
      const blueprintWithoutTags = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        blueprint_name: 'Test Blueprint'
        // no tags property
      };
      const result = getParentBlueprintTags(mockConfigSelections, 'part1', blueprintWithoutTags);
      expect(result).toEqual(new Set());
    });
  });

  describe('getSelectionsWithSamePrefix', () => {
    it('should return selections with same prefix for nested parts', () => {
      const result = getSelectionsWithSamePrefix(mockConfigSelections, 'part1|subpart1');
      expect(result).toEqual([
        ['part1', mockConfigSelections['part1']],
        ['part1|subpart1', mockConfigSelections['part1|subpart1']],
        ['part1|subpart2', mockConfigSelections['part1|subpart2']]
      ]);
    });

    it('should return only top-level selections for top-level parts', () => {
      const result = getSelectionsWithSamePrefix(mockConfigSelections, 'part1');
      expect(result).toEqual([
        ['part1', mockConfigSelections['part1']],
        ['part2', mockConfigSelections['part2']]
      ]);
    });

    it('should handle empty configSelections', () => {
      const result = getSelectionsWithSamePrefix({}, 'part1');
      expect(result).toEqual([]);
    });

    it('should handle parts with no prefix', () => {
      const result = getSelectionsWithSamePrefix(mockConfigSelections, 'standalone');
      expect(result).toEqual([
        ['part1', mockConfigSelections['part1']],
        ['part2', mockConfigSelections['part2']]
      ]);
    });

    it('should handle complex nested structures', () => {
      const complexSelections = {
        'level1': { tags: ['level1'] },
        'level1|level2': { tags: ['level2'] },
        'level1|level2|level3': { tags: ['level3'] },
        'other': { tags: ['other'] },
        'level1|other': { tags: ['other'] }
      };
      
      const result = getSelectionsWithSamePrefix(complexSelections, 'level1|level2');
      expect(result).toEqual([
        ['level1', complexSelections['level1']],
        ['level1|level2', complexSelections['level1|level2']],
        ['level1|level2|level3', complexSelections['level1|level2|level3']],
        ['level1|other', complexSelections['level1|other']]
      ]);
    });
  });

  describe('getOtherBlueprintTags', () => {
    it('should combine parent and sibling tags for nested parts', () => {
      const result = getOtherBlueprintTags(mockConfigSelections, 'part1|subpart1', mockBlueprint);
      
      // Should include:
      // - Parent tags: ['part1', 'component'] (from getParentBlueprintTags)
      // - All sibling tags: ['part1', 'component'] (from part1), ['subpart1', 'detail'] (from part1|subpart1), ['subpart2', 'detail'] (from part1|subpart2)
      const expectedTags = new Set(['part1', 'component', 'subpart1', 'detail', 'subpart2', 'detail']);
      expect(result).toEqual(expectedTags);
    });

    it('should return main blueprint and sibling tags for top-level parts', () => {
      const result = getOtherBlueprintTags(mockConfigSelections, 'part1', mockBlueprint);
      
      // Should include:
      // - Main blueprint tags: ['test', 'model', 'base'] (from getParentBlueprintTags)
      // - All sibling tags: ['part1', 'component'] (from part1), ['part2', 'component'] (from part2)
      const expectedTags = new Set(['test', 'model', 'base', 'part1', 'component', 'part2', 'component']);
      expect(result).toEqual(expectedTags);
    });

    it('should handle empty configSelections', () => {
      const result = getOtherBlueprintTags({}, 'part1', mockBlueprint);
      expect(result).toEqual(new Set(['test', 'model', 'base']));
    });

    it('should handle parts with no siblings', () => {
      const singleSelection = {
        'part1': {
          id: 'part1-id',
          blueprint_name: 'Part 1',
          tags: ['part1', 'component']
        }
      };
      
      const result = getOtherBlueprintTags(singleSelection, 'part1', mockBlueprint);
      expect(result).toEqual(new Set(['test', 'model', 'base', 'part1', 'component']));
    });

    it('should handle blueprints without tags', () => {
      const blueprintWithoutTags = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        blueprint_name: 'Test Blueprint'
        // no tags property
      };
      
      const result = getOtherBlueprintTags(mockConfigSelections, 'part1', blueprintWithoutTags);
      expect(result).toEqual(new Set(['part1', 'component', 'part2', 'component']));
    });

    it('should handle configSelections with blueprints without tags', () => {
      const selectionsWithoutTags = {
        'part1': {
          id: 'part1-id',
          blueprint_name: 'Part 1',
          tags: [] // Add empty tags array instead of no tags property
        },
        'part2': {
          id: 'part2-id',
          blueprint_name: 'Part 2',
          tags: ['part2', 'component']
        }
      };
      
      const result = getOtherBlueprintTags(selectionsWithoutTags, 'part1', mockBlueprint);
      expect(result).toEqual(new Set(['test', 'model', 'base', 'part2', 'component']));
    });

    it('should handle complex nested structure with multiple levels', () => {
      const complexSelections = {
        'base': { tags: ['base'] },
        'base|level1': { tags: ['level1'] },
        'base|level1|level2': { tags: ['level2'] },
        'base|level1|level2|level3': { tags: ['level3'] },
        'base|other': { tags: ['other'] }
      };
      
      const result = getOtherBlueprintTags(complexSelections, 'base|level1|level2', mockBlueprint);
      
      // Should include:
      // - Parent tags: ['level1'] (from base|level1)
      // - All sibling tags: ['base'] (from base), ['level1'] (from base|level1), ['level2'] (from base|level1|level2), ['level3'] (from base|level1|level2|level3), ['other'] (from base|other)
      const expectedTags = new Set(['level1', 'base', 'level1', 'level2', 'level3', 'other']);
      expect(result).toEqual(expectedTags);
    });
  });
}); 