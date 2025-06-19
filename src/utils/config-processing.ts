import { ConfigTags } from '@/types';

export interface ProcessedTags {
  require: string[];
  deny: string[];
}

/**
 * Process config values to extract require, deny, and constrain tags
 * @param configValues - The configuration tags to process
 * @param tagsFromOtherSelections - Tags from other selections to consider for constraints
 * @returns Object containing require and deny tag arrays
 */
export function processConfigValues(
  configValues: ConfigTags | null,
  tagsFromOtherSelections: string[] = []
): ProcessedTags {
  const tags: ProcessedTags = { require: [], deny: [] };

  if (!configValues) {
    return tags;
  }

  // Process require tags
  if (configValues.require) {
    configValues.require.forEach((data) => {
      if (data.tag) {
        tags.require.push(data.tag);
      }
    });
  }

  // Process deny tags
  if (configValues.deny) {
    configValues.deny.forEach((data) => {
      if (data.tag) {
        tags.deny.push(data.tag);
      }
    });
  }

  // Process constrain tags
  if (configValues.constrain) {
    // Collect all filter values from constrain
    const filterTags = configValues.constrain
      .filter((c: { tag?: string; filter?: string }) => 'filter' in c)
      .map((c: { tag?: string; filter?: string }) => c.filter)
      .filter((filter): filter is string => filter !== undefined);

    configValues.constrain.forEach((data) => {
      if ('tag' in data && data.tag) {
        const constraintTag = data.tag;
        tagsFromOtherSelections.forEach(tag => {
          if (tag.startsWith(constraintTag)) {
            // Skip if any filter matches (exact or prefix) this tag
            let skip = false;
            for (const filterTag of filterTags) {
              if (tag === filterTag || tag.startsWith(filterTag) || filterTag.startsWith(tag)) {
                skip = true;
                break;
              }
            }
            if (!skip) {
              tags.require.push(tag);
            }
          }
        });
      }
    });
  }

  return tags;
}

/**
 * Create a deep link URL with tags and optional search term
 * @param tags - Array of tags to include in the URL
 * @param searchTerm - Optional search term to include
 * @returns URL query string
 */
export function createDeepLink(tags: string[], searchTerm?: string | null): string {
  const params = tags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&');
  if (searchTerm) {
    return `${params}&search=${encodeURIComponent(searchTerm)}`;
  }
  return params;
} 