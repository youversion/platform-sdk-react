import { expect, it, vi } from 'vitest';
import { copyTextToClipboard } from './clipboard';

it('copies text and tolerates denied or unavailable clipboard access', async ({ onTestFinished }) => {
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });

  await copyTextToClipboard('John 3:16');
  expect(writeText).toHaveBeenCalledWith('John 3:16');

  writeText.mockRejectedValue(new Error('Clipboard permission denied'));
  await expect(copyTextToClipboard('John 3:17')).resolves.toBeUndefined();

  vi.stubGlobal('navigator', {});
  await expect(copyTextToClipboard('John 3:18')).resolves.toBeUndefined();

  vi.stubGlobal('navigator', undefined);
  await expect(copyTextToClipboard('John 3:19')).resolves.toBeUndefined();
});
