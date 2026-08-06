import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LabourAdjustmentCalculation, LabourAdjustmentKind, WorkerPayType } from '@prisma/client';
import { SupabaseAuthGuard } from '../users/supabase-auth.guard';
import { LabourCostingService } from './labour-costing.service';

export type CreateTechnicianRateInput = {
  payType: WorkerPayType;
  dailyRate?: number | null;
  hourlyRate?: number | null;
  standardHoursPerDay: number;
  overtimeMultiplier?: number;
  weekendMultiplier?: number;
  publicHolidayMultiplier?: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason?: string;
};

export type CreateAdjustmentDefinitionInput = {
  name: string;
  kind: LabourAdjustmentKind;
  calculation: LabourAdjustmentCalculation;
  amount: number;
  notes?: string;
  isActive?: boolean;
};

export type CreateShiftAdjustmentInput = {
  technicianId: string;
  definitionId: string;
  amountOverride?: number | null;
  notes?: string;
};

@Controller('labour-costing')
@UseGuards(SupabaseAuthGuard)
export class LabourCostingController {
  constructor(private readonly labourCosting: LabourCostingService) {}

  @Get('workers') workers(@Query('date') date?: string) { return this.labourCosting.workers(date); }
  @Get('workers/:id/rates') rates(@Param('id', new ParseUUIDPipe()) id: string) { return this.labourCosting.rates(id); }
  @Post('workers/:id/rates') createRate(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: CreateTechnicianRateInput) { return this.labourCosting.createRate(id, input); }
  @Delete('rates/:id') deleteRate(@Param('id', new ParseUUIDPipe()) id: string) { return this.labourCosting.deleteRate(id); }

  @Get('adjustment-definitions') definitions() { return this.labourCosting.definitions(); }
  @Post('adjustment-definitions') createDefinition(@Body() input: CreateAdjustmentDefinitionInput) { return this.labourCosting.createDefinition(input); }
  @Patch('adjustment-definitions/:id') updateDefinition(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: Partial<CreateAdjustmentDefinitionInput>) { return this.labourCosting.updateDefinition(id, input); }

  @Get('shifts/:id') shiftCost(@Param('id', new ParseUUIDPipe()) id: string) { return this.labourCosting.shiftCost(id); }
  @Post('shifts/:id/adjustments') addShiftAdjustment(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: CreateShiftAdjustmentInput) { return this.labourCosting.addShiftAdjustment(id, input); }
  @Delete('shift-adjustments/:id') deleteShiftAdjustment(@Param('id', new ParseUUIDPipe()) id: string) { return this.labourCosting.deleteShiftAdjustment(id); }
}
