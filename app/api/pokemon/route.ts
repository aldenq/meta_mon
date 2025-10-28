// app/api/pokemon/route.ts
import { dexServer } from "@/app/helpers/pokedex.server";
import { NextResponse } from "next/server";
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const name = searchParams.get("name");
  const key = id ?? name;
  if (!key) return NextResponse.json({ error: "missing id or name" }, { status: 400 });

  try {
    const p = await dexServer.get(id ? Number(id) : name!);
    if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });

    return NextResponse.json(JSON.stringify(p));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}
