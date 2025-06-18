import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { TagProvider, useTagContext } from '../tag-context';

// Mock fetch for async methods
const fetchMock = jest.fn();
global.fetch = fetchMock;

const TestComponent = () => {
  const selectedTags = useTagContext((state) => state.selectedTags);
  const denyTags = useTagContext((state) => state.denyTags);
  const tagDescriptions = useTagContext((state) => state.tagDescriptions);
  const data = useTagContext((state) => state.data);
  const expandedNodes = useTagContext((state) => state.expandedNodes);
  const searchTerm = useTagContext((state) => state.searchTerm);
  const blueprints = useTagContext((state) => state.blueprints);
  const paging = useTagContext((state) => state.paging);
  const autoload = useTagContext((state) => state.autoload);
  const addTag = useTagContext((state) => state.addTag);
  const removeTag = useTagContext((state) => state.removeTag);
  const clearTags = useTagContext((state) => state.clearTags);
  const addAllTags = useTagContext((state) => state.addAllTags);
  const setTagState = useTagContext((state) => state.setTagState);
  const setSearchTerm = useTagContext((state) => state.setSearchTerm);
  const toggleNode = useTagContext((state) => state.toggleNode);
  const fetchBlueprints = useTagContext((state) => state.fetchBlueprints);
  const fetchTagDescriptions = useTagContext((state) => state.fetchTagDescriptions);

  return (
    <div>
      <div data-testid="selected-tags">{selectedTags.join(',')}</div>
      <div data-testid="deny-tags">{denyTags.join(',')}</div>
      <div data-testid="search-term">{searchTerm || ''}</div>
      <div data-testid="autoload">{String(autoload)}</div>
      <div data-testid="blueprints-count">{blueprints.length}</div>
      <div data-testid="paging-total">{paging?.total_count ?? ''}</div>
      <div data-testid="tag-descriptions">{Object.keys(tagDescriptions).length}</div>
      <div data-testid="data-root-keys">{Object.keys(data).join(',')}</div>
      <div data-testid="expanded-nodes">{Object.keys(expandedNodes).join(',')}</div>
      <button data-testid="add-tag" onClick={() => addTag('foo|bar')}>Add Tag</button>
      <button data-testid="remove-tag" onClick={() => removeTag('foo|bar')}>Remove Tag</button>
      <button data-testid="clear-tags" onClick={() => clearTags()}>Clear Tags</button>
      <button data-testid="add-all-tags" onClick={() => addAllTags(['a|b','c|d'])}>Add All Tags</button>
      <button data-testid="set-tag-state" onClick={() => setTagState({ require: ['x'], deny: ['y'] })}>Set Tag State</button>
      <button data-testid="set-search-term" onClick={() => setSearchTerm('searchme')}>Set Search Term</button>
      <button data-testid="toggle-node" onClick={() => toggleNode('root')}>Toggle Node</button>
      <button data-testid="fetch-blueprints" onClick={() => fetchBlueprints()}>Fetch Blueprints</button>
      <button data-testid="fetch-tag-descriptions" onClick={() => fetchTagDescriptions()}>Fetch Tag Descriptions</button>
    </div>
  );
};

describe('TagContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        paging: { total_count: 1, start_count: 0 },
        blueprints: [{ id: 'b1', blueprint_name: 'BP1', tags: [] }],
        tag_counts: [],
      }),
      text: async () => JSON.stringify({ foo: 'desc' }),
    });
  });

  it('provides default state and allows tag manipulation', () => {
    render(
      <TagProvider autoload={false}>
        <TestComponent />
      </TagProvider>
    );
    // Default state
    expect(screen.getByTestId('selected-tags')).toHaveTextContent('');
    expect(screen.getByTestId('deny-tags')).toHaveTextContent('');
    expect(screen.getByTestId('search-term')).toHaveTextContent('');
    expect(screen.getByTestId('autoload')).toHaveTextContent('false');
    expect(screen.getByTestId('blueprints-count')).toHaveTextContent('0');
    expect(screen.getByTestId('paging-total')).toHaveTextContent('');
    expect(screen.getByTestId('tag-descriptions')).toHaveTextContent('0');

    // Add tag
    act(() => {
      screen.getByTestId('add-tag').click();
    });
    expect(screen.getByTestId('selected-tags')).toHaveTextContent('foo|bar');

    // Remove tag
    act(() => {
      screen.getByTestId('remove-tag').click();
    });
    expect(screen.getByTestId('selected-tags')).toHaveTextContent('');

    // Add all tags
    act(() => {
      screen.getByTestId('add-all-tags').click();
    });
    expect(screen.getByTestId('selected-tags')).toHaveTextContent('a|b,c|d');

    // Clear tags
    act(() => {
      screen.getByTestId('clear-tags').click();
    });
    expect(screen.getByTestId('selected-tags')).toHaveTextContent('');
  });

  it('setTagState sets require and deny tags', () => {
    render(
      <TagProvider autoload={false}>
        <TestComponent />
      </TagProvider>
    );
    act(() => {
      screen.getByTestId('set-tag-state').click();
    });
    expect(screen.getByTestId('selected-tags')).toHaveTextContent('x');
    expect(screen.getByTestId('deny-tags')).toHaveTextContent('y');
  });

  it('setSearchTerm updates searchTerm', () => {
    render(
      <TagProvider autoload={false}>
        <TestComponent />
      </TagProvider>
    );
    act(() => {
      screen.getByTestId('set-search-term').click();
    });
    expect(screen.getByTestId('search-term')).toHaveTextContent('searchme');
  });

  it('toggleNode toggles expandedNodes', () => {
    render(
      <TagProvider autoload={false}>
        <TestComponent />
      </TagProvider>
    );
    expect(screen.getByTestId('expanded-nodes')).toHaveTextContent('');
    act(() => {
      screen.getByTestId('toggle-node').click();
    });
    expect(screen.getByTestId('expanded-nodes')).toHaveTextContent('root');
    act(() => {
      screen.getByTestId('toggle-node').click();
    });
    expect(screen.getByTestId('expanded-nodes')).toHaveTextContent('root');
  });

  it('fetchBlueprints fetches and updates blueprints and paging', async () => {
    render(
      <TagProvider autoload={false}>
        <TestComponent />
      </TagProvider>
    );
    await act(async () => {
      screen.getByTestId('fetch-blueprints').click();
    });
    expect(fetchMock).toHaveBeenCalled();
    expect(screen.getByTestId('blueprints-count')).toHaveTextContent('1');
    expect(screen.getByTestId('paging-total')).toHaveTextContent('1');
  });

  it('fetchTagDescriptions fetches and updates tagDescriptions', async () => {
    render(
      <TagProvider autoload={false}>
        <TestComponent />
      </TagProvider>
    );
    await act(async () => {
      screen.getByTestId('fetch-tag-descriptions').click();
    });
    expect(fetchMock).toHaveBeenCalled();
    expect(screen.getByTestId('tag-descriptions')).not.toHaveTextContent('0');
  });
}); 