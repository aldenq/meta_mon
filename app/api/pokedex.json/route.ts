import { dex } from '@/app/helpers/pokedex';
import { NextResponse } from 'next/server';

export async function GET() {
  // If server hasn’t hydrated yet, do it now
  // if (dex.size() < 1) {
  //   await dex.autoHydrate(1327, 1);
  // }
  return new NextResponse(dex.serialize(), {
    headers: { 'Content-Type': 'application/json' },
  });
}
