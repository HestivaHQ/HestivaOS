import type { ReactNode } from 'react';
import './styles.css';

export const metadata = {
  title: 'Maintenance Marshall Operating System',
  description: 'Maintenance Marshall business operations platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
