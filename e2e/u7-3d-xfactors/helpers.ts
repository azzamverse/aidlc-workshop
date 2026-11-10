import type { BrowserContext, Page } from '@playwright/test';

/** Makes this browser report no WebGL, so every scene must use its text version. */
export const disableWebGL = (target: Page | BrowserContext) =>
  target.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith('webgl') || type === 'experimental-webgl') return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

export const openView = async (page: Page, table: number, view: string) => {
  await page.goto(`/table/${table}/orders`);
  await page.getByTestId(`orders-view-${view}`).click();
};

export const watchErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
};
