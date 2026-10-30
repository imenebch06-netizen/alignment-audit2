/**
 * upload.js
 * ---------------------------------------------------------------
 * Dual dropzones with instant thumbnails. Also downscales images
 * before they are sent: large screenshots are slow and many local
 * vision models cap input resolution anyway.
 */

const MAX_EDGE = 1280;      // longest side in px after downscaling
const JPEG_QUALITY = 0.9;

/** Selected files per slot. */
const files = { A: null, B: null };

export const hasBothImages = () => Boolean(files.A && files.B);

/**
 * Initializes every `.dropzone` on the page.
 * @param {(slot:string)=>void} [onChange] notified when a slot changes
 */
export function initDropzones(onChange) {
  document.querySelectorAll('.dropzone').forEach((zone) => {
    const slot = zone.dataset.slot;
    const input = zone.querySelector('input[type="file"]');

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('change', () => input.files[0] && setFile(zone, slot, input.files[0], onChange));

    // ✕ button clears the slot without triggering the zone's file picker.
    const removeBtn = zone.querySelector('.dz-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => { e.stopPropagation(); clearFile(zone, slot, onChange)(); });
    }

    ['dragenter', 'dragover'].forEach((t) =>
      zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) =>
      zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.remove('is-over'); }));
    zone.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) setFile(zone, slot, file, onChange);
    });
  });
}

function setFile(zone, slot, file, onChange) {
  const meta = zone.querySelector('.dz-meta');
  const img = zone.querySelector('.dz-preview');
  const hint = zone.querySelector('.dz-hint');

  if (!file.type.startsWith('image/')) {
    meta.textContent = 'That file is not an image.';
    return;
  }

  // Revoke any previous preview URL to avoid leaking memory.
  if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);

  files[slot] = file;
  img.src = URL.createObjectURL(file);        // immediate thumbnail
  img.classList.remove('hidden');
  hint.classList.add('hidden');
  zone.classList.add('has-file');
  zone.querySelector('.dz-remove')?.classList.remove('hidden');
  meta.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
  onChange?.(slot);
}

/** Clears a slot: resets the preview, meta line and has-file styling. */
export function clearFile(zone, slot, onChange) {
  const img = zone.querySelector('.dz-preview');
  const hint = zone.querySelector('.dz-hint');
  const meta = zone.querySelector('.dz-meta');
  const input = zone.querySelector('input[type="file"]');
  const removeBtn = zone.querySelector('.dz-remove');
  const clear = () => {
    if (img.src?.startsWith('blob:')) URL.revokeObjectURL(img.src);
    files[slot] = null;
    img.src = '';
    img.classList.add('hidden');
    hint.classList.remove('hidden');
    meta.textContent = '';
    zone.classList.remove('has-file');
    removeBtn?.classList.add('hidden');
    input.value = '';                          // so re-picking the same file fires "change"
    onChange?.(slot);
  };
  return clear;
}

/**
 * Returns both images as downscaled JPEG data URLs.
 * @returns {Promise<{a:string, b:string}>}
 */
export async function getEncodedImages() {
  const [a, b] = await Promise.all([encode(files.A), encode(files.B)]);
  return { a, b };
}

async function encode(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // flatten transparency so PNGs don't turn black in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
