import { tagToArray, arrayToTag, convertTagDict } from '../tag-utils';

describe('tagToArray', () => {
  it('splits a pipe-delimited string', () => {
    expect(tagToArray('foo|bar')).toEqual(['foo', 'bar']);
  });
  it('returns the array unchanged', () => {
    expect(tagToArray(['foo', 'bar'])).toEqual(['foo', 'bar']);
  });
});

describe('arrayToTag', () => {
  it('joins an array into a pipe-delimited string', () => {
    expect(arrayToTag(['foo', 'bar'])).toBe('foo|bar');
  });
  it('handles a single-element array', () => {
    expect(arrayToTag(['foo'])).toBe('foo');
  });
  it('handles an empty array', () => {
    expect(arrayToTag([])).toBe('');
  });
});

describe('convertTagDict', () => {
  it('converts tag array to pipe-delimited string in dict', () => {
    expect(convertTagDict({ tag: ['foo', 'bar'] })).toEqual({ tag: 'foo|bar' });
  });
  it('handles empty tag array', () => {
    expect(convertTagDict({ tag: [] })).toEqual({ tag: '' });
  });
}); 