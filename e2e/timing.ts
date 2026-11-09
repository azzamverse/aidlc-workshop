import type { Page } from '@playwright/test';

/**
 * The moment a screen sends its request. Live-update limits are timed from here,
 * because WebKit's automation on Windows can take seconds to turn a click into an
 * event, and that delay is the test driver's, not the app's. The limit is unchanged.
 */
export function whenRequestSent(page: Page, method: string, pathEnd: string): Promise<number> {
  return new Promise((resolve) => {
    page.on('request', (request) => {
      if (request.method() === method && new URL(request.url()).pathname.endsWith(pathEnd)) resolve(Date.now());
    });
  });
}

/** Records, inside the page, when a selector first matches (or stops matching). Read it with the returned function. */
export async function watchArrival(page: Page, selector: string, { gone = false } = {}) {
  await page.evaluate(({ selector, gone }) => {
    const check = () => {
      const matches = document.querySelector(selector) !== null;
      if (matches !== gone) (window as any).__arrivedAt ??= Date.now();
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    check();
  }, { selector, gone });
  return () => page.evaluate(() => (window as any).__arrivedAt as number);
}
