import type { ReactNode } from 'react';
import './styles.css';
import './homent-ui.css';
import './dashboard-ui.css';
import './quote-ui.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hestiva OS',
  description: 'Hestiva OS business operations platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
