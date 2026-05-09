import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    agents: AGENTS,
    default: "gemini",
  });
}
