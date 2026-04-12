import { expect, type Page } from '@playwright/test';

export async function expectWalkthroughStep(input: {
  page: Page;
  title: string;
  progress: string;
}) {
  const dialog = input.page.getByRole('dialog', { name: input.title });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(input.progress, { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Stop walkthrough' })).toBeVisible();
  return dialog;
}

export async function clickWalkthroughAction(input: {
  page: Page;
  title: string;
  actionLabel: string;
}) {
  const dialog = input.page.getByRole('dialog', { name: input.title });
  await dialog.getByRole('button', { name: input.actionLabel }).click();
}

export async function stopWalkthrough(input: {
  page: Page;
  title: string;
}) {
  const dialog = input.page.getByRole('dialog', { name: input.title });
  await dialog.getByRole('button', { name: 'Stop walkthrough' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    input.page.getByText('Walkthrough stopped. Restart anytime from Walkthrough or Help.'),
  ).toBeVisible();
}

export async function startWalkthroughFromMenu(input: {
  page: Page;
  optionLabel: string;
}) {
  await input.page.getByRole('button', { name: 'Walkthrough' }).click();
  await input.page.getByRole('button', { name: input.optionLabel }).click();
}
