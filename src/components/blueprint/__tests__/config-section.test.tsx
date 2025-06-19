import React from 'react';
import { render, screen } from '@testing-library/react';
import ConfigSection from '../config-section';
import { createMockBlueprint } from '@/test-utils';
import { ConfigPart } from '@/types';

// Mock ConfigBox component
jest.mock('../config-box', () => {
  return function MockConfigBox({ title }: { title: string; value: unknown }) {
    return <div data-testid={`config-box-${title}`}>{title}</div>;
  };
});

describe('ConfigSection', () => {
  const mockBlueprint = createMockBlueprint({
    blueprint_config: {
      parts: [
        {
          name: 'part1',
          tags: { require: [{ tag: 'required_tag' }], deny: [], accept: [], constrain: [] }
        } as ConfigPart,
        {
          name: 'part2',
          tags: { require: [{ tag: 'required_tag2' }], deny: [], accept: [], constrain: [] }
        } as ConfigPart,
      ]
    }
  });

  const mockNestedConfigs = {
    'parent_part': [
      {
        name: 'child_part',
        tags: { require: [{ tag: 'child_tag' }], deny: [], accept: [], constrain: [] }
      } as ConfigPart,
    ]
  };

  it('renders main blueprint config parts when present', () => {
    render(
      <ConfigSection 
        blueprint={mockBlueprint}
        nestedConfigs={{}}
        configValues={null}
      />
    );

    expect(screen.getByText('Parts Needed to Build')).toBeInTheDocument();
    expect(screen.getByTestId('config-box-part1')).toBeInTheDocument();
    expect(screen.getByTestId('config-box-part2')).toBeInTheDocument();
  });

  it('renders nested config boxes for selected parts', () => {
    const blueprintWithParentPart = createMockBlueprint({
      blueprint_config: {
        parts: [
          {
            name: 'parent_part',
            tags: { require: [{ tag: 'parent_tag' }], deny: [], accept: [], constrain: [] }
          } as ConfigPart,
        ]
      }
    });

    render(
      <ConfigSection 
        blueprint={blueprintWithParentPart}
        nestedConfigs={mockNestedConfigs}
        configValues={null}
      />
    );

    expect(screen.getByText('Parts Needed for parent_part')).toBeInTheDocument();
    expect(screen.getByTestId('config-box-parent_part|child_part')).toBeInTheDocument();
  });

  it('filters out fulfilled parts when rendering config boxes', () => {
    const blueprintWithFulfills = createMockBlueprint({
      blueprint_config: {
        parts: [
          {
            name: 'part1',
            tags: { require: [{ tag: 'required_tag' }], deny: [], accept: [], constrain: [] }
          } as ConfigPart,
          {
            name: 'part2',
            tags: { require: [{ tag: 'required_tag2' }], deny: [], accept: [], constrain: [] }
          } as ConfigPart,
        ],
        fulfills: [{ part: 'part1' }]
      }
    });

    render(
      <ConfigSection 
        blueprint={blueprintWithFulfills}
        nestedConfigs={{}}
        configValues={null}
      />
    );

    expect(screen.queryByTestId('config-box-part1')).not.toBeInTheDocument();
    expect(screen.getByTestId('config-box-part2')).toBeInTheDocument();
  });

  it('filters out fulfilled parts in nested configs', () => {
    const blueprintWithParentPart = createMockBlueprint({
      blueprint_config: {
        parts: [
          {
            name: 'parent_part',
            tags: { require: [{ tag: 'parent_tag' }], deny: [], accept: [], constrain: [] },
            fulfills: [{ part: 'child_part' }]
          } as ConfigPart,
        ]
      }
    });

    const nestedConfigsWithMultipleParts = {
      'parent_part': [
        {
          name: 'child_part',
          tags: { require: [{ tag: 'child_tag' }], deny: [], accept: [], constrain: [] }
        } as ConfigPart,
        {
          name: 'other_child',
          tags: { require: [{ tag: 'other_tag' }], deny: [], accept: [], constrain: [] }
        } as ConfigPart,
      ]
    };

    render(
      <ConfigSection 
        blueprint={blueprintWithParentPart}
        nestedConfigs={nestedConfigsWithMultipleParts}
        configValues={null}
      />
    );

    expect(screen.queryByTestId('config-box-parent_part|child_part')).not.toBeInTheDocument();
    expect(screen.getByTestId('config-box-parent_part|other_child')).toBeInTheDocument();
  });

  it('returns null when configValues is provided', () => {
    const { container } = render(
      <ConfigSection 
        blueprint={mockBlueprint}
        nestedConfigs={mockNestedConfigs}
        configValues={{ partName: 'test_part' }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('returns null when blueprint has no config parts', () => {
    const blueprintWithoutConfig = createMockBlueprint();

    const { container } = render(
      <ConfigSection 
        blueprint={blueprintWithoutConfig}
        nestedConfigs={{}}
        configValues={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('handles empty nested configs', () => {
    render(
      <ConfigSection 
        blueprint={mockBlueprint}
        nestedConfigs={{}}
        configValues={null}
      />
    );

    expect(screen.getByText('Parts Needed to Build')).toBeInTheDocument();
    expect(screen.queryByText(/Parts Needed for/)).not.toBeInTheDocument();
  });

  it('handles nested configs with no valid parts after filtering', () => {
    const blueprintWithParentPart = createMockBlueprint({
      blueprint_config: {
        parts: [
          {
            name: 'parent_part',
            tags: { require: [{ tag: 'parent_tag' }], deny: [], accept: [], constrain: [] },
            fulfills: [{ part: 'child_part' }]
          } as ConfigPart,
        ]
      }
    });

    const nestedConfigsWithOnlyFulfilledParts = {
      'parent_part': [
        {
          name: 'child_part',
          tags: { require: [{ tag: 'child_tag' }], deny: [], accept: [], constrain: [] }
        } as ConfigPart,
      ]
    };

    render(
      <ConfigSection 
        blueprint={blueprintWithParentPart}
        nestedConfigs={nestedConfigsWithOnlyFulfilledParts}
        configValues={null}
      />
    );

    expect(screen.getByText('Parts Needed to Build')).toBeInTheDocument();
    expect(screen.queryByText('Parts Needed for parent_part')).not.toBeInTheDocument();
  });
}); 