/**
 * convertImageToWebP — re-encodes an image File as WEBP via canvas before upload.
 *
 * No-op passthrough for non-image files (PDFs, videos) so callers can run this
 * unconditionally on files from a mixed-type <input accept="image/*,application/pdf">
 * without special-casing the non-image branches themselves.
 */
export async function convertImageToWebP(file: File, quality = 0.9): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/webp') {
        return file;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', quality);
    });
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], newName, { type: 'image/webp' });
}
