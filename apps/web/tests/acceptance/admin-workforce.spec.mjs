import { test, expect } from '@playwright/test';
import { installAcceptanceSafetyGuard, expectNoServerErrors } from './acceptance-guard.mjs';

const leadEmail = process.env.HESTIVA_LR1B_TECHNICIAN_LEAD_EMAIL;
const memberEmail = process.env.HESTIVA_LR1B_TECHNICIAN_MEMBER_EMAIL;
const leadName = 'LR1B Lead Technician';
const memberName = 'LR1B Member Technician';
const crewName = 'LR1B Acceptance Crew';
const shiftTitle = 'LR1B Acceptance Shift';

function requireAcceptanceIdentity(value, label) {
  if (!value) throw new Error(`${label} is required for LR-1B workforce acceptance.`);
  return value;
}

async function selectOptionByText(select, text) {
  const option = select.locator('option').filter({ hasText: text }).first();
  await expect(option).toHaveCount(1);
  const value = await option.getAttribute('value');
  if (value === null) throw new Error(`Option matching ${String(text)} has no value.`);
  await select.selectOption(value);
}

async function saveTechnician(page, { email, firstName, lastName, skills, status = 'ACTIVE' }) {
  await page.goto('/technicians', { waitUntil: 'domcontentloaded' });
  const search = page.getByPlaceholder('Search technicians');
  await search.fill(email);
  await page.waitForTimeout(450);
  const row = page.locator('.dataRow').filter({ hasText: email }).first();
  const exists = await row.count();
  const form = page.locator('form.resourceForm');
  if (exists) await row.getByRole('button', { name: 'Edit' }).click();
  await form.getByLabel('First name').fill(firstName);
  await form.getByLabel('Last name').fill(lastName);
  await form.getByLabel('Email').fill(email);
  await form.getByLabel('Skills').fill(skills);
  await form.getByLabel('Status').selectOption(status);
  await form.getByLabel('Notes').fill('Disposable LR-1B operational acceptance technician.');
  await form.getByRole('button', { name: 'Save technician' }).click();
  await expect(form.getByRole('button', { name: 'Save technician' })).toBeEnabled();
  await search.fill(email);
  await page.waitForTimeout(450);
  await expect(page.locator('.dataRow').filter({ hasText: email }).first()).toContainText(status);
}

async function setTechnicianStatus(page, email, status) {
  const search = page.getByPlaceholder('Search technicians');
  await search.fill(email);
  await page.waitForTimeout(450);
  const row = page.locator('.dataRow').filter({ hasText: email }).first();
  await row.getByRole('button', { name: 'Edit' }).click();
  const form = page.locator('form.resourceForm');
  await form.getByLabel('Status').selectOption(status);
  await form.getByRole('button', { name: 'Save technician' }).click();
  await search.fill(email);
  await page.waitForTimeout(450);
  await expect(page.locator('.dataRow').filter({ hasText: email }).first()).toContainText(status);
}

async function searchEmployee(page, email, visibleName) {
  const search = page.getByPlaceholder('Name, phone or email');
  if (await search.inputValue() !== email) await search.fill(email);
  const card = page.locator('.employeeCard').filter({ hasText: visibleName }).first();
  await expect(card).toBeVisible();
  return { search, card };
}

async function ensureEmployee(page, { email, reference, firstName, lastName }) {
  await page.goto('/employees', { waitUntil: 'domcontentloaded' });
  const visibleName = `${firstName} ${lastName}`;
  const links = page.locator('section[aria-labelledby="workforce-links-heading"]');
  await expect(links).toBeVisible();
  await expect(links.getByLabel('Linked Technician').locator('option').filter({ hasText: visibleName })).toHaveCount(1);
  const employeeOption = links.getByLabel('Employee record').locator('option').filter({ hasText: reference });
  const exists = (await employeeOption.count()) === 1;
  if (exists) {
    const { card } = await searchEmployee(page, email, visibleName);
    await card.getByRole('button', { name: 'Manage' }).click();
  } else {
    await page.getByRole('button', { name: 'New employee' }).click();
  }
  const form = page.locator('form.employeeForm').first();
  await form.getByLabel('Employee reference').fill(reference);
  await form.getByLabel('First name').fill(firstName);
  await form.getByLabel('Last name').fill(lastName);
  await form.getByLabel('Contact email').fill(email);
  await form.getByLabel('Employment status').selectOption('ACTIVE');
  await form.getByLabel('Internal Notes').fill('Disposable LR-1B operational acceptance employee.').catch(() => {});
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toContainText(/Employee record (created|saved)\./);
  await expect(page.locator('.employeeCard').filter({ hasText: visibleName }).first()).toContainText('ACTIVE');
}

