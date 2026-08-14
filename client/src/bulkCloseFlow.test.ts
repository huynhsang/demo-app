import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { completeBulkClose } from './bulkCloseFlow.js';

describe('completeBulkClose', () => {
  test('clears selection after success and refreshes active filters', async () => {
    const calls: string[] = [];

    await completeBulkClose(
      [1, 2],
      'open',
      'checkout',
      async (ids) => {
        assert.deepEqual(ids, [1, 2]);
        calls.push('close');
      },
      () => calls.push('clear'),
      async (status, search) => {
        assert.equal(status, 'open');
        assert.equal(search, 'checkout');
        calls.push('refresh');
      }
    );

    assert.deepEqual(calls, ['close', 'clear', 'refresh']);
  });

  test('retains selection and skips refresh when close fails', async () => {
    let cleared = false;
    let refreshed = false;

    await assert.rejects(
      completeBulkClose(
        [1],
        'all',
        '',
        async () => {
          throw new Error('request failed');
        },
        () => {
          cleared = true;
        },
        async () => {
          refreshed = true;
        }
      ),
      /request failed/
    );

    assert.equal(cleared, false);
    assert.equal(refreshed, false);
  });

  test('keeps selection cleared when refresh fails after a successful close', async () => {
    let cleared = false;

    await assert.rejects(
      completeBulkClose(
        [1],
        'open',
        '',
        async () => {},
        () => {
          cleared = true;
        },
        async () => {
          throw new Error('refresh failed');
        }
      ),
      /refresh failed/
    );

    assert.equal(cleared, true);
  });
});
