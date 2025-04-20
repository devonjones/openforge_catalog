'use client'

import React, { useEffect, useState } from 'react';
import { Blueprint } from '@/types';
import useBlueprintStore from '@/stores/blueprints-store';
import useTagStore from '@/stores/tag-store';
import { formatFileSize } from '@/utils/format';
import newGithubIssueUrl from 'new-github-issue-url';
import { usePartSearchContext } from '@/contexts/part-search-context';
import { useBlueprintsContext } from '@/contexts/blueprints-context';

interface BlueprintContainerProps {
  blueprint: Blueprint | null;
  isPartSearch?: boolean;
}

const BlueprintContainer = ({ blueprint, isPartSearch = false }: BlueprintContainerProps) => {
  const addTag = useTagStore((state) => state.addTag);
  const clearTags = useTagStore((state) => state.clearTags);
  const addAllTags = useTagStore((state) => state.addAllTags);
  const fetchBlueprints = useTagStore((state) => state.fetchBlueprints);
  const [copied, setCopied] = useState(false);
  
  // Only use the appropriate context based on isPartSearch
  const context = isPartSearch ? usePartSearchContext() : useBlueprintsContext();

  useEffect(() => {
    // Handle browser back/forward buttons
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const blueprintId = params.get('blueprint_id');
      if (!blueprintId && blueprint) {
        // Clear the blueprint selection if there's no ID in the URL
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [blueprint]);

  const copyToClipboard = (blueprint_id: string) => {
    const currentUrl = window.location.href;
    const urlWithoutParameters = currentUrl.split("?")[0];
    navigator.clipboard.writeText(urlWithoutParameters + '?blueprint_id=' + blueprint_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwapTags = (blueprint: Blueprint, tag: string) => {
    const newTags = blueprint.tags.filter(t => !t.startsWith(tag));
    clearTags();
    addAllTags(newTags);
  };

  if (!blueprint) {
    return <div>{context.noSelectionText}</div>;
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

  return (
    <div className='blueprintContainer'>
      <h2>
        <div title={blueprint.full_name}>{blueprint.blueprint_name}</div>
        <div className="blueprintLinks">
          <a className='visibleLink' href={`/?blueprint_id=${blueprint.id}`}>deeplink</a>&nbsp;
          <button title={copied ? "url copied" : "Copy url to clipboard"} onClick={() => copyToClipboard(blueprint.id)} className="copyButton">
            <svg className="octicon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path>
              <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path>
            </svg>
          </button>
        </div>
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
      <p>
        <strong>Find related:</strong>&nbsp;
        <a className='visibleLink' href="#" onClick={() => handleSwapTags(blueprint, 'texture')}>textures</a>,&nbsp;
        <a className='visibleLink' href="#" onClick={() => handleSwapTags(blueprint, 'size')}>sizes</a>,&nbsp;
        <a className='visibleLink' href="#" onClick={() => handleSwapTags(blueprint, 'connection')}>connections</a>
      </p>
      <p>
        <strong>
          <a className='visibleLink' href={downloadUrl} download={blueprint.file_name}>Download</a></strong>&nbsp;
          (<a className='visibleLink' href={issue_url} target="_blank" rel="noopener noreferrer">Report Issue with this model</a>)</p>
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