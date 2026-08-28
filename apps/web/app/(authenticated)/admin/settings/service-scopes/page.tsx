import {redirect} from 'next/navigation';
import {createAuthenticatedApi} from '../../../../../lib/api-server';
import {canAccessAdminSettings} from '../../../../../lib/account-policy';
import {ServiceScopeManager} from '../../../../admin/settings/service-scopes/service-scope-manager';
export default async function Page(){const user=await(await createAuthenticatedApi()).currentUser();if(!canAccessAdminSettings(user.role))redirect('/');return <><div className="v2Workspace"><ServiceScopeManager/></div></>}
