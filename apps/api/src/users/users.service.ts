import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type AuthenticatedUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};
export type UpdateProfileInput = { firstName?: string; lastName?: string; displayName?: string; phoneNumber?: string; profilePhotoUrl?: string | null };

const ACCOUNT_CONFLICT_MESSAGE = 'This authenticated account cannot be linked automatically. Contact an administrator for account recovery.';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sync(authUser: AuthenticatedUser) {
    if (!authUser.id?.trim()) throw new BadRequestException('Authenticated user identifier is required.');
    if (!authUser.email?.trim()) throw new BadRequestException('Authenticated user email is required.');
    const email = authUser.email.trim().toLowerCase();

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const authMatch = await transaction.user.findUnique({ where: { authUserId: authUser.id } });
        const emailMatches = await transaction.user.findMany({
          where: { email: { equals: email, mode: 'insensitive' } },
          take: 2,
        });

        if (authMatch) {
          const conflictingEmailMatch = emailMatches.some((candidate) => candidate.id !== authMatch.id);
          if (conflictingEmailMatch) {
            this.failConflict('auth_email_conflict', authUser.id, emailMatches.map(({ id }) => id));
          }
          return authMatch.email === email
            ? authMatch
            : transaction.user.update({ where: { id: authMatch.id }, data: { email } });
        }

        if (emailMatches.length > 1) {
          this.failConflict('ambiguous_email', authUser.id, emailMatches.map(({ id }) => id));
        }

        const staleIdentityMatch = emailMatches[0];
        if (staleIdentityMatch) {
          if (!authUser.email_confirmed_at) {
            this.logger.warn(`auth_identity_reconciliation_denied reason=unverified_email authUserId=${authUser.id} applicationUserId=${staleIdentityMatch.id}`);
            throw new ForbiddenException(ACCOUNT_CONFLICT_MESSAGE);
          }
          const reconciled = await transaction.user.update({
            where: { id: staleIdentityMatch.id },
            data: { authUserId: authUser.id, email },
          });
          this.logger.log(`auth_identity_reconciled authUserId=${authUser.id} applicationUserId=${staleIdentityMatch.id}`);
          return reconciled;
        }

        const fullName = typeof authUser.user_metadata?.full_name === 'string' ? authUser.user_metadata.full_name.trim() : '';
        const [firstName = email.split('@')[0] || 'User', ...rest] = fullName.split(' ').filter(Boolean);
        const lastName = rest.join(' ');
        return transaction.user.create({
          data: { authUserId: authUser.id, email, firstName, lastName, displayName: [firstName, lastName].filter(Boolean).join(' '), role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof ForbiddenException) throw error;
      if (typeof error === 'object' && error !== null && 'code' in error && (error.code === 'P2002' || error.code === 'P2034')) {
        const reason = error.code === 'P2002' ? 'unique_constraint' : 'concurrent_transaction';
        this.logger.warn(`auth_identity_reconciliation_conflict reason=${reason} authUserId=${authUser.id}`);
        throw new ConflictException(ACCOUNT_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  private failConflict(reason: string, authUserId: string, applicationUserIds: string[]): never {
    this.logger.warn(`auth_identity_reconciliation_conflict reason=${reason} authUserId=${authUserId} applicationUserIds=${applicationUserIds.join(',')}`);
    throw new ConflictException(ACCOUNT_CONFLICT_MESSAGE);
  }

  async findByAuthUserId(authUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { authUserId } });
    if (!user) throw new NotFoundException('User profile not found.');
    return user;
  }

  async updateProfile(authUserId: string, input: UpdateProfileInput) {
    const user = await this.findByAuthUserId(authUserId);
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName.trim() || null } : {}),
        ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber.trim() || null } : {}),
        ...(input.profilePhotoUrl !== undefined ? { profilePhotoUrl: input.profilePhotoUrl?.trim() || null } : {}),
      },
    });
  }
}
