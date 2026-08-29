import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { QuoteReview } from '../../../quotes/[id]/quote-review';
import { QuoteSendSharePanel } from '../../../quotes/[id]/quote-send-share-panel';

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  const { id } = await params;
  return <>
    <div className="quoteWorkspace"><div className="rowActions"><Link className="primaryButton" href={`/quotes/${id}/pricing-review`}>Resolve pricing review</Link></div></div>
    <QuoteSendSharePanel quoteId={id} />
    <QuoteReview quoteId={id} />
  </>;
}
