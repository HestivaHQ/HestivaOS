import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../users/roles.decorator";
import {
  BusinessListInput,
  BusinessListsService,
} from "./business-lists.service";
@Controller("admin/business-lists")
@Roles(UserRole.ADMIN)
export class BusinessListsController {
  constructor(private readonly lists: BusinessListsService) {}
  @Get() list(
    @Query("type") type?: string,
    @Query("includeInactive", new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.lists.list(type, includeInactive);
  }
  @Post() create(@Body() input: BusinessListInput) {
    return this.lists.create(input);
  }
  @Patch(":id") update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: BusinessListInput,
  ) {
    return this.lists.update(id, input);
  }
}
