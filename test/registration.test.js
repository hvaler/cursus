// @ts-check
/**
 * The rules point judges at ChatGPT's in-app browser, which cannot be tested from here. The
 * failure that would be invisible and entirely ours is this one: a host that injects
 * `document.modelContext` *after* the page loads, against a page that only looked once.
 *
 * These run in Node with a fake `document`, so they check the waiting itself rather than any
 * particular browser.
 */
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { waitForModelContext } from '../app/tools.js';

/** @type {any} */
const g = globalThis;

afterEach(() => { delete g.document; });

describe('waiting for WebMCP to turn up', () => {
  test('resolves at once when it is already there', async () => {
    g.document = { modelContext: { registerTool: () => {} } };
    const started = Date.now();
    assert.equal(await waitForModelContext(2000), true);
    assert.ok(Date.now() - started < 150, 'should not have waited for a poll');
  });

  test('resolves when it appears after the page has loaded', async () => {
    g.document = {};
    setTimeout(() => { g.document.modelContext = { registerTool: () => {} }; }, 400);

    const started = Date.now();
    assert.equal(await waitForModelContext(4000), true, 'missed a late arrival');
    const waited = Date.now() - started;
    assert.ok(waited >= 350, `resolved in ${waited}ms, before the API existed`);
    assert.ok(waited < 2000, `took ${waited}ms to notice`);
  });

  test('gives up rather than hanging when it never arrives', async () => {
    g.document = {};
    const started = Date.now();
    assert.equal(await waitForModelContext(600), false);
    assert.ok(Date.now() - started >= 500, 'gave up too early to have really looked');
  });

  test('an object without registerTool does not count as WebMCP', async () => {
    g.document = { modelContext: {} };
    assert.equal(await waitForModelContext(400), false,
      'a modelContext with no registerTool is not something we can register with');
  });
});
