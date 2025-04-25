'use client'

import React, { useEffect, useState } from 'react';
import { Blueprint, ConfigPart } from '@/types';
import { useBlueprintContext } from '@/contexts/blueprint-context';
import { useTagContext } from '@/contexts/tag-context';
import { formatFileSize } from '@/utils/format';
import { downloadFiles } from '@/utils/download';
import newGithubIssueUrl from 'new-github-issue-url';
import PartSelectionModal from './part-selection-modal';
import ConfigBox from './config-box';

interface BlueprintContainerProps {
  configValues?: Record<string, any> | null;
  onPartSelected?: (partName: string, blueprint: Blueprint) => void;
}

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
    if (blueprint.blueprint_config?.parts) {
      const requiredParts = blueprint.blueprint_config.parts.filter(part => 
        part.tags.require && part.tags.require.length > 0
      );
      return requiredParts.every(part => 
        configSelections[part.name] !== undefined
      );
    }
    return false;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    const urls: string[] = [];

    // Add main blueprint download if it has a file_name
    if (blueprint?.file_name) {
      urls.push(`/api/blueprints/${blueprint.id}/download`);
    }

    // Add downloads for each selected part
    Object.entries(configSelections).forEach(([_, bp]) => {
      if (bp.file_name) {
        urls.push(`/api/blueprints/${bp.id}/download`);
      }
    });

    downloadFiles(urls);
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
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25Z"></path>
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
              <a className='visibleLink' href="#" onClick={handleDownload}>Download</a>
            )
          )}
        </strong>&nbsp;
        (<a className='visibleLink' href={issue_url} target="_blank" rel="noopener noreferrer">Report Issue with this model</a>)</p>
      
      {blueprint.blueprint_config?.parts && blueprint.blueprint_config.parts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Parts Needed to Build</h3>
          <div className="flex flex-wrap">
            {blueprint.blueprint_config.parts.map((part: ConfigPart) => (
              <ConfigBox 
                key={part.name} 
                title={part.name} 
                value={part.tags} 
              />
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