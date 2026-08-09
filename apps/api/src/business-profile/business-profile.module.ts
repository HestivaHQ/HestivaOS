import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BusinessProfileController } from './business-profile.controller';
import { BusinessProfileService } from './business-profile.service';
@Module({ controllers: [BusinessProfileController], providers: [BusinessProfileService, PrismaService] })
export class BusinessProfileModule {}
