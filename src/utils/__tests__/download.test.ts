import { downloadFiles } from '../download';

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