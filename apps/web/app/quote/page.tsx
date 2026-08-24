import type { Metadata } from 'next';
import { PublicQuotePage } from './public-quote-page';
import './quote.css';

export const metadata: Metadata = {
  title: 'Your Quote | Homent',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default function QuotePage() {
  return <PublicQuotePage />;
}
