'use client'

import React, { useState } from 'react';
import BlueprintPicker from './blueprint-picker';
import TagPicker from './tag-picker';
import MarkdownEditor from './markdown-editor';
import { Blueprint } from '@/types';

type DocumentationTarget = 'blueprint' | 'tag';

const DocumentationEditor: React.FC = () => {
  const [targetType, setTargetType] = useState<DocumentationTarget>('blueprint');
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [selectedTag, setSelectedTag] = useState<string[] | null>(null);
  const [showBlueprintPicker, setShowBlueprintPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const handleBlueprintSelect = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
    setSelectedTag(null);
    setShowBlueprintPicker(false);
  };

  const handleTagSelect = (tag: string[]) => {
    setSelectedTag(tag);
    setSelectedBlueprint(null);
    setShowTagPicker(false);
  };

  const getCurrentTarget = () => {
    if (targetType === 'blueprint' && selectedBlueprint) {
      return { type: 'blueprint' as const, blueprint: selectedBlueprint };
    }
    if (targetType === 'tag' && selectedTag) {
      return { type: 'tag' as const, tag: selectedTag };
    }
    return null;
  };

  const formatTagDisplay = (tag: string[]) => {
    return tag.join(': ');
  };

  return (
    <div className="documentation-editor">
      <div className="editor-header">
        <h3>Documentation Editor</h3>
        
        {/* Target type selector */}
        <div className="target-type-selector">
          <label>
            <input
              type="radio"
              name="targetType"
              value="blueprint"
              checked={targetType === 'blueprint'}
              onChange={(e) => {
                setTargetType(e.target.value as DocumentationTarget);
                setSelectedBlueprint(null);
                setSelectedTag(null);
              }}
            />
            Blueprint
          </label>
          <label>
            <input
              type="radio"
              name="targetType"
              value="tag"
              checked={targetType === 'tag'}
              onChange={(e) => {
                setTargetType(e.target.value as DocumentationTarget);
                setSelectedBlueprint(null);
                setSelectedTag(null);
              }}
            />
            Tag
          </label>
        </div>

        {/* Target selector */}
        <div className="target-selector">
          {targetType === 'blueprint' ? (
            <div className="blueprint-selector">
              <button
                className="picker-button"
                onClick={() => setShowBlueprintPicker(true)}
              >
                {selectedBlueprint ? selectedBlueprint.blueprint_name : 'Select Blueprint'}
              </button>
              {selectedBlueprint && (
                <button
                  className="clear-button"
                  onClick={() => setSelectedBlueprint(null)}
                >
                  Clear
                </button>
              )}
            </div>
          ) : (
            <div className="tag-selector">
              <button
                className="picker-button"
                onClick={() => setShowTagPicker(true)}
              >
                {selectedTag ? formatTagDisplay(selectedTag) : 'Select Tag'}
              </button>
              {selectedTag && (
                <button
                  className="clear-button"
                  onClick={() => setSelectedTag(null)}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editor content */}
      {getCurrentTarget() && (
        <div className="editor-content">
          <MarkdownEditor target={getCurrentTarget()!} />
        </div>
      )}

      {/* Pickers */}
      {showBlueprintPicker && (
        <BlueprintPicker
          onSelect={handleBlueprintSelect}
          onClose={() => setShowBlueprintPicker(false)}
        />
      )}
      
      {showTagPicker && (
        <TagPicker
          onSelect={handleTagSelect}
          onClose={() => setShowTagPicker(false)}
        />
      )}
    </div>
  );
};

export default DocumentationEditor; 