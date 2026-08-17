import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../lib/api-server';
import { AppFrame } from '../../components/app-frame';
import { QuoteReview } from './quote-review';

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  const { id } = await params;
  return <AppFrame active="/quotes" email={appUser.email} user={appUser}><QuoteReview quoteId={id} /></AppFrame>;
}
