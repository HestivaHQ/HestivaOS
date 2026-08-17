import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = { title: 'Homent Technician', description: 'Homent field execution', manifest: '/technician/manifest.webmanifest' };
export default function TechnicianLayout({ children }: { children: ReactNode }) {
  return <main className="technicianShell"><header className="technicianBrand"><Link href="/technician">Homent <strong>Technician</strong></Link><span>Field execution</span></header>{children}<nav className="technicianNav" aria-label="Technician jobs"><Link href="/technician?view=today">Today</Link><Link href="/technician?view=upcoming">Upcoming</Link><Link href="/technician?view=recent">Recent</Link></nav></main>;
}
