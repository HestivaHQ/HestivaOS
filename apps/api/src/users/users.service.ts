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
export type UpdateRoleInput = { role?: UserRole };
export type UpdateAccessInput = { status?: UserStatus };

const ACCOUNT_CONFLICT_MESSAGE = 'This authenticated account cannot be linked automatically. Contact an administrator for account recovery.';
const USER_ACCESS_SELECT = { id: true, email: true, firstName: true, lastName: true, displayName: true, role: true, status: true, createdAt: true, updatedAt: true } satisfies Prisma.UserSelect;
const auditDisplayName = (user: { firstName: string; lastName: string; displayName: string | null }) => user.displayName?.trim() || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || null;

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
          const matchedUser = authMatch.email === email
            ? authMatch
            : await transaction.user.update({ where: { id: authMatch.id }, data: { email } });
          return this.requireActiveAccess(matchedUser);
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
          return this.requireActiveAccess(reconciled);
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

  private requireActiveAccess<T extends { status: UserStatus }>(user: T): T {
    if (user.status !== UserStatus.ACTIVE) throw new ForbiddenException('Hestiva OS access is disabled.');
    return user;
  }

  async findByAuthUserId(authUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { authUserId } });
    if (!user) throw new NotFoundException('User profile not found.');
    return user;
  }

  async preflightEmailChange(authUserId: string, emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new BadRequestException('A valid email address is required.');
    const current = await this.findByAuthUserId(authUserId);
    if (current.email.toLowerCase() === email) throw new BadRequestException('Enter a different email address.');
    const conflict = await this.prisma.user.findFirst({
      where: { id: { not: current.id }, email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (conflict) throw new ConflictException('That email address is already associated with another HestivaOS account.');
    return { email, allowed: true };
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

  async findAdminUsers(search?: string) {
    const term = search?.trim();
    return this.prisma.user.findMany({
      where: term ? { OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { displayName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ] } : undefined,
      select: USER_ACCESS_SELECT,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { email: 'asc' }],
    });
  }

  async findAccessHistory(targetId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new NotFoundException('User account not found.');
    return this.prisma.userAccessChange.findMany({
      where: { targetUserId: targetId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  async updateRole(actor: { id: string }, targetId: string, input: UpdateRoleInput) {
    if (!input.role || !Object.values(UserRole).includes(input.role)) throw new BadRequestException('A valid application role is required.');
    return this.mutateAccess(actor.id, targetId, { role: input.role });
  }

  async updateAccess(actor: { id: string }, targetId: string, input: UpdateAccessInput) {
    if (!input.status || !Object.values(UserStatus).includes(input.status)) throw new BadRequestException('A valid OS access status is required.');
    return this.mutateAccess(actor.id, targetId, { status: input.status });
  }

  private async mutateAccess(actorId: string, targetId: string, change: { role?: UserRole; status?: UserStatus }) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(48378623)`;
        const [target, actor] = await Promise.all([
          transaction.user.findUnique({ where: { id: targetId } }),
          transaction.user.findUnique({ where: { id: actorId } }),
        ]);
        if (!target) throw new NotFoundException('User account not found.');
        if (!actor) throw new ForbiddenException('Administrator account is unavailable.');
        const removesAdminAccess = target.role === UserRole.ADMIN && target.status === UserStatus.ACTIVE
          && (change.role !== undefined && change.role !== UserRole.ADMIN || change.status === UserStatus.INACTIVE);
        if (actorId === targetId && removesAdminAccess) throw new ForbiddenException('You cannot demote or disable your own administrator account.');
        if (removesAdminAccess) {
          const activeAdmins = await transaction.user.count({ where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE } });
          if (activeAdmins <= 1) throw new ConflictException('The last active administrator cannot be demoted or have OS access disabled.');
        }
        const updated = await transaction.user.update({ where: { id: targetId }, data: change, select: USER_ACCESS_SELECT });
        if (target.role !== updated.role || target.status !== updated.status) {
          await transaction.userAccessChange.create({
            data: {
              targetUserId: target.id,
              targetEmail: target.email,
              targetDisplayName: auditDisplayName(target),
              actorUserId: actor.id,
              actorEmail: actor.email,
              actorDisplayName: auditDisplayName(actor),
              oldRole: target.role,
              newRole: updated.role,
              oldStatus: target.status,
              newStatus: updated.status,
            },
          });
        }
        this.logger.log(`admin_user_access_changed actorUserId=${actorId} targetUserId=${targetId} oldRole=${target.role} newRole=${updated.role} oldStatus=${target.status} newStatus=${updated.status}`);
        return updated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof ForbiddenException || error instanceof NotFoundException) throw error;
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') throw new ConflictException('The account changed concurrently. Refresh and try again.');
      throw error;
    }
  }
}
