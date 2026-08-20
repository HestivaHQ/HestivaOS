import { Module } from "@nestjs/common";
import { BusinessListsController } from "./business-lists.controller";
import { BusinessListsService } from "./business-lists.service";
@Module({
  controllers: [BusinessListsController],
  providers: [BusinessListsService],
})
export class BusinessListsModule {}