async function setEmployeeStatus(page, email, visibleName, status) {
  const { card } = await searchEmployee(page, email, visibleName);
  await card.getByRole('button', { name: 'Manage' }).click();
  const form = page.locator('form.employeeForm').first();
  await form.getByLabel('Employment status').selectOption(status);
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toContainText('Employee record saved.');
  await expect(page.locator('.employeeCard').filter({ hasText: visibleName }).first()).toContainText(status);
}

async function linkWorkforceIdentity(page, { email, reference, technicianName }) {
  await page.goto('/employees', { waitUntil: 'domcontentloaded' });
  const panel = page.locator('section[aria-labelledby="workforce-links-heading"]');
  await expect(panel).toBeVisible();
  await selectOptionByText(panel.getByLabel('Employee record'), new RegExp(`^${reference} ·`));
  await selectOptionByText(panel.getByLabel('Linked OS user'), email);
  await selectOptionByText(panel.getByLabel('Linked Technician'), `${technicianName} · Active`);
  await panel.getByRole('button', { name: 'Save workforce links' }).click();
  await expect(panel.getByRole('status')).toHaveText('Workforce identity links saved.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  const reloaded = page.locator('section[aria-labelledby="workforce-links-heading"]');
  await selectOptionByText(reloaded.getByLabel('Employee record'), new RegExp(`^${reference} ·`));
  await expect(reloaded.getByLabel('Linked OS user').locator('option:checked')).toContainText(email);
  await expect(reloaded.getByLabel('Linked Technician').locator('option:checked')).toContainText(technicianName);
}

async function normalizeCrew(page) {
  await page.goto('/crews', { waitUntil: 'domcontentloaded' });
  const search = page.getByPlaceholder('Search crews');
  await search.fill(crewName);
  await page.waitForTimeout(400);
  const row = page.locator('.dataRow').filter({ hasText: crewName }).first();
  const form = page.locator('form.resourceForm');
  if (await row.count()) await row.getByRole('button', { name: 'Edit crew' }).click();
  else await form.getByLabel('Crew name').fill(crewName);
  await form.getByLabel('Crew name').fill(crewName);
  await form.getByLabel('Description').fill('Disposable LR-1B acceptance crew.');
  await form.getByLabel('Status').selectOption('ACTIVE');
  for (const name of [leadName, memberName]) {
    const member = form.locator('fieldset label.dataRow').filter({ hasText: name });
    const checkbox = member.getByRole('checkbox');
    if (!(await checkbox.isChecked())) await checkbox.check();
  }
  await form.getByLabel('Crew leader').selectOption({ label: leadName });
  await form.getByRole('button', { name: 'Save crew' }).click();
  await expect(form.getByRole('heading', { name: 'New crew' })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  const reloadedSearch = page.getByPlaceholder('Search crews');
  await reloadedSearch.fill(crewName);
  await page.waitForTimeout(400);
  const saved = page.locator('.dataRow').filter({ hasText: crewName }).first();
  await expect(saved).toContainText(`Leader: ${leadName}`);
  await expect(saved).toContainText('2 Technicians');
  await expect(saved).toContainText(leadName);
  await expect(saved).toContainText(memberName);
}

async function changeCrewLeader(page, leaderName) {
  const search = page.getByPlaceholder('Search crews');
  await search.fill(crewName);
  await page.waitForTimeout(400);
  const row = page.locator('.dataRow').filter({ hasText: crewName }).first();
  await row.getByRole('button', { name: 'Edit crew' }).click();
  const form = page.locator('form.resourceForm');
  const leader = form.getByLabel('Crew leader');
  await selectOptionByText(leader, leaderName);
  await expect(leader.locator('option:checked')).toHaveText(leaderName);
  await form.getByRole('button', { name: 'Save crew' }).click();
  await expect(form.getByRole('heading', { name: 'New crew' })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  const reloadedSearch = page.getByPlaceholder('Search crews');
  await reloadedSearch.fill(crewName);
  await page.waitForTimeout(400);
  await expect(page.locator('.dataRow').filter({ hasText: crewName }).first()).toContainText(`Leader: ${leaderName}`);
}

function localDate(offsetDays = 0) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

async function removeVisibleShifts(page) {
  while (await page.locator('.dataRow').filter({ hasText: shiftTitle }).count()) {
    const row = page.locator('.dataRow').filter({ hasText: shiftTitle }).first();
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(row).toBeHidden();
  }
}

test.beforeEach(async ({ page }) => installAcceptanceSafetyGuard(page));

test.describe.serial('LR-1B ADMIN workforce acceptance S1-S3', () => {
  test.setTimeout(120_000);

  test('S1 creates, mutates and links Technician and Employee records through ADMIN UI', async ({ page }) => {
    await expectNoServerErrors(page, async () => {
      const lead = requireAcceptanceIdentity(leadEmail, 'Technician Lead email');
      const member = requireAcceptanceIdentity(memberEmail, 'Technician Member email');
      await saveTechnician(page, { email: lead, firstName: 'LR1B Lead', lastName: 'Technician', skills: 'Cleaning, LR1B acceptance' });
      await setTechnicianStatus(page, lead, 'INACTIVE');
      await setTechnicianStatus(page, lead, 'ACTIVE');
      await saveTechnician(page, { email: member, firstName: 'LR1B Member', lastName: 'Technician', skills: 'Cleaning, Field execution, LR1B acceptance' });
      await ensureEmployee(page, { email: lead, reference: 'LR1B-TECH-LEAD', firstName: 'LR1B Lead', lastName: 'Technician' });
      await setEmployeeStatus(page, lead, leadName, 'INACTIVE');
      await setEmployeeStatus(page, lead, leadName, 'ACTIVE');
      await ensureEmployee(page, { email: member, reference: 'LR1B-TECH-MEMBER', firstName: 'LR1B Member', lastName: 'Technician' });
      await linkWorkforceIdentity(page, { email: lead, reference: 'LR1B-TECH-LEAD', technicianName: leadName });
      await linkWorkforceIdentity(page, { email: member, reference: 'LR1B-TECH-MEMBER', technicianName: memberName });
    });
  });

  test('S2 creates and edits a two-Technician crew with persisted leadership', async ({ page }) => {
    await expectNoServerErrors(page, async () => {
      await normalizeCrew(page);
      await changeCrewLeader(page, memberName);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await changeCrewLeader(page, leadName);
    });
  });

  test('S3 creates, edits, copies, reloads and deletes a crew shift', async ({ page }) => {
    await expectNoServerErrors(page, async () => {
      await page.goto('/shifts', { waitUntil: 'domcontentloaded' });
      await removeVisibleShifts(page);
      await page.getByRole('button', { name: 'Create shift' }).click();
      const form = page.locator('form.resourceForm');
      await expect(form.getByRole('heading', { name: 'New shift' })).toBeVisible();
      const today = localDate(0);
      const tomorrow = localDate(1);
      await form.getByLabel('Shift title').fill(shiftTitle);
      await form.getByLabel('Start').fill(`${today}T09:00`);
      await form.getByLabel('End').fill(`${today}T17:00`);
      await form.getByLabel('Unpaid break (minutes)').fill('30');
      await form.getByLabel('Search crews').fill(crewName);
      const crewSelect = form.getByLabel('Crew', { exact: true });
      await selectOptionByText(crewSelect, crewName);
      await expect(crewSelect.locator('option:checked')).toHaveText(crewName);
      const technicianSelect = form.getByLabel('Designated technician');
      await selectOptionByText(technicianSelect, leadName);
      await expect(technicianSelect.locator('option:checked')).toHaveText(leadName);
      await form.getByLabel('Work order', { exact: true }).selectOption('');
      await form.getByLabel('Location').fill('LR1B acceptance location');
      await form.getByLabel('Status').selectOption('SCHEDULED');
      await form.getByLabel('Management notes').fill('Disposable LR-1B acceptance shift.');
      await form.getByRole('button', { name: 'Save shift' }).click();
      let row = page.locator('.dataRow').filter({ hasText: shiftTitle }).first();
      await expect(row).toContainText(crewName);
      await expect(row).toContainText('SCHEDULED');
      await row.getByRole('button', { name: 'Edit' }).click();
      const editForm = page.locator('form.resourceForm');
      await editForm.getByLabel('Location').fill('LR1B acceptance location edited');
      await editForm.getByLabel('Status').selectOption('CONFIRMED');
      await editForm.getByRole('button', { name: 'Save shift' }).click();
      await page.reload({ waitUntil: 'domcontentloaded' });
      row = page.locator('.dataRow').filter({ hasText: shiftTitle }).first();
      await expect(row).toContainText('CONFIRMED');
      page.once('dialog', (dialog) => dialog.accept(tomorrow));
      await row.getByRole('button', { name: 'Copy' }).click();
      await expect(page.locator('.dataRow').filter({ hasText: shiftTitle })).toHaveCount(2);
      await removeVisibleShifts(page);
      await expect(page.locator('.dataRow').filter({ hasText: shiftTitle })).toHaveCount(0);
    });
  });
});
