import { Injectable } from '@nestjs/common';
import type { MessagingChannel } from './messaging-contract';
import type { MessagingProviderAdapter } from './messaging-provider-adapter';

@Injectable()
export class MessagingAdapterRegistry {
  private readonly adapters = new Map<string, MessagingProviderAdapter>();
  register(adapter: MessagingProviderAdapter): void { this.adapters.set(this.key(adapter.channel, adapter.provider), adapter); }
  get(channel: MessagingChannel, provider: string): MessagingProviderAdapter | undefined { return this.adapters.get(this.key(channel, provider)); }
  private key(channel: MessagingChannel, provider: string): string { return `${channel}:${provider.trim().toLowerCase()}`; }
}
