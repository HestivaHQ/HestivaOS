import {redirect} from 'next/navigation';
import {createAuthenticatedApi} from '../../../../lib/api-server';
import {canAccessAdminSettings} from '../../../../lib/account-policy';
import {AppFrame} from '../../../components/app-frame';
import {ServiceScopeManager} from './service-scope-manager';
export default async function Page(){const user=await(await createAuthenticatedApi()).syncUser();if(!canAccessAdminSettings(user.role))redirect('/');return <AppFrame active="/admin/settings" email={user.email} user={user}><div className="v2Workspace"><ServiceScopeManager/></div></AppFrame>}
