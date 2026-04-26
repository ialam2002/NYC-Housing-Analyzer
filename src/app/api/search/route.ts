import { NextRequest, NextResponse } from "next/server";

import { searchProperties } from "@/server/services/search.service";
import { searchQuerySchema } from "@/server/validators/search";

export async function GET(request: NextRequest) {
  const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = searchQuerySchema.safeParse(rawQuery);

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid search query parameters.",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const data = await searchProperties(parsed.data);

    return NextResponse.json({
      data,
      error: null,
    });
  } catch (error) {
    console.error("/api/search failed", error);

    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to fetch search results.",
        },
      },
      { status: 500 },
    );
  }
}

