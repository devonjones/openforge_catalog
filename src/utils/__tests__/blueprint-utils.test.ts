import { downloadFiles, shouldShowDownloadLink, collectDownloadUrls, getLatestModificationDate } from '../blueprint-utils';
import { createMockBlueprint } from '@/test-utils';

describe('blueprint-utils', () => {
  describe('downloadFiles', () => {
    let createElementSpy: jest.SpyInstance;
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;
    let setTimeoutSpy: jest.SpyInstance;

    beforeEach(() => {
      createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag);
        // @ts-expect-error - Mocking style property for test
        el.style = {};
        return el;
      });
      appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node);
      removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node);
      setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
        fn();
        return 1 as unknown as NodeJS.Timeout;
      });
    });

    afterEach(() => {
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });

    it('calls nav for a single URL', async () => {
      const nav = jest.fn();
      await downloadFiles(['http://example.com/file1'], nav);
      expect(nav).toHaveBeenCalledWith('http://example.com/file1');
      expect(createElementSpy).not.toHaveBeenCalled();
    });

    it('downloads multiple files by creating iframes', async () => {
      const urls = ['http://example.com/file1', 'http://example.com/file2'];
      await downloadFiles(urls, jest.fn());
      expect(createElementSpy).toHaveBeenCalledTimes(2);
      expect(appendChildSpy).toHaveBeenCalledTimes(2);
      expect(removeChildSpy).toHaveBeenCalledTimes(2);
    });

    it('returns immediately for empty urls', async () => {
      await expect(downloadFiles([], jest.fn())).resolves.toBeUndefined();
      expect(createElementSpy).not.toHaveBeenCalled();
      expect(appendChildSpy).not.toHaveBeenCalled();
    });
  });

  describe('shouldShowDownloadLink', () => {
    const mockBlueprint = createMockBlueprint();

    it('returns true when blueprint has file_name', () => {
      const result = shouldShowDownloadLink(mockBlueprint, {});
      expect(result).toBe(true);
    });

    it('returns false when blueprint has no file_name and no config parts', () => {
      const blueprintWithoutFile = createMockBlueprint({ file_name: '' });
      const result = shouldShowDownloadLink(blueprintWithoutFile, {});
      expect(result).toBe(false);
    });

    it('returns true when all required parts are selected', () => {
      const blueprintWithConfig = createMockBlueprint({
        file_name: '',
        blueprint_config: {
          parts: [
            {
              name: 'part1',
              tags: { require: [{ tag: 'required_tag' }], deny: [], accept: [], constrain: [] }
            }
          ]
        }
      });
      const configSelections = {
        part1: createMockBlueprint({ id: '2' })
      };
      const result = shouldShowDownloadLink(blueprintWithConfig, configSelections);
      expect(result).toBe(true);
    });
  });

  describe('collectDownloadUrls', () => {
    const mockBlueprint = createMockBlueprint();

    it('includes main blueprint URL when it has file_name', () => {
      const urls = collectDownloadUrls(mockBlueprint, {});
      expect(urls).toContain('/api/blueprints/1/download');
    });

    it('includes URLs for selected parts', () => {
      const configSelections = {
        part1: createMockBlueprint({ id: '2', file_name: 'part1.stl' })
      };
      const urls = collectDownloadUrls(mockBlueprint, configSelections);
      expect(urls).toContain('/api/blueprints/1/download');
      expect(urls).toContain('/api/blueprints/2/download');
    });

    it('does not include duplicate URLs', () => {
      const configSelections = {
        part1: createMockBlueprint({ id: '1', file_name: 'part1.stl' })
      };
      const urls = collectDownloadUrls(mockBlueprint, configSelections);
      expect(urls).toEqual(['/api/blueprints/1/download']);
    });
  });

  describe('getLatestModificationDate', () => {
    it('returns the later of file_changed_at and file_modified_at', () => {
      const blueprint = createMockBlueprint({
        file_changed_at: '2023-01-01T00:00:00Z',
        file_modified_at: '2023-01-02T00:00:00Z'
      });
      
      const result = getLatestModificationDate(blueprint);
      expect(result).toEqual(new Date('2023-01-02T00:00:00Z'));
    });

    it('handles when file_changed_at is later', () => {
      const blueprint = createMockBlueprint({
        file_changed_at: '2023-01-03T00:00:00Z',
        file_modified_at: '2023-01-01T00:00:00Z'
      });
      
      const result = getLatestModificationDate(blueprint);
      expect(result).toEqual(new Date('2023-01-03T00:00:00Z'));
    });
  });
}); 