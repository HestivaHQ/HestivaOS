import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type SyncUserInput = {
  authUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async sync(input: SyncUserInput) {
    if (!input.authUserId || !input.email?.trim()) {
      throw new BadRequestException('authUserId and email are required.');
    }

    const email = input.email.trim().toLowerCase();
    const firstName = input.firstName?.trim() || email.split('@')[0] || 'User';
    const lastName = input.lastName?.trim() || '';

    return this.prisma.user.upsert({
      where: { authUserId: input.authUserId },
      update: { email, firstName, lastName, status: 'ACTIVE' },
      create: {
        authUserId: input.authUserId,
        email,
        firstName,
        lastName,
        status: 'ACTIVE',
      },
    });
  }
}
