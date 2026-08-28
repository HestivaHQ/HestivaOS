import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../../lib/api-server';
import { QuotePricingReview } from '../../../../quotes/[id]/pricing-review/quote-pricing-review';

export default async function QuotePricingReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  const { id } = await params;
  return <><div className="v2Workspace"><QuotePricingReview quoteId={id} /></div></>;
}
