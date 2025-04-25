'use client'

import React, { useEffect, useState } from 'react';
import { Blueprint } from '@/types';
import { useBlueprintContext } from '@/contexts/blueprint-context';
import { useTagContext } from '@/contexts/tag-context';
import { formatFileSize } from '@/utils/format';
import newGithubIssueUrl from 'new-github-issue-url';
import PartSelectionModal from './part-selection-modal';

interface BlueprintContainerProps {
  configValues?: Record<string, any> | null;
  onPartSelected?: (partName: string, blueprint: Blueprint) => void;
}

const ConfigBox = ({ title, value }: { title: string; value: any }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const blueprint = useBlueprintContext((state) => state.selectedBlueprint);
  const configSelections = useBlueprintContext((state) => state.configSelections);
  const setConfigSelection = useBlueprintContext((state) => state.setConfigSelection);
  const selectedBlueprint = configSelections[title];

  const handlePartSelected = (partName: string, blueprint: Blueprint) => {
    setConfigSelection(partName, blueprint);
    setIsModalOpen(false);
  };

  const handleOpenModal = () => {
    // Collect all tags from other selected blueprints
    const otherBlueprintTags = new Set<string>();
    Object.entries(configSelections).forEach(([key, bp]) => {
      if (key !== title) {
        bp.tags.forEach(tag => otherBlueprintTags.add(tag));
      }
    });
    setIsModalOpen(true);
  };

  const renderValue = (val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-gray-500">null</span>;
    }
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return (
          <ul className="list-disc pl-4">
            {val.map((item, index) => (
              <li key={index}>{renderValue(item)}</li>
            ))}
          </ul>
        );
      }
      return (
        <div className="pl-4">
          {Object.entries(val).map(([key, value]) => (
            <div key={key} className="mt-2">
              <strong>{key}:</strong> {renderValue(value)}
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(val)}</span>;
  };

  // Generate otherBlueprintTags from the blueprint store
  const otherBlueprintTags = new Set<string>();
  Object.entries(configSelections).forEach(([key, bp]) => {
    if (key !== title) {
      bp.tags.forEach(tag => otherBlueprintTags.add(tag));
    }
  });

  return (
    <div className="border rounded p-4 mb-4 flex-1 min-w-[200px] mr-4 relative group">
      <h3 className="text-lg font-semibold mb-2 cursor-help" title={JSON.stringify(value, null, 2)}>
        {title}
      </h3>
      {selectedBlueprint ? (
        <div className="mt-2">
          <div className="font-medium">{selectedBlueprint.blueprint_name}</div>
          {selectedBlueprint.images[0] && (
            <img 
              src={selectedBlueprint.images[0].image_url} 
              alt={selectedBlueprint.blueprint_name}
              className="mt-2 max-w-[200px] max-h-[200px] object-contain"
            />
          )}
          <button
            onClick={() => setConfigSelection(title, null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Clear Selection
          </button>
        </div>
      ) : (
        <div className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute left-0 top-full mt-2 w-full bg-white border rounded p-4 shadow-lg z-10">
          {renderValue(value)}
        </div>
      )}
      <button
        onClick={handleOpenModal}
        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        {selectedBlueprint ? 'Change Part' : 'Select Part'}
      </button>
      <PartSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        partName={title}
        configValues={value}
        onPartSelected={handlePartSelected}
        tagsFromOtherSelections={Array.from(otherBlueprintTags)}
      />
    </div>
  );
};

const BlueprintContainer = ({ configValues, onPartSelected }: BlueprintContainerProps) => {
  const blueprint = useBlueprintContext((state) => state.selectedBlueprint);
  const configSelections = useBlueprintContext((state) => state.configSelections);
  const addTag = useTagContext((state) => state.addTag);
  const clearTags = useTagContext((state) => state.clearTags);
  const addAllTags = useTagContext((state) => state.addAllTags);
  const [copied, setCopied] = useState(false);
  
  const shouldShowDownloadLink = (blueprint: Blueprint) => {
    if (blueprint.file_name) {
      return true;
    }
    if (blueprint.blueprint_config) {
      const config_keys = Object.keys(blueprint.blueprint_config)
      const selection_keys = Object.keys(configSelections)
      return config_keys.every(key => selection_keys.includes(key))
    }
    return false;
  };

  useEffect(() => {
    // Handle URL cleanup and browser navigation
    if (blueprint) {
      // Remove blueprint_id from URL after it's been used
      const params = new URLSearchParams(window.location.search);
      if (params.has('blueprint_id')) {
        params.delete('blueprint_id');
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newUrl);
      }
    }

    // Handle browser back/forward buttons
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const blueprintId = params.get('blueprint_id');
      if (!blueprintId && blueprint) {
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [blueprint]);

  const copyToClipboard = (blueprint_id: string) => {
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.split("?")[0];
    navigator.clipboard.writeText(baseUrl + '?blueprint_id=' + blueprint_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwapTags = (e: React.MouseEvent, blueprint: Blueprint, tagType: string) => {
    e.preventDefault();
    const newTags = blueprint.tags.filter(t => !t.startsWith(tagType));
    clearTags();
    addAllTags(newTags);
  };

  if (!blueprint) {
    return <div>No Blueprint Selected</div>;
  }

  const issue_url = newGithubIssueUrl({
    user: 'devonjones',
    repo: 'openforge_catalog',
    body: 'Model Reported: ' + window.location + '\n---\n\n\n'
  });

  const downloadUrl = "/api/blueprints/" + blueprint.id + "/download";

  const laterDate = new Date(
    Math.max(
      new Date(blueprint.file_changed_at).getTime(),
      new Date(blueprint.file_modified_at).getTime()
    )
  );

  const currentPath = window.location.pathname;

  return (
    <div className='blueprintContainer'>
      <h2>
        <div title={blueprint.full_name}>{blueprint.blueprint_name}</div>
        {!configValues && (
          <div className="blueprintLinks">
            <a className='visibleLink' href={`${currentPath}?blueprint_id=${blueprint.id}`}>deeplink</a>&nbsp;
            <button title={copied ? "url copied" : "Copy url to clipboard"} onClick={() => copyToClipboard(blueprint.id)} className="copyButton">
              <svg className="octicon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path>
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path>
              </svg>
            </button>
          </div>
        )}
      </h2>
      <p><strong>Type:</strong> {blueprint.blueprint_type}</p>
      <p><strong>Last Modified:</strong> {laterDate.toLocaleString()}, <strong>Size:</strong> {formatFileSize(blueprint.file_size)}</p>
      <p>{blueprint.tags.map(tag => (
        <button
          key={tag}
          onClick={() => addTag(tag)}
          className="inline-block px-2 py-1 mr-2 text-sm bg-blue-100 hover:bg-blue-200 rounded-md cursor-pointer"
        >
          {tag}
        </button>
      ))}</p>
      {!configValues && (
        <p>
          <strong>Find related:</strong>&nbsp;
          <a className='visibleLink' href="#" onClick={(e) => handleSwapTags(e, blueprint, 'texture')}>textures</a>,&nbsp;
          <a className='visibleLink' href="#" onClick={(e) => handleSwapTags(e, blueprint, 'size')}>sizes</a>,&nbsp;
          <a className='visibleLink' href="#" onClick={(e) => handleSwapTags(e, blueprint, 'connection')}>connections</a>
        </p>
      )}
      <p>
        <strong>
          {configValues ? (
            <a className='visibleLink' href="#" onClick={(e) => {
              e.preventDefault();
              if (onPartSelected && blueprint) {
                onPartSelected(configValues.partName, blueprint);
              }
            }}>Select This Part</a>
          ) : (
            shouldShowDownloadLink(blueprint) && (
              <a className='visibleLink' href={downloadUrl} download={blueprint.file_name}>Download</a>
            )
          )}
        </strong>&nbsp;
        (<a className='visibleLink' href={issue_url} target="_blank" rel="noopener noreferrer">Report Issue with this model</a>)</p>
      
      {blueprint.blueprint_config && Object.keys(blueprint.blueprint_config).length > 0 && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Parts Needed to Build</h3>
          <div className="flex flex-wrap">
            {Object.entries(blueprint.blueprint_config).map(([key, value]) => (
              <ConfigBox key={key} title={key} value={value} />
            ))}
          </div>
        </div>
      )}

      <div>
        {blueprint.images.map((image) => (
          <div key={image.id}>
            <img src={image.image_url} alt={image.image_name} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlueprintContainer;