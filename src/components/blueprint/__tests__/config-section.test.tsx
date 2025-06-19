import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ConfigSection from '../config-section';
import { createMockBlueprint } from '@/test-utils';
import { ConfigPart } from '@/types';

// Mock ConfigBox component
jest.mock('../config-box', () => {
  return function MockConfigBox({ title, onHover }: { title: string; value: unknown; onHover?: (isHovering: boolean) => void }) {
    return (
      <div 
        data-testid={`config-box-${title}`}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
      >
        {title}
      </div>
    );
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

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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

  it('shows tooltip with tag requirements after hovering for 1000ms', async () => {
    render(
      <ConfigSection 
        blueprint={mockBlueprint}
        nestedConfigs={{}}
        configValues={null}
      />
    );

    const configBox = screen.getByTestId('config-box-part1');
    
    // Initially no tooltip should be visible
    expect(screen.queryByText('Required Tags:')).not.toBeInTheDocument();
    
    // Hover over the config box
    fireEvent.mouseEnter(configBox);
    
    // Tooltip should not appear immediately
    expect(screen.queryByText('Required Tags:')).not.toBeInTheDocument();
    
    // Fast-forward time by 1000ms
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Tooltip should now be visible
    expect(screen.getByText('Required Tags:')).toBeInTheDocument();
    expect(screen.getByText('required_tag')).toBeInTheDocument();
  });

  it('hides tooltip when mouse leaves before 1000ms', async () => {
    render(
      <ConfigSection 
        blueprint={mockBlueprint}
        nestedConfigs={{}}
        configValues={null}
      />
    );

    const configBox = screen.getByTestId('config-box-part1');
    
    // Hover over the config box
    fireEvent.mouseEnter(configBox);
    
    // Fast-forward time by 500ms (less than 1000ms)
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Tooltip should not be visible yet
    expect(screen.queryByText('Required Tags:')).not.toBeInTheDocument();
    
    // Mouse leaves before 1000ms
    fireEvent.mouseLeave(configBox);
    
    // Fast-forward to 1000ms
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Tooltip should still not be visible
    expect(screen.queryByText('Required Tags:')).not.toBeInTheDocument();
  });

  it('shows tooltip for nested config parts', async () => {
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

    const configBox = screen.getByTestId('config-box-parent_part|child_part');
    
    // Hover over the nested config box
    fireEvent.mouseEnter(configBox);
    
    // Fast-forward time by 1000ms
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Tooltip should be visible with nested part requirements
    expect(screen.getByText('Required Tags:')).toBeInTheDocument();
    expect(screen.getByText('child_tag')).toBeInTheDocument();
  });

  it('shows all tag requirement types in tooltip', async () => {
    const blueprintWithAllTagTypes = createMockBlueprint({
      blueprint_config: {
        parts: [
          {
            name: 'complex_part',
            tags: { 
              require: [{ tag: 'required_tag' }], 
              deny: [{ tag: 'denied_tag' }], 
              accept: [{ tag: 'accepted_tag' }], 
              constrain: [{ tag: 'constrained_tag' }, { filter: 'filtered_tag' }] 
            }
          } as ConfigPart,
        ]
      }
    });

    render(
      <ConfigSection 
        blueprint={blueprintWithAllTagTypes}
        nestedConfigs={{}}
        configValues={null}
      />
    );

    const configBox = screen.getByTestId('config-box-complex_part');
    
    // Hover over the config box
    fireEvent.mouseEnter(configBox);
    
    // Fast-forward time by 1000ms
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // All tag requirement types should be visible
    expect(screen.getByText('Required Tags:')).toBeInTheDocument();
    expect(screen.getByText('Denied Tags:')).toBeInTheDocument();
    expect(screen.getByText('Accepted Tags:')).toBeInTheDocument();
    expect(screen.getByText('Constrained Tags (Inherited):')).toBeInTheDocument();
    expect(screen.getByText('Constraint Filters:')).toBeInTheDocument();
    
    // Tag values should be visible
    expect(screen.getByText('required_tag')).toBeInTheDocument();
    expect(screen.getByText('denied_tag')).toBeInTheDocument();
    expect(screen.getByText('accepted_tag')).toBeInTheDocument();
    expect(screen.getByText('constrained_tag')).toBeInTheDocument();
    expect(screen.getByText('filtered_tag')).toBeInTheDocument();
  });

  it('switches tooltip when hovering different config boxes', async () => {
    render(
      <ConfigSection 
        blueprint={mockBlueprint}
        nestedConfigs={{}}
        configValues={null}
      />
    );

    const configBox1 = screen.getByTestId('config-box-part1');
    const configBox2 = screen.getByTestId('config-box-part2');
    
    // Hover over first config box
    fireEvent.mouseEnter(configBox1);
    
    // Fast-forward time by 1000ms
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // First tooltip should be visible
    expect(screen.getByText('required_tag')).toBeInTheDocument();
    expect(screen.queryByText('required_tag2')).not.toBeInTheDocument();
    
    // Hover over second config box
    fireEvent.mouseEnter(configBox2);
    
    // Fast-forward time by 1000ms for the second tooltip
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Second tooltip should be visible
    expect(screen.getByText('required_tag2')).toBeInTheDocument();
    expect(screen.queryByText('required_tag')).not.toBeInTheDocument();
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