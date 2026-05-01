/**
 * Mobile download network utilities.
 * Equivalent of electron/modules/downloads/network.js
 */
import { Directory, Filesystem } from '@capacitor/filesystem';

/** Download a file and write it to the Capacitor filesystem. Returns byte size. */
export async function downloadFile(
  url: string,
  path: string,
  signal: AbortSignal,
): Promise<number> {
  const res = await fetch(url, { signal, credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const base64 = await blobToBase64(blob);
  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Data,
    recursive: true,
  });
  return blob.size;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
