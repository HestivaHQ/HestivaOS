import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { QuoteStatus, User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { DeclineQuoteInput, QuoteReviewService, RecordQuoteResolutionInput } from './quote-review.service';

@Controller('quotes')
@Roles(UserRole.ADMIN)
export class QuoteReviewController {
  constructor(private readonly quotes: QuoteReviewService) {}

  @Get()
  findAll(@Query('page', new ParseIntPipe({ optional: true })) page?: number, @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number, @Query('search') search?: string, @Query('status') status?: QuoteStatus) {
    return this.quotes.findAll(page, pageSize, search, status);
  }

  @Get(':id/preflight')
  preflight(@Param('id', new ParseUUIDPipe()) id: string, @Query('expectedRevisionNumber', ParseIntPipe) expectedRevisionNumber: number) {
    return this.quotes.preflight(id, expectedRevisionNumber);
  }

  @Patch(':id/decline')
  decline(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: DeclineQuoteInput, @CurrentUser() user: User) {
    return this.quotes.decline(id, input, user.id);
  }

  @Patch(':id/resolution')
  recordResolution(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: RecordQuoteResolutionInput, @CurrentUser() user: User) {
    return this.quotes.recordResolution(id, input, user.id);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.quotes.findOne(id); }
}
