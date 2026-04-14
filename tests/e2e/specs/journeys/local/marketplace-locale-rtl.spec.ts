import { Wallet } from 'ethers';
import {
  closeLocalProfileDb,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import { expect, test } from '../../../fixtures/local-journeys';

test.afterAll(async () => {
  await closeLocalProfileDb();
});

test('local marketplace locale switch persists across public and workspace routes', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  const actor = await localSessionFactory({
    role: `marketplace-locale.${runId}`,
    linkedWallet: Wallet.createRandom(),
  });

  const context = await browser.newContext({
    storageState: actor.storageState,
  });
  const page = await context.newPage();

  await page.goto(`${webBaseUrl}/marketplace`);
  await page.getByRole('button', { name: 'العربية' }).click();
  await page.waitForFunction(() => document.documentElement.dataset.locale === 'ar');

  await expect(
    page.getByRole('heading', {
      name: 'وظّف عبر عروض موجزة منسقة ثم حوّل الاختيار الفائز إلى الضمان.',
    }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => ({
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        locale: document.documentElement.dataset.locale,
      })),
    )
    .toEqual({
      lang: 'ar',
      dir: 'rtl',
      locale: 'ar',
    });

  await page.goto(`${webBaseUrl}/app/marketplace`);
  await expect(page.getByRole('heading', { name: 'ملف الموثوقية' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'تسجيل الخروج' })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => ({
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        locale: document.documentElement.dataset.locale,
      })),
    )
    .toEqual({
      lang: 'ar',
      dir: 'rtl',
      locale: 'ar',
    });

  await page.goto(`${webBaseUrl}/marketplace`);
  await page.getByRole('button', { name: 'English' }).click();
  await page.waitForFunction(() => document.documentElement.dataset.locale === 'en');

  await expect(
    page.getByRole('heading', {
      name: 'Hire through curated briefs and convert the winner into escrow.',
    }),
  ).toBeVisible();
  await page.goto(`${webBaseUrl}/app/marketplace`);
  await expect(page.getByRole('heading', { name: 'Credibility profile' })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => ({
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        locale: document.documentElement.dataset.locale,
      })),
    )
    .toEqual({
      lang: 'en',
      dir: 'ltr',
      locale: 'en',
    });

  await context.close();
});
