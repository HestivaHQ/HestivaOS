import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { BusinessListsController } from "./business-lists.controller";
import { BusinessListsService } from "./business-lists.service";
@Module({
  controllers: [BusinessListsController],
  providers: [BusinessListsService, PrismaService],
})
export class BusinessListsModule {}
