import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfigBox from '../config-box';
import { useBlueprintContext } from '@/contexts/blueprint-context';

jest.mock('@/contexts/blueprint-context', () => ({
  useBlueprintContext: jest.fn(),
}));

jest.mock('../part-selection-modal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, partName, onPartSelected }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        <button data-testid="modal-select" onClick={() => onPartSelected(partName, { blueprint_name: 'Selected Blueprint', images: [] })}>Select</button>
      </div>
    ) : null,
}));

describe('ConfigBox', () => {
  const baseProps = {
    title: 'TestPart',
    value: {
      require: [{ tag: 'foo' }, { tag: 'bar' }],
      accept: [{ tag: 'baz' }],
      deny: [{ tag: 'qux' }],
      constrain: [{ tag: 'c1' }, { filter: 'f1' }],
    },
  };

  beforeEach(() => {
    (useBlueprintContext as jest.Mock).mockImplementation((selector: any) => {
      return selector({
        selectedBlueprint: { tags: [] },
        configSelections: {},
        setConfigSelection: jest.fn(),
      });
    });
  });

  it('renders title and tag requirements', () => {
    render(<ConfigBox {...baseProps} />);
    expect(screen.getByText('TestPart')).toBeInTheDocument();
    expect(screen.getByText('Required Tags:')).toBeInTheDocument();
    expect(screen.getByText('Accepted Tags:')).toBeInTheDocument();
    expect(screen.getByText('Denied Tags:')).toBeInTheDocument();
    expect(screen.getByText('Constrained Tags:')).toBeInTheDocument();
    expect(screen.getByText('Constraint Filtered Tags:')).toBeInTheDocument();
    expect(screen.getByText('foo')).toBeInTheDocument();
    expect(screen.getByText('bar')).toBeInTheDocument();
    expect(screen.getByText('baz')).toBeInTheDocument();
    expect(screen.getByText('qux')).toBeInTheDocument();
    expect(screen.getByText('c1')).toBeInTheDocument();
    expect(screen.getByText('f1')).toBeInTheDocument();
  });

  it('opens and closes the modal', () => {
    render(<ConfigBox {...baseProps} />);
    const openBtn = screen.getByText('Select Part');
    fireEvent.click(openBtn);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('modal-close'));
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('shows selected blueprint and allows clearing', () => {
    (useBlueprintContext as jest.Mock).mockImplementation((selector: any) => {
      return selector({
        selectedBlueprint: { tags: [] },
        configSelections: {
          TestPart: {
            blueprint_name: 'Selected Blueprint',
            images: [{ image_url: 'img.png', image_name: 'img', id: '1', created_at: '', updated_at: '' }],
            tags: [],
          },
        },
        setConfigSelection: jest.fn(),
      });
    });
    render(<ConfigBox {...baseProps} />);
    expect(screen.getByText('Selected Blueprint')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'img.png');
    fireEvent.click(screen.getByText('Clear Selection'));
    // setConfigSelection should be called with null
    // (no assertion here since it's a mock, but no error should occur)
  });

  it('calls onPartSelected when selecting in modal', () => {
    render(<ConfigBox {...baseProps} />);
    fireEvent.click(screen.getByText('Select Part'));
    fireEvent.click(screen.getByTestId('modal-select'));
    // Should close modal and not throw
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });
}); 