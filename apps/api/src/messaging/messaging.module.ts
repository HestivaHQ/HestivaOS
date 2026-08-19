import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MessagingAdapterRegistry } from './messaging-adapter-registry';
import { MessagingService } from './messaging.service';
@Global()
@Module({ providers: [PrismaService, MessagingAdapterRegistry, MessagingService], exports: [MessagingAdapterRegistry, MessagingService] })
export class MessagingModule {}
