export function getOtherBlueprintTags(configSelections: Record<string, any>, title: string, blueprint: any): Set<string> {
  const otherBlueprintTags = new Set<string>();
  getParentBlueprintTags(configSelections, title).forEach(tag => otherBlueprintTags.add(tag));
  getSelectionsWithSamePrefix(configSelections, title).forEach(([_, bp]) => {
    bp.tags.forEach((tag: string) => otherBlueprintTags.add(tag));
  });
  console.log(otherBlueprintTags);
  return otherBlueprintTags;
}

export function getParentBlueprintTags(configSelections: Record<string, any>, title: string): Set<string> {
  const tags = new Set<string>();
  if (title.includes('|')) {
    const parentKey = title.split('|').slice(0, -1).join('|');
    const parentBlueprint = configSelections[parentKey];
    if (parentBlueprint && parentBlueprint.tags) {
      parentBlueprint.tags.forEach((tag: string) => tags.add(tag));
    }
  }
  return tags;
}

export function getSelectionsWithSamePrefix(configSelections: Record<string, any>, title: string): [string, any][] {
  if (title.includes('|')) {
    const currentPrefix = title.split('|')[0];
    return Object.entries(configSelections).filter(([key]) => key.split('|')[0] === currentPrefix);
  } else {
    // No prefix: only include entries without a prefix
    return Object.entries(configSelections).filter(([key]) => !key.includes('|'));
  }
}
