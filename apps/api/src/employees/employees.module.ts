import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
@Module({ controllers: [EmployeesController], providers: [EmployeesService, PrismaService] })
export class EmployeesModule {}
