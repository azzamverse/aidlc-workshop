import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

export { expect };
export type { Locator, Page } from '@playwright/test';

export const staffPin = () => process.env.STAFF_PIN as string;

/** Clears the wrong-PIN count through the test-only route, so specs start clean. */
export async function resetLockout(request: APIRequestContext, base = '') {
  const response = await request.post(`${base}/api/test/staff/reset-lockout`);
  expect(response.status()).toBe(204);
}

/** Signs a browser context in, by the real route; its pages and `request` share the cookie. */
export async function signIn(context: BrowserContext, base = '') {
  await resetLockout(context.request, base);
  const response = await context.request.post(`${base}/api/staff/session`, { data: { pin: staffPin() } });
  expect(response.status()).toBe(204);
}

/**
 * For a spec that restarts its own server under an open staff page. A restart
 * ends every session, so the page's stream is held back until the new sign-in.
 */
export async function restartSignedIn(page: Page, start: () => Promise<unknown>, base: string) {
  await page.route('**/api/events*', (route) => route.abort());
  await start();
  await signIn(page.context(), base);
  await page.unroute('**/api/events*');
}

/** The test for v1's staff specs: every page and `request` in it is already signed in. */
export const test = base.extend<{ closeOpenedContexts: void }>({
  // A context a test opens itself is not closed for it: its pages keep live streams
  // open, and the shared WebKit browser slows to minutes per test as they pile up.
  closeOpenedContexts: [
    async ({ browser }, use) => {
      await use();
      await Promise.all(browser.contexts().map((opened) => opened.close()));
    },
    { auto: true },
  ],
  context: async ({ context, baseURL }, use) => {
    await signIn(context, baseURL);
    await use(context);
  },
  request: async ({ context }, use) => {
    await use(context.request);
  },
});
