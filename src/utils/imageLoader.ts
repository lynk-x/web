/**
 * Custom Next.js image loader that routes CDN-hosted images through
 * Cloudflare Image Resizing while passing external URLs through untouched.
 */
interface CloudflareLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudflareLoader({ src, width, quality }: CloudflareLoaderParams): string {
  // If the image is not hosted on our CDN, return the original URL
  if (!src.startsWith('https://cdn.lynk-x.app')) {
    return src;
  }

  // Extract the relative path of the asset from the CDN URL
  const relativePath = src.replace('https://cdn.lynk-x.app/', '');
  
  // Construct the options string (`scale-down` prevents upscaling small covers;
  // Cloudflare Image Resizing rejects `fit=auto`).
  const params = [
    `width=${width}`,
    `fit=scale-down`,
    `quality=${quality || 75}`,
    `format=auto` // Automatically delivers WebP/AVIF based on browser support
  ].join(',');

  return `https://cdn.lynk-x.app/cdn-cgi/image/${params}/${relativePath}`;
}
