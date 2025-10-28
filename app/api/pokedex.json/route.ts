import { dexServer } from '@/app/helpers/pokedex.server';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
dexServer.init()
export async function GET() {
  // If server hasn’t hydrated yet, do it now
  if (dexServer.size() < 1) {
    await dexServer.init()
  }
  
  return new NextResponse(dexServer.serializeAll(), {
    headers: { 'Content-Type': 'application/json' },
  });
}
