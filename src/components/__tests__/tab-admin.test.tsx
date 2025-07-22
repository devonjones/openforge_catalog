import React from 'react';
import { render, screen } from '@testing-library/react';
import TabAdmin from '../tab-admin';

describe('TabAdmin', () => {
  it('should render admin panel title', () => {
    render(<TabAdmin />);

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('should render welcome message', () => {
    render(<TabAdmin />);

    expect(screen.getByText('Welcome to the admin panel. This is where admin features will be implemented.')).toBeInTheDocument();
  });

  it('should render placeholder message', () => {
    render(<TabAdmin />);

    expect(screen.getByText('Phase 2.4 will add documentation editing features here.')).toBeInTheDocument();
  });

  it('should have correct CSS classes', () => {
    render(<TabAdmin />);

    const adminTab = screen.getByText('Admin Panel').closest('.admin-tab');
    const adminContent = screen.getByText('Admin Panel').closest('.admin-content');
    const adminPlaceholder = screen.getByText('Phase 2.4 will add documentation editing features here.').closest('.admin-placeholder');

    expect(adminTab).toBeInTheDocument();
    expect(adminContent).toBeInTheDocument();
    expect(adminPlaceholder).toBeInTheDocument();
  });

  it('should render all expected elements', () => {
    render(<TabAdmin />);

    // Check for all text content
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the admin panel. This is where admin features will be implemented.')).toBeInTheDocument();
    expect(screen.getByText('Phase 2.4 will add documentation editing features here.')).toBeInTheDocument();
  });
}); 