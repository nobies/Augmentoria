import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { RequireAuth } from './RequireAuth';

function renderRoutes(initialPath = '/app/projects') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<p>Login screen</p>} />
          <Route
            path="/app/projects"
            element={
              <RequireAuth>
                <p>Protected projects</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('RequireAuth', () => {
  beforeEach(() => localStorage.clear());

  it('redirects an anonymous visitor to login', () => {
    renderRoutes();
    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected projects')).not.toBeInTheDocument();
  });

  it('renders protected content for a stored session', () => {
    localStorage.setItem(
      'augmentoria-auth-user',
      JSON.stringify({
        id: 'u-mw',
        name: 'Mohamed Wageeh',
        email: 'm.wageeh@aroma.studio',
        roleId: 'am',
        companyId: 'c-aroma'
      })
    );

    renderRoutes();
    expect(screen.getByText('Protected projects')).toBeInTheDocument();
  });

  it('locks out a suspended member even with a stored session', async () => {
    localStorage.setItem(
      'augmentoria-auth-user',
      JSON.stringify({
        id: 'u-mw',
        name: 'Mohamed Wageeh',
        email: 'm.wageeh@aroma.studio',
        roleId: 'am',
        companyId: 'c-aroma'
      })
    );
    const { actions } = await import('../lib/store');
    actions.setMemberStatus('u-mw', 'suspended', 'u-ca');

    renderRoutes();
    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected projects')).not.toBeInTheDocument();
  });

  it('locks out a session whose member record was removed', async () => {
    localStorage.setItem(
      'augmentoria-auth-user',
      JSON.stringify({
        id: 'u-mw',
        name: 'Mohamed Wageeh',
        email: 'm.wageeh@aroma.studio',
        roleId: 'am',
        companyId: 'c-aroma'
      })
    );
    const { actions } = await import('../lib/store');
    actions.removeMember('u-mw', 'u-ca');

    renderRoutes();
    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected projects')).not.toBeInTheDocument();
  });
});
