import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type AuthenticatedUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };
export type UpdateProfileInput = { firstName?: string; lastName?: string; displayName?: string; phoneNumber?: string; profilePhotoUrl?: string | null };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async sync(authUser: AuthenticatedUser) {
    if (!authUser.email?.trim()) throw new BadRequestException('Authenticated user email is required.');
    const email = authUser.email.trim().toLowerCase();
    const fullName = typeof authUser.user_metadata?.full_name === 'string' ? authUser.user_metadata.full_name.trim() : '';
    const [firstName = email.split('@')[0] || 'User', ...rest] = fullName.split(' ').filter(Boolean);
    const lastName = rest.join(' ');
    return this.prisma.user.upsert({
      where: { authUserId: authUser.id },
      update: { email },
      create: { authUserId: authUser.id, email, firstName, lastName, displayName: [firstName, lastName].filter(Boolean).join(' '), role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
    });
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
