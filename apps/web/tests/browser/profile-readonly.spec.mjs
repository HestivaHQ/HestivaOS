import { test, expect } from '@playwright/test';

function installFailureWatch(page) {
  const pageErrors = [];
  const serverErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  return { pageErrors, serverErrors };
}

function expectClean(watch, label) {
  expect(watch.pageErrors, `${label} raised browser page errors`).toEqual([]);
  expect(watch.serverErrors, `${label} received HTTP 5xx responses`).toEqual([]);
}

test.describe('production-safe profile interactions', () => {
  test('Profile account controls expose read-only email and block empty submissions natively', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();

    const personalForm = page.locator('form.profileSection').filter({ hasText: 'Personal information' }).first();
    const confirmedEmail = personalForm.getByRole('textbox', { name: 'Confirmed email', exact: true });
    await expect(confirmedEmail).toHaveJSProperty('readOnly', true);

    const firstName = personalForm.getByRole('textbox', { name: 'First name', exact: true });
    await firstName.fill('');
    await personalForm.getByRole('button', { name: 'Save personal information', exact: true }).click();
    await expect(firstName).toHaveJSProperty('validity.valid', false);

    const emailForm = page.locator('form.profileSection').filter({ hasText: 'Change email' }).first();
    const newEmail = emailForm.getByRole('textbox', { name: 'New email', exact: true });
    await newEmail.fill('');
    await emailForm.getByRole('button', { name: 'Request email change', exact: true }).click();
    await expect(newEmail).toHaveJSProperty('validity.valid', false);

    const securityForm = page.locator('form.profileSection').filter({ hasText: 'Security' }).first();
    const password = securityForm.getByLabel('New password', { exact: true });
    await securityForm.getByRole('button', { name: 'Change password', exact: true }).click();
    await expect(password).toHaveJSProperty('validity.valid', false);

    await expect(page).toHaveURL((url) => url.pathname === '/profile');
    expectClean(watch, 'Profile native validation');
  });
});
