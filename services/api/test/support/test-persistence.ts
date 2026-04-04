import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export function configureFilePersistence() {
  const directory = mkdtempSync(join(tmpdir(), 'escrow4337-api-'));
  const filePath = join(directory, 'store.json');

  process.env.PERSISTENCE_DRIVER = 'file';
  process.env.PERSISTENCE_FILE_PATH = filePath;

  return {
    filePath,
    cleanup: () => {
      rmSync(directory, { recursive: true, force: true });
      delete process.env.PERSISTENCE_FILE_PATH;
      delete process.env.PERSISTENCE_DRIVER;
    },
  };
}
