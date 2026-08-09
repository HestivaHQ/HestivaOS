import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../lib/api-server';
import { canAccessAdminSettings } from '../../../lib/account-policy';
import { createClient } from '../../../lib/supabase/server';
import { AppFrame } from '../../components/app-frame';
import Link from 'next/link';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');
  const appUser = await (await createAuthenticatedApi()).syncUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  return <AppFrame active="/admin/settings" email={user.email} user={appUser}>
    <header className="pageHeader"><div><p className="eyebrow">Administration</p><h2>Admin Settings</h2><p>Manage Hestiva OS administrative configuration.</p></div></header>
    <section className="adminSettingsGrid" aria-label="Administrative modules">
      <Link className="panel adminModuleLink" href="/admin/settings/user-access"><h3>User Access</h3><p>Manage roles and who can use Hestiva OS.</p><span className="statusPill">Manage user access</span></Link>
      <Link className="panel adminModuleLink" href="/admin/settings/business-profile"><h3>Business Profile</h3><p>Manage official Hestiva business information and sharing.</p><span className="statusPill">Manage business profile</span></Link>
    </section>
  </AppFrame>;
}
