import {WorkOrderIncidentCategory,WorkOrderIncidentResolution} from '@prisma/client';
import {describe,expect,it} from '@jest/globals';
describe('Work Order incident v1 contract',()=>{it('uses constrained field categories',()=>{expect(Object.keys(WorkOrderIncidentCategory)).toEqual(['SAFETY_CRITICAL_STOP','PROPERTY_OR_ITEM_DAMAGE','CUSTOMER_OR_PROPERTY_CONDITION','OPERATIONAL_INCIDENT']);});it('keeps resolution operationally neutral',()=>{expect(Object.keys(WorkOrderIncidentResolution)).toEqual(['NO_FURTHER_OPERATIONAL_ACTION','FOLLOW_UP_COMPLETED','ESCALATED_OUTSIDE_WORKFLOW']);});});
