import { formatFileSize } from '../format';

describe('formatFileSize', () => {
  it('formats bytes to KB', () => {
    expect(formatFileSize(2048)).toBe('2 KB');
  });
  it('formats bytes to MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
  });
  it('formats small bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });
}); 