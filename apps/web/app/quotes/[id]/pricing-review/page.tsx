import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { AppFrame } from '../../../components/app-frame';
import { QuotePricingReview } from './quote-pricing-review';

export default async function QuotePricingReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  const { id } = await params;
  return <AppFrame active="/quotes" email={appUser.email} user={appUser}><div className="v2Workspace"><QuotePricingReview quoteId={id} /></div></AppFrame>;
}
