import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LangProvider } from '../i18n';
import NotFoundPage from './NotFoundPage';

describe('NotFoundPage', () => {
  it('renders a useful recovery link', () => {
    render(
      <MemoryRouter>
        <LangProvider>
          <NotFoundPage />
        </LangProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
  });
});
