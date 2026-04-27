import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lynk-X',
    short_name: 'Lynk-X',
    description: 'Experience the ultimate event app designed for seamless event interactions.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait',
    icons: [
      {
        src: '/lynk-x_logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
