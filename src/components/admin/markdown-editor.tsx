'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ImagePicker from './image-picker';
import { Blueprint } from '@/types';

// Dynamic import to avoid SSR issues with markdown editor
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);

type DocumentationTarget = 
  | { type: 'blueprint'; blueprint: Blueprint }
  | { type: 'tag'; tag: string[] };

interface MarkdownEditorProps {
  target: DocumentationTarget;
}

interface DocumentationData {
  id?: string;
  document: string;
  document_type: 'changelog' | 'instructions';
  is_live: boolean;
}

interface ApiDocumentationItem {
  id: string;
  document: string;
  document_type: 'changelog' | 'instructions';
  is_live: boolean;
  created_at: string;
  updated_at: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ target }) => {
  const [content, setContent] = useState('');
  const [documentType, setDocumentType] = useState<'changelog' | 'instructions'>('instructions');
  const [isLive, setIsLive] = useState(true);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [existingDoc, setExistingDoc] = useState<DocumentationData | null>(null);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const editorRef = useRef<{ api?: { replaceSelection: (text: string) => void } }>(null);

  // Helper function to load and select the correct instructions document
  const loadInstructionsDocument = async (endpoint: string, targetName: string): Promise<ApiDocumentationItem | null> => {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return null;
    }
    
    const docs = await response.json();
    const instructionsDocs = docs.documentation?.filter((doc: ApiDocumentationItem) => doc.document_type === 'instructions') || [];
    
    if (instructionsDocs.length > 1) {
      console.warn(`Multiple instructions documents found for ${targetName}. This should not happen.`);
      // Prioritize live document, then most recently updated
      const liveDoc = instructionsDocs.find((doc: ApiDocumentationItem) => doc.is_live);
      if (liveDoc) {
        return liveDoc;
      } else {
        // Sort by updated_at descending and take the most recent
        const sortedDocs = instructionsDocs.sort((a: ApiDocumentationItem, b: ApiDocumentationItem) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        return sortedDocs[0];
      }
    } else if (instructionsDocs.length === 1) {
      return instructionsDocs[0];
    }
    
    return null;
  };

  // Load existing documentation
  useEffect(() => {
    let isCancelled = false;

    const loadExistingDocumentation = async () => {
      try {
        let docToSet: DocumentationData | null = null;
        
        if (target.type === 'blueprint') {
          docToSet = await loadInstructionsDocument(
            `/api/blueprints/${target.blueprint.id}/documentation`,
            `blueprint ${target.blueprint.id}`
          );
        } else {
          const tagPath = target.tag.join('/');
          docToSet = await loadInstructionsDocument(
            `/api/tags/${tagPath}/documentation`,
            `tag ${tagPath}`
          );
        }

        if (!isCancelled && docToSet) {
          setExistingDoc(docToSet);
          setContent(docToSet.document);
          setDocumentType(docToSet.document_type);
          setIsLive(docToSet.is_live);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load existing documentation:', err);
        }
      }
    };

    loadExistingDocumentation();

    return () => {
      isCancelled = true;
    };
  }, [target]);

  const saveDocument = useCallback(async (makeLive: boolean = false) => {
    if (!content.trim()) return;

    setSaving(true);
    setSaveStatus('saving');
    setError(null);

    try {
      const saveData = {
        document: content,
        document_type: documentType,
        is_live: documentType === 'changelog' || makeLive,
      };

      // Determine base URL and method based on target type and whether document exists
      let baseUrl;
      if (target.type === 'blueprint') {
        baseUrl = `/api/blueprints/${target.blueprint.id}/documentation`;
      } else {
        const tagPath = target.tag.join('/');
        baseUrl = `/api/tags/${tagPath}/documentation`;
      }

      const url = existingDoc?.id ? `${baseUrl}/${existingDoc.id}` : baseUrl;
      const method = existingDoc?.id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) {
        throw new Error('Failed to save documentation');
      }

      const savedDoc = await response.json();
      setExistingDoc(savedDoc);
      setSaveStatus('saved');
      
      if (makeLive) {
        setIsLive(true);
      }

      // Clear saved status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save documentation');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [content, documentType, target, existingDoc]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (content.trim()) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        // Changelogs should always be live, instructions can be draft
        const shouldMakeLive = documentType === 'changelog';
        saveDocument(shouldMakeLive);
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, documentType, saveDocument]);

  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify({
      image_name: file.name,
      image_type: 'documentation'
    }));

    const response = await fetch('/api/admin/images', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const { image } = await response.json();
    return image.image_url;
  };

  const insertImage = (imageUrl: string, imageName: string) => {
    const imageMarkdown = `![${imageName}](${imageUrl})`;
    
    if (editorRef.current && editorRef.current.api) {
      editorRef.current.api.replaceSelection(imageMarkdown);
    }
  };

  const getTargetDisplay = () => {
    if (target.type === 'blueprint') {
      return target.blueprint.blueprint_name;
    } else {
      return target.tag.join(': ');
    }
  };

  return (
    <div className="markdown-editor">
      <div className="editor-header">
        <div className="target-info">
          <h4>Editing: {getTargetDisplay()}</h4>
        </div>
        
        <div className="editor-controls">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as 'changelog' | 'instructions')}
            className="document-type-select"
          >
            <option value="instructions">Instructions</option>
            <option value="changelog">Changelog</option>
          </select>

                                {documentType !== 'changelog' && (
                        <label className="live-toggle">
                          <input
                            type="checkbox"
                            checked={isLive}
                            onChange={(e) => setIsLive(e.target.checked)}
                          />
                          Live
                        </label>
                      )}

          <button
            onClick={() => saveDocument(true)}
            disabled={saving || !content.trim()}
            className="save-button"
          >
            {saving ? 'Saving...' : 'Save & Publish'}
          </button>
        </div>

        <div className="save-status">
          {saveStatus === 'saving' && <span className="saving">Saving...</span>}
          {saveStatus === 'saved' && <span className="saved">Saved</span>}
          {saveStatus === 'error' && <span className="error">Save failed</span>}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="editor-container">
        {/* @ts-expect-error - MDEditor has complex type definitions that conflict with our usage */}
        <MDEditor
          ref={editorRef}
          value={content}
          onChange={setContent}
          preview="edit"
          height={500}
          onDrop={handleImageUpload}
          textareaProps={{
            placeholder: "Enter documentation content...",
          }}
          commands={[
            {
              name: 'image-picker',
              keyCommand: 'image-picker',
              buttonProps: { 'aria-label': 'Insert image from library' },
              icon: <span>📷</span>,
              execute: () => setShowImagePicker(true),
            }
          ]}
        />
      </div>

      {showImagePicker && (
        <ImagePicker
          onSelect={(image) => {
            insertImage(image.image_url, image.image_name);
            setShowImagePicker(false);
          }}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  );
};

export default MarkdownEditor; 