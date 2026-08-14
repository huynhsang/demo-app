import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewIssue from './NewIssue';
import { createIssue } from '../api';

vi.mock('../api', () => ({ createIssue: vi.fn() }));

const mockedCreateIssue = vi.mocked(createIssue);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NewIssue />
    </MemoryRouter>
  );
}

describe('NewIssue', () => {
  beforeEach(() => {
    mockedCreateIssue.mockReset();
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('synchronously blocks duplicate submissions and shows pending feedback', async () => {
    const request = deferred<{ id: number }>();
    mockedCreateIssue.mockReturnValue(request.promise as ReturnType<typeof createIssue>);
    const { container } = renderPage();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Printer is offline' } });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(mockedCreateIssue).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: 'Creating…' }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('unlocks after failure, reuses a key for unchanged input, and changes it for edited input', async () => {
    mockedCreateIssue
      .mockRejectedValueOnce(new Error('network failure'))
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce({ id: 7 } as Awaited<ReturnType<typeof createIssue>>);
    renderPage();
    const title = screen.getByLabelText('Title');
    fireEvent.change(title, { target: { value: 'Printer is offline' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Failed to create issue');
    expect((screen.getByRole('button', { name: 'Create issue' }) as HTMLButtonElement).disabled).toBe(
      false
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    await waitFor(() => expect(mockedCreateIssue).toHaveBeenCalledTimes(2));

    fireEvent.change(title, { target: { value: 'Printer is offline again' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));

    await waitFor(() => expect(mockedCreateIssue).toHaveBeenCalledTimes(3));
    expect(mockedCreateIssue.mock.calls[0][1]).toBe(mockedCreateIssue.mock.calls[1][1]);
    expect(mockedCreateIssue.mock.calls[2][1]).not.toBe(mockedCreateIssue.mock.calls[1][1]);
  });
});
