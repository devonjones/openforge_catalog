'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Blueprint, ConfigPart, ConfigTags } from '@/types';
import ConfigBox from './config-box';

interface BlueprintConfigSectionProps {
  blueprint: Blueprint;
  nestedConfigs: Record<string, ConfigPart[]>;
  configValues?: { partName: string } | null;
}

const BlueprintConfigSection: React.FC<BlueprintConfigSectionProps> = ({ 
  blueprint, 
  nestedConfigs, 
  configValues 
}) => {
  const [delayedHoveredPart, setDelayedHoveredPart] = useState<string | null>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  const handleBoxHover = (isHovering: boolean, key: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (isHovering) {
      hoverTimeout.current = setTimeout(() => {
        setDelayedHoveredPart(key);
      }, 1000);
    } else {
      setDelayedHoveredPart(null);
    }
  };

  const renderTagRequirements = (tags: ConfigTags) => {
    const requirements = [];
    
    if (tags.require && tags.require.length > 0) {
      requirements.push(
        <div key="require" className="mt-2">
          <strong className="text-green-600">Required Tags:</strong>
          <ul className="list-disc pl-4">
            {tags.require.map((tag, index) => (
              <li key={index}>{tag.tag}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (tags.accept && tags.accept.length > 0) {
      requirements.push(
        <div key="accept" className="mt-2">
          <strong className="text-blue-600">Accepted Tags:</strong>
          <ul className="list-disc pl-4">
            {tags.accept.map((tag, index) => (
              <li key={index}>{tag.tag}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (tags.deny && tags.deny.length > 0) {
      requirements.push(
        <div key="deny" className="mt-2">
          <strong className="text-red-600">Denied Tags:</strong>
          <ul className="list-disc pl-4">
            {tags.deny.map((tag, index) => (
              <li key={index}>{tag.tag}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (tags.constrain && tags.constrain.length > 0) {
      const tagConstraints = tags.constrain?.filter((c: { tag?: string; filter?: string }) => 'tag' in c) as { tag: string }[];
      const filterConstraints = tags.constrain?.filter((c: { tag?: string; filter?: string }) => 'filter' in c) as { filter: string }[];
      if (tagConstraints.length > 0) {
        requirements.push(
          <div key="constrain" className="mt-2">
            <strong className="text-yellow-600">Constrained Tags:</strong>
            <ul className="list-disc pl-4">
              {tagConstraints.map((tag, index) => (
                <li key={index}>{tag.tag}</li>
              ))}
            </ul>
          </div>
        );
      }

      if (filterConstraints.length > 0) {
        requirements.push(
          <div key="filter" className="mt-2">
            <strong className="text-purple-600">Constraint Filtered Tags:</strong>
            <ul className="list-disc pl-4">
              {filterConstraints.map((f, index) => (
                <li key={index}>{f.filter}</li>
              ))}
            </ul>
          </div>
        );
      }
    }

    return requirements;
  };

  const renderConfigBoxes = (parts: ConfigPart[], parentPath: string[] = [], parentFulfills: { part: string }[] = []) => {
    return (
      <div className="relative">
        <div className="flex flex-wrap">
          {parts
            .filter(part => !parentFulfills.some(f => f.part === part.name))
            .map((part: ConfigPart) => {
              const partPath = [...parentPath, part.name];
              const key = partPath.join('|');
              return (
                <ConfigBox
                  key={key}
                  title={key}
                  value={part.tags}
                  onHover={(isHovering) => handleBoxHover(isHovering, key)}
                />
              );
            })}
        </div>
        {delayedHoveredPart && (
          <div className="text-sm bg-white border rounded p-4 shadow-lg z-50 pointer-events-none mt-2">
            {(() => {
              const part = parts.find(p => {
                const partPath = [...parentPath, p.name];
                return partPath.join('|') === delayedHoveredPart;
              });
              return part?.tags ? renderTagRequirements(part.tags) : null;
            })()}
          </div>
        )}
      </div>
    );
  };

  if (configValues) {
    return null;
  }

  return (
    <>
      {/* Main blueprint config parts */}
      {blueprint.blueprint_config?.parts && blueprint.blueprint_config.parts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Parts Needed to Build</h3>
          {renderConfigBoxes(
            blueprint.blueprint_config.parts,
            [],
            blueprint.blueprint_config.fulfills || []
          )}
        </div>
      )}

      {/* Nested configs for selected parts */}
      {Object.entries(nestedConfigs).map(([partName, parts]) => {
        // Find fulfills for the part definition in the parent's config
        let fulfills: { part: string }[] = [];
        if (blueprint && blueprint.blueprint_config?.parts) {
          const parentPart = blueprint.blueprint_config.parts.find(p => p.name === partName);
          if (parentPart?.fulfills) {
            fulfills = parentPart.fulfills;
          }
        }
        // Filter parts to be shown
        const filteredParts = parts.filter(part => !fulfills.some(f => f.part === part.name));
        if (filteredParts.length === 0) return null;
        
        return (
          <div key={partName} className="mt-4">
            <h3 className="text-xl font-semibold mb-2">Parts Needed for {partName}</h3>
            {renderConfigBoxes(filteredParts, [partName], fulfills)}
          </div>
        );
      })}
    </>
  );
};

export default BlueprintConfigSection; 