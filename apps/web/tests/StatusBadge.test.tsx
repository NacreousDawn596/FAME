import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LocaleProvider } from '../src/i18n/LocaleContext';
import { QueueStatusBadge, StationStatusBadge } from '../src/components/StatusBadge';

function wrap(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <LocaleProvider>{ui}</LocaleProvider>
    </BrowserRouter>,
  );
}

describe('StatusBadge', () => {
  it('renders a French label for WAITING', () => {
    wrap(<QueueStatusBadge status="WAITING" />);
    expect(screen.getByText('En attente')).toBeInTheDocument();
  });

  it('renders a French label for CALLED', () => {
    wrap(<QueueStatusBadge status="CALLED" />);
    expect(screen.getByText('Appelé')).toBeInTheDocument();
  });

  it('renders station status labels', () => {
    wrap(<StationStatusBadge status="OCCUPIED" />);
    expect(screen.getByText('Occupé')).toBeInTheDocument();
  });
});
