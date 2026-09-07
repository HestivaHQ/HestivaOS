import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { revision: process.env.HESTIVA_WEB_BUILD_REVISION || 'unknown' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
