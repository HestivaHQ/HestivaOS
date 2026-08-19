import {Body,Controller,Param,ParseUUIDPipe,Post} from '@nestjs/common';
import {User} from '@prisma/client';import {CurrentUser} from '../users/current-user.decorator';import {ReportIncidentInput,WorkOrderIncidentService} from '../work-orders/work-order-incident.service';
@Controller('technician/jobs') export class TechnicianIncidentsController{constructor(private readonly incidents:WorkOrderIncidentService){} @Post(':id/incidents') report(@CurrentUser() user:User,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:ReportIncidentInput){return this.incidents.report(user.id,id,input);}}
