'use client'

import React, { useEffect, useState } from 'react';
import { useBlueprintContext } from '@/contexts/blueprint-context';
import { useTagContext } from '@/contexts/tag-context';
import { Blueprint, ConfigTags } from '@/types';
import { processConfigValues, createDeepLink } from '@/utils/config-processing';
import { useUrlParameters } from '@/hooks/use-url-parameters';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { SelectedTagsDisplay } from '@/components/results/selected-tags-display';
import { BlueprintList } from '@/components/results/blueprint-list';
import './results-container.css';

interface ResultsContainerProps {
  configValues?: ConfigTags | null;
  tagsFromOtherSelections?: string[];
}

const ResultsContainer = ({ configValues, tagsFromOtherSelections = [] }: ResultsContainerProps) => {
  const setSelectedBlueprint = useBlueprintContext((state) => state.setSelectedBlueprint);
  const selectedBlueprint = useBlueprintContext((state) => state.selectedBlueprint);
  const blueprints = useTagContext((state) => state.blueprints);
  const paging = useTagContext((state) => state.paging);
  const selectedTags = useTagContext((state) => state.selectedTags);
  const denyTags = useTagContext((state) => state.denyTags);
  const searchTerm = useTagContext((state) => state.searchTerm);
  const removeTag = useTagContext((state) => state.removeTag);
  const clearTags = useTagContext((state) => state.clearTags);
  const fetchBlueprints = useTagContext((state) => state.fetchBlueprints);
  const setTagState = useTagContext((state) => state.setTagState);
  const fetchData = useTagContext((state) => state.fetchData);
  const setSearchTerm = useTagContext((state) => state.setSearchTerm);
  const [copied, setCopied] = useState(false);
  
  const { hasSetTagState } = useUrlParameters();

  useEffect(() => {
    if (fetchData && !hasSetTagState.current) {
      // Check if fetchData returns a promise
      const fetchDataResult = fetchData();
      if (fetchDataResult && typeof fetchDataResult.then === 'function') {
        fetchDataResult.then(() => {
          // Only set tag state after fetchData completes
          if (configValues) {
            const tags = processConfigValues(configValues, tagsFromOtherSelections);
            setTagState(tags);
            hasSetTagState.current = true;
          }
        });
      } else {
        // fetchData is not a promise, set tag state immediately
        if (configValues) {
          const tags = processConfigValues(configValues, tagsFromOtherSelections);
          setTagState(tags);
          hasSetTagState.current = true;
        }
      }
    }
  }, [configValues, setTagState, tagsFromOtherSelections, fetchData, hasSetTagState]);

  // Handle changes to configValues or tagsFromOtherSelections after initial setup
  useEffect(() => {
    if (hasSetTagState.current && configValues) {
      const tags = processConfigValues(configValues, tagsFromOtherSelections);
      setTagState(tags);
    }
  }, [configValues, setTagState, tagsFromOtherSelections, hasSetTagState]);

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
        for (const data of configValues.require) {
          if (data.tag === tag) {
            return false;
          }
        }
      }
      // Check deny section
      if (configValues.deny) {
        for (const data of configValues.deny) {
          if (data.tag === tag) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    clearTags();
    setSelectedBlueprint(null);
  };

  const startCount = (paging?.start_count ?? 0) + 1;
  const endCount = startCount + blueprints.length - 1;

  return (
    <div className='resultsContainer'>
      <h2>Blueprints</h2>
      {(selectedTags.length > 0 || searchTerm) && (
        <>
          <SelectedTagsDisplay
            selectedTags={selectedTags}
            denyTags={denyTags}
            searchTerm={searchTerm}
            configValues={configValues}
            isTagRemovable={isTagRemovable}
            onRemoveTag={handleRemoveTag}
            onClearSearch={() => setSearchTerm(null)}
            onCreateDeepLink={(tags) => createDeepLink(tags, searchTerm)}
            onCopyToClipboard={copyToClipboard}
            copied={copied}
          />
          {!configValues && <div className='selectedTagsContainer__header'><a className='visibleLink' href="#" onClick={handleClear}>clear</a></div>}
        </>
      )}

      <BlueprintList
        blueprints={blueprints}
        selectedBlueprint={selectedBlueprint}
        onSelectBlueprint={handleSelect}
      />
      
      <PaginationControls
        paging={paging}
        startCount={startCount}
        endCount={endCount}
        totalCount={paging?.total_count ?? 0}
        onPrevious={() => fetchBlueprints({ previous: paging?.previous_token })}
        onNext={() => fetchBlueprints({ next: paging?.next_token })}
      />
    </div>
  );
};

export default ResultsContainer;