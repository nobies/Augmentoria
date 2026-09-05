import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { validate } = vi.hoisted(() => ({ validate: vi.fn() }));
vi.mock('../../lib/reviewShare', () => ({ validateReviewShare: validate }));
vi.mock('../../i18n', () => ({ useLang: () => ({ lang: 'en' }) }));
vi.mock('./ReviewWorkspace', () => ({ default: () => <div>Protected review content</div> }));
import GuestReviewRoute from './GuestReviewRoute';

function Navigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/review/p-vodafone/V03?share=other-token')}>Other version</button>;
}

function open() {
  return render(<MemoryRouter initialEntries={['/review/p-vodafone/V04?share=test-token']}>
    <Navigation />
    <Routes><Route path="/review/:pid/:v" element={<GuestReviewRoute />} /></Routes>
  </MemoryRouter>);
}

async function unlock() {
  validate.mockResolvedValueOnce(true);
  fireEvent.change(screen.getByLabelText('Access code'), { target: { value: '123456' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Open review' })));
  expect(screen.getByText('Protected review content')).toBeVisible();
}

describe('guest access lifecycle', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_REQUIRE_REVIEW_SHARE_CODE', 'true');
    validate.mockReset();
    sessionStorage.clear();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

  it('does not trust a browser-stored grant', () => {
    sessionStorage.setItem('augmentoria-review-grant:p-vodafone:V04:test-token', '1');
    open();
    expect(screen.getByLabelText('Access code')).toBeVisible();
    expect(screen.queryByText('Protected review content')).not.toBeInTheDocument();
  });

  it('requires a new grant when the route or token changes', async () => {
    open();
    await unlock();
    fireEvent.click(screen.getByText('Other version'));
    expect(screen.getByLabelText('Access code')).toHaveValue('');
    expect(screen.queryByText('Protected review content')).not.toBeInTheDocument();
  });

  it('closes an open review when server access expires or is revoked', async () => {
    vi.useFakeTimers();
    open();
    await unlock();
    validate.mockResolvedValueOnce(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByRole('alert')).toHaveTextContent('expired');
    expect(screen.queryByText('Protected review content')).not.toBeInTheDocument();
  });
});
