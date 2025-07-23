'use client'

import React, { useState, useEffect, useRef } from 'react';
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

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ target }) => {
  const [content, setContent] = useState('');
  const [documentType, setDocumentType] = useState<'changelog' | 'instructions'>('instructions');
  const [isLive, setIsLive] = useState(true);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [existingDoc, setExistingDoc] = useState<DocumentationData | null>(null);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const editorRef = useRef<any>(null);

  // Load existing documentation
  useEffect(() => {
    const loadExistingDocumentation = async () => {
      try {
        if (target.type === 'blueprint') {
          const response = await fetch(`/api/blueprints/${target.blueprint.id}/documentation`);
          if (response.ok) {
            const docs = await response.json();
            const instructions = docs.documentation?.find((doc: any) => doc.document_type === 'instructions');
            if (instructions) {
              setExistingDoc(instructions);
              setContent(instructions.document);
              setDocumentType(instructions.document_type);
              setIsLive(instructions.is_live);
            }
          }
        } else {
          const tagPath = target.tag.join('/');
          const response = await fetch(`/api/tags/${tagPath}/documentation`);
          if (response.ok) {
            const docs = await response.json();
            const instructions = docs.documentation?.find((doc: any) => doc.document_type === 'instructions');
            if (instructions) {
              setExistingDoc(instructions);
              setContent(instructions.document);
              setDocumentType(instructions.document_type);
              setIsLive(instructions.is_live);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load existing documentation:', err);
      }
    };

    loadExistingDocumentation();
  }, [target]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (content.trim()) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveDocument(false); // false = don't make live
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, documentType]);

  const saveDocument = async (makeLive: boolean = false) => {
    if (!content.trim()) return;

    setSaving(true);
    setSaveStatus('saving');
    setError(null);

    try {
      const saveData = {
        document: content,
        document_type: documentType,
        is_live: makeLive ? true : false,
      };

      let response;
      if (target.type === 'blueprint') {
        if (existingDoc?.id) {
          // Update existing
          response = await fetch(`/api/blueprints/${target.blueprint.id}/documentation/${existingDoc.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData),
          });
        } else {
          // Create new
          response = await fetch(`/api/blueprints/${target.blueprint.id}/documentation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData),
          });
        }
      } else {
        const tagPath = target.tag.join('/');
        if (existingDoc?.id) {
          // Update existing
          response = await fetch(`/api/tags/${tagPath}/documentation/${existingDoc.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData),
          });
        } else {
          // Create new
          response = await fetch(`/api/tags/${tagPath}/documentation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData),
          });
        }
      }

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
  };

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

          <label className="live-toggle">
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
            />
            Live
          </label>

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