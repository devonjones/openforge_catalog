import { ConfigTags, Blueprint, ConfigPart } from '@/types';

export interface ProcessedTags {
  require: string[];
  deny: string[];
}

export interface SiblingSelection {
  partName: string;
  tags: string[];
}

/**
 * Filter out more specific tags from a set of tags.
 * A tag is considered more specific if it starts with another tag plus a pipe.
 * @param tags - Array of tags to filter
 * @returns Array of most general tags
 */
function filterSpecificTags(tags: string[]): string[] {
  return tags.filter(tag => {
    // Check if any other tag is a prefix of this tag (when adding a pipe)
    return !tags.some(otherTag => 
      otherTag !== tag && tag.startsWith(otherTag + '|')
    );
  });
}

/**
 * Process config values to extract require, deny, and constrain tags
 * @param configValues - The configuration tags to process
 * @param parentTags - Tags from the parent blueprint
 * @param siblingSelections - Array of sibling part selections with their tags
 * @returns Object containing require and deny tag arrays
 */
export function processConfigValues(
  configValues: ConfigTags | null,
  parentTags: string[] = [],
  siblingSelections: SiblingSelection[] = []
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

    // For each constraint tag type (e.g. 'texture', 'connection')
    configValues.constrain.forEach((data) => {
      if ('tag' in data && data.tag) {
        const constraintTag = data.tag;
        const siblings = data.siblings;
        const parent = data.parent !== false; // Default to true if not specified

        // Collect tags from allowed sources
        const allowedTags: string[] = [];

        // Add parent tags if parent inheritance is enabled
        if (parent) {
          allowedTags.push(...parentTags);
        }

        // Add sibling tags based on siblings configuration
        if (siblings === undefined) {
          // Default behavior: consider all siblings
          siblingSelections.forEach(sibling => {
            allowedTags.push(...sibling.tags);
          });
        } else if (siblings.length > 0) {
          // Specific siblings only
          siblingSelections.forEach(sibling => {
            if (siblings.includes(sibling.partName)) {
              allowedTags.push(...sibling.tags);
            }
          });
        }
        // If siblings is empty array, don't add any sibling tags

        // Filter tags that match the constraint type and don't match any filters
        const matchingTags = allowedTags.filter(tag => {
          // Must match the constraint type
          if (!tag.startsWith(constraintTag)) {
            return false;
          }
          // Must not match any filters
          for (const filterTag of filterTags) {
            if (tag === filterTag || tag.startsWith(filterTag + '|') || filterTag.startsWith(tag + '|')) {
              return false;
            }
          }
          return true;
        });

        // Add the most general version of each matching tag
        if (matchingTags.length > 0) {
          const generalTags = filterSpecificTags(matchingTags);
          tags.require.push(...generalTags);
        }
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

/**
 * Build nested configs from configuration selections
 * @param configSelections - Current configuration selections
 * @returns Record of nested config parts by part name
 */
export function buildNestedConfigs(
  configSelections: Record<string, Blueprint>
): Record<string, ConfigPart[]> {
  const newNestedConfigs: Record<string, ConfigPart[]> = {};
  
  Object.entries(configSelections).forEach(([partName, bp]) => {
    if (bp.blueprint_config?.parts) {
      newNestedConfigs[partName] = bp.blueprint_config.parts;
    }
  });

  return newNestedConfigs;
} 