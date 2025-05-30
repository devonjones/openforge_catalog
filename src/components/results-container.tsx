'use client'

import React, { useEffect, useState } from 'react';
import { useBlueprintContext } from '@/contexts/blueprint-context';
import { useTagContext } from '@/contexts/tag-context';
import { Blueprint } from '@/types';
import './results-container.css';

interface ResultsContainerProps {
  configValues?: Record<string, any> | null;
  tagsFromOtherSelections?: string[];
}

const ResultsContainer = ({ configValues, tagsFromOtherSelections = [] }: ResultsContainerProps) => {
  const setSelectedBlueprint = useBlueprintContext((state) => state.setSelectedBlueprint);
  const selectedBlueprint = useBlueprintContext((state) => state.selectedBlueprint);
  const blueprints = useTagContext((state) => state.blueprints);
  const paging = useTagContext((state) => state.paging);
  const selectedTags = useTagContext((state) => state.selectedTags);
  const denyTags = useTagContext((state) => state.denyTags);
  const removeTag = useTagContext((state) => state.removeTag);
  const addTag = useTagContext((state) => state.addTag);
  const clearTags = useTagContext((state) => state.clearTags);
  const fetchBlueprints = useTagContext((state) => state.fetchBlueprints);
  const setTagState = useTagContext((state) => state.setTagState);
  const autoload = useTagContext((state) => state.autoload);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Read URL parameters and add tags
    if (typeof window !== 'undefined' && autoload) {
      const params = new URLSearchParams(window.location.search);
      
      // Handle tags
      const tagParams = params.getAll('tag');
      tagParams.forEach(tag => {
        if (!selectedTags.includes(tag)) {
          addTag(tag);
        }
      });

      // Handle blueprint selection
      const blueprintId = params.get('blueprint_id');
      if (blueprintId) {
        const blueprint = blueprints.find(b => b.id === blueprintId);
        if (blueprint) {
          setSelectedBlueprint(blueprint);
        }
      }

      // Remove tag parameters from URL after processing
      const newParams = new URLSearchParams();
      if (blueprintId) {
        newParams.set('blueprint_id', blueprintId);
      }
      const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [autoload]);

  useEffect(() => {
    if (configValues) {
      const tags = { require: [] as string[], deny: [] as string[] };
      if (configValues.require) {
        const require = configValues.require;
        for (const key in require) {
          const data = require[key];
          if (data.tag) {
            tags.require.push(data.tag as string);
          }
        }
      }
      if (configValues.deny) {
        const deny = configValues.deny;
        for (const key in deny) {
          const data = deny[key];
          if (data.tag) {
            tags.deny.push(data.tag as string);
          }
        }
      }
      if (configValues.constrain) {
        const constrain = configValues.constrain;
        // Collect all filter values from constrain
        const filterTags = constrain.filter((c: any) => 'filter' in c).map((c: any) => c.filter);
        for (const key in constrain) {
          const data = constrain[key];
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
                  tags.require.push(tag as string);
                }
              }
            });
          }
        }
      }
      setTagState(tags);
    }
  }, [configValues, setTagState]);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  const copyToClipboard = (text: string) => {
    const currentUrl = window.location.href;
    const urlWithoutParameters = currentUrl.split("?")[0];
    navigator.clipboard.writeText(urlWithoutParameters + '?' + text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  };

  const handleSelect = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
  };

  const handleRemoveTag = (tag: string) => {
    removeTag(tag);
  };

  const isTagRemovable = (tag: string): boolean => {
    // Tag is not removable if it's from other selections
    if (tagsFromOtherSelections.includes(tag)) {
      return false;
    }
    // If configValues exists, check if the tag is in require or deny
    if (configValues) {
      // Check require section
      if (configValues.require) {
        for (const key in configValues.require) {
          const data = configValues.require[key];
          if (data.tag === tag) {
            return false;
          }
        }
      }
      // Check deny section
      if (configValues.deny) {
        for (const key in configValues.deny) {
          const data = configValues.deny[key];
          if (data.tag === tag) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const createDeepLink = (tags: string[]) => {
    const params = tags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&');
    return `${params}`;
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    clearTags();
    // Update URL to remove tag parameters while preserving blueprint_id
    if (typeof window !== 'undefined') {
      const currentParams = new URLSearchParams(window.location.search);
      const blueprintId = currentParams.get('blueprint_id');
      
      const newParams = new URLSearchParams();
      if (blueprintId) {
        newParams.set('blueprint_id', blueprintId);
      }
      
      const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const startCount = (paging?.start_count ?? 0) + 1;
  const endCount = startCount + blueprints.length - 1;

  return (
    <div className='resultsContainer'>
      <h2>Blueprints</h2>
      {selectedTags.length > 0 && (
        <div className='selectedTagsContainer'>
          <div className='flex justify-between'>
            <div className='flex-1'>
              <div className='selectedTagsContainer__header'>
                Selected Tags
                {!configValues && (
                  <>
                    - <a className='visibleLink' href={"/?" + createDeepLink(selectedTags)}>deeplink</a>&nbsp;
                    <button title={copied ? "url copied" : "Copy url to clipboard"} onClick={() => copyToClipboard(createDeepLink(selectedTags))}>
                      <svg aria-hidden="true" focusable="false" className="octicon octicon-copy" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible">
                        <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                        <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                      </svg>
                    </button>
                  </>
                )}
              </div>
              <ul>
                {Array.from(new Set(selectedTags)).map((tag) => (
                  <li key={tag}>
                    {tag} {isTagRemovable(tag) && <button className="tagButton" onClick={() => handleRemoveTag(tag)}>-</button>}
                  </li>
                ))}
              </ul>
            </div>
            {denyTags.length > 0 && (
              <div className='flex-1 ml-4'>
                <div className='selectedTagsContainer__header'>
                  Denied Tags
                </div>
                <ul>
                  {denyTags.map((tag) => (
                    <li key={tag} className="text-red-600">
                      {tag} {isTagRemovable(tag) && <button className="tagButton" onClick={() => handleRemoveTag(tag)}>-</button>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {!configValues && <div className='selectedTagsContainer__header'><a className='visibleLink' href="#" onClick={handleClear}>clear</a></div>}
        </div>
      )}

      <ul>
        {blueprints.map((blueprint) => (
          <li
            key={blueprint.id}
            onClick={() => handleSelect(blueprint)}
            className={`blueprintListItem ${selectedBlueprint?.id === blueprint.id ? 'selected' : ''}`}
          >
            {blueprint.blueprint_name}
          </li>
        ))}
      </ul>
      
      <div className="totalCount">
        <strong>{startCount} - {endCount}</strong> of <strong>{paging?.total_count}</strong> that match your tags
      </div>

      <div className="pagination flex justify-between mt-4">
        {paging?.previous_token && startCount > 1 &&(
          <button
            onClick={() => fetchBlueprints({ previous: paging.previous_token })}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Previous Page
          </button>
        )}
        <div className="flex-grow"></div>
        {paging?.next_token && endCount < paging.total_count && (
          <button
            onClick={() => fetchBlueprints({ next: paging.next_token })}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Next Page
          </button>
        )}
      </div>
    </div>
  );
};

export default ResultsContainer;