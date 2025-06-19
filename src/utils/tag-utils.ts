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

import { Blueprint } from '@/types';

/**
 * Get other blueprint tags from config selections
 * @param configSelections - Current configuration selections
 * @param currentPartName - Name of the current part
 * @returns Set of tags from other selections
 */
export function getOtherBlueprintTags(
  configSelections: Record<string, Blueprint>,
  currentPartName: string
): Set<string> {
  const otherTags = new Set<string>();
  
  Object.entries(configSelections).forEach(([partName, bp]) => {
    if (partName !== currentPartName) {
      bp.tags.forEach(tag => otherTags.add(tag));
    }
  });
  
  return otherTags;
}

/**
 * Swap tags by filtering out a specific tag type
 * @param blueprint - The blueprint containing tags to filter
 * @param tagType - The tag type to filter out (e.g., 'texture', 'size', 'connection')
 * @returns Array of tags that don't start with the specified tag type
 */
export function swapTagsByType(blueprint: Blueprint, tagType: string): string[] {
  return blueprint.tags.filter(t => !t.startsWith(tagType));
} 