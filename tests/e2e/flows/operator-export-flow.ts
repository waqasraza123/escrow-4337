import { readFile } from 'node:fs/promises';
import type { Download, Page } from '@playwright/test';
import { expect } from '../fixtures/test';

export type ExportProbe = {
  artifact: 'job-history' | 'dispute-case';
  format: 'json' | 'csv';
  buttonName: string;
  successMessage: string;
  fileNamePattern: RegExp;
  requiredText: string;
};

export function buildEscrowExportProbes(jobId: string): ExportProbe[] {
  return [
    {
      artifact: 'job-history',
      format: 'json',
      buttonName: 'Export job history JSON',
      successMessage: 'Downloaded job-history JSON export.',
      fileNamePattern: new RegExp(`^escrow-${jobId}-job-history-.*\\.json$`),
      requiredText: jobId,
    },
    {
      artifact: 'job-history',
      format: 'csv',
      buttonName: 'Export job history CSV',
      successMessage: 'Downloaded job-history CSV export.',
      fileNamePattern: new RegExp(`^escrow-${jobId}-job-history-.*\\.csv$`),
      requiredText: jobId,
    },
    {
      artifact: 'dispute-case',
      format: 'json',
      buttonName: 'Export dispute case JSON',
      successMessage: 'Downloaded dispute-case JSON export.',
      fileNamePattern: new RegExp(`^escrow-${jobId}-dispute-case-.*\\.json$`),
      requiredText: jobId,
    },
    {
      artifact: 'dispute-case',
      format: 'csv',
      buttonName: 'Export dispute case CSV',
      successMessage: 'Downloaded dispute-case CSV export.',
      fileNamePattern: new RegExp(`^escrow-${jobId}-dispute-case-.*\\.csv$`),
      requiredText: jobId,
    },
  ];
}

async function readDownloadText(download: Download) {
  const filePath = await download.path();

  if (!filePath) {
    throw new Error('Playwright did not persist the downloaded file.');
  }

  return readFile(filePath, 'utf8');
}

export async function expectExportDownload(page: Page, probe: ExportProbe) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: probe.buttonName }).click(),
  ]);

  await expect(page.getByText(probe.successMessage, { exact: true })).toBeVisible();
  const suggestedFilename = download.suggestedFilename();
  if (!probe.fileNamePattern.test(suggestedFilename)) {
    expect(suggestedFilename).toBe(`download.${probe.format}`);
  }

  const content = await readDownloadText(download);
  expect(content).toContain(probe.requiredText);

  if (probe.format === 'json') {
    expect(content).toContain(`"artifact":"${probe.artifact}"`);
    return;
  }

  expect(content).toContain('job_id,job_title,artifact');
}
