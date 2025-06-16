/**
 * Convert a tag string or array to a tag array.
 * @param tag Either a pipe-delimited string (e.g. "foo|bar") or a list of strings
 * @returns List of tag components
 */
export function tagToArray(tag: string | string[]): string[] {
    if (typeof tag === 'string') {
        return tag.split('|');
    }
    return tag;
}

/**
 * Convert a tag array to a pipe-delimited string.
 * @param tagArray List of tag components
 * @returns Pipe-delimited string
 */
export function arrayToTag(tagArray: string[]): string {
    return tagArray.join('|');
}

/**
 * Convert a tag dictionary to use pipe-delimited strings.
 * @param tagDict Dictionary containing a 'tag' key with array value
 * @returns Dictionary with 'tag' value converted to pipe-delimited string
 */
export function convertTagDict(tagDict: { tag: string[] }): { tag: string } {
    return {
        ...tagDict,
        tag: arrayToTag(tagDict.tag)
    };
} 