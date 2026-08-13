import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User, UserRole, UserStatus } from '@prisma/client';
import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';

type SupabaseUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

type JwtHeader = {
  alg?: string;
  kid?: string;
};

type JwtClaims = {
  sub?: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  nbf?: number;
};

type JsonWebKeyWithKid = JsonWebKey & {
  kid?: string;
  alg?: string;
  use?: string;
  [key: string]: unknown;
};

type JwksResponse = {
  keys?: JsonWebKeyWithKid[];
};

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;
const CLOCK_SKEW_SECONDS = 30;

let cachedJwks:
  | {
      url: string;
      expiresAt: number;
      keys: JsonWebKeyWithKid[];
    }
  | undefined;

function decodeBase64UrlJson<T>(value: string): T {
  try {
    return JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as T;
  } catch {
    throw new UnauthorizedException('Invalid authentication token.');
  }
}

function configuredSupabaseUrl(): string {
  const raw =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!raw?.trim()) {
    throw new UnauthorizedException('Authentication is required.');
  }

  return raw.trim().replace(/\/+$/, '');
}

async function fetchJwks(
  supabaseUrl: string,
  forceRefresh = false,
): Promise<JsonWebKeyWithKid[]> {
  const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedJwks?.url === jwksUrl &&
    cachedJwks.expiresAt > now
  ) {
    return cachedJwks.keys;
  }

  let response: Response;

  try {
    response = await fetch(jwksUrl, {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    throw new UnauthorizedException(
      'Authentication token could not be verified.',
    );
  }

  if (!response.ok) {
    throw new UnauthorizedException(
      'Authentication token could not be verified.',
    );
  }

  let body: JwksResponse;

  try {
    body = (await response.json()) as JwksResponse;
  } catch {
    throw new UnauthorizedException(
      'Authentication token could not be verified.',
    );
  }

  const keys = Array.isArray(body.keys) ? body.keys : [];

  if (keys.length === 0) {
    throw new UnauthorizedException(
      'Authentication token could not be verified.',
    );
  }

  cachedJwks = {
    url: jwksUrl,
    expiresAt: now + JWKS_CACHE_TTL_MS,
    keys,
  };

  return keys;
}

function validateClaims(
  claims: JwtClaims,
  supabaseUrl: string,
): SupabaseUser {
  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = `${supabaseUrl}/auth/v1`;

  if (
    typeof claims.sub !== 'string' ||
    claims.sub.length === 0 ||
    claims.iss !== expectedIssuer ||
    typeof claims.exp !== 'number' ||
    claims.exp < now - CLOCK_SKEW_SECONDS
  ) {
    throw new UnauthorizedException('Invalid authentication token.');
  }

  if (
    typeof claims.nbf === 'number' &&
    claims.nbf > now + CLOCK_SKEW_SECONDS
  ) {
    throw new UnauthorizedException('Invalid authentication token.');
  }

  const audiences = Array.isArray(claims.aud)
    ? claims.aud
    : typeof claims.aud === 'string'
      ? [claims.aud]
      : [];

  if (!audiences.includes('authenticated')) {
    throw new UnauthorizedException('Invalid authentication token.');
  }

  return {
    id: claims.sub,
    email: claims.email,
    email_confirmed_at: claims.email_confirmed_at,
    user_metadata: claims.user_metadata,
  };
}

async function verifySupabaseToken(
  token: string,
  supabaseUrl: string,
): Promise<SupabaseUser> {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new UnauthorizedException('Invalid authentication token.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const header = decodeBase64UrlJson<JwtHeader>(encodedHeader);
  const claims = decodeBase64UrlJson<JwtClaims>(encodedPayload);

  if (
    header.alg !== 'ES256' ||
    typeof header.kid !== 'string' ||
    header.kid.length === 0
  ) {
    throw new UnauthorizedException('Invalid authentication token.');
  }

  let keys = await fetchJwks(supabaseUrl);
  let jwk = keys.find(
    (key) =>
      key.kid === header.kid &&
      (!key.alg || key.alg === 'ES256') &&
      (!key.use || key.use === 'sig'),
  );

  if (!jwk) {
    keys = await fetchJwks(supabaseUrl, true);
    jwk = keys.find(
      (key) =>
        key.kid === header.kid &&
        (!key.alg || key.alg === 'ES256') &&
        (!key.use || key.use === 'sig'),
    );
  }

  if (!jwk) {
    throw new UnauthorizedException('Invalid authentication token.');
  }

  let publicKey: ReturnType<typeof createPublicKey>;

  try {
    publicKey = createPublicKey({
      key: jwk,
      format: 'jwk',
    });
  } catch {
    throw new UnauthorizedException('Invalid authentication token.');
  }

  let signature: Buffer;

  try {
    signature = Buffer.from(encodedSignature, 'base64url');
  } catch {
    throw new UnauthorizedException('Invalid authentication token.');
  }

  const verified = verifySignature(
    'sha256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    {
      key: publicKey,
      dsaEncoding: 'ieee-p1363',
    },
    signature,
  );

  if (!verified) {
    throw new UnauthorizedException('Invalid authentication token.');
  }

  return validateClaims(claims, supabaseUrl);
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      url?: string;
      supabaseUser?: SupabaseUser;
      currentUser?: User;
    }>();

    const token = request.headers.authorization?.match(
      /^Bearer (.+)$/i,
    )?.[1];

    if (!token) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const supabaseUrl = configuredSupabaseUrl();

    request.supabaseUser = await verifySupabaseToken(token, supabaseUrl);

    const currentUser = await this.prisma.user.findUnique({
      where: {
        authUserId: request.supabaseUser.id,
      },
    });

    const isSync = request.url
      ?.split('?')[0]
      .endsWith('/users/sync');

    if (!currentUser) {
      if (isSync) {
        return true;
      }

      throw new UnauthorizedException(
        'Application user profile is required.',
      );
    }

    if (currentUser.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Hestiva OS access is disabled.');
    }

    request.currentUser = currentUser;

    const roles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (roles && !roles.includes(currentUser.role)) {
      throw new ForbiddenException(
        'Administrator access is required.',
      );
    }

    return true;
  }
}
