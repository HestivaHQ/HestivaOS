import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Homent Technician', short_name: 'Homent Tech', description: 'Homent field execution', start_url: '/technician', scope: '/technician', display: 'standalone', background_color: '#f6f5ef', theme_color: '#173f35', icons: [{ src: '/technician-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] };
}
