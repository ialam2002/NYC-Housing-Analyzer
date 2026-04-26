import { NextRequest, NextResponse } from "next/server";

import { getPropertyScore } from "@/server/services/score.service";
import { scoreIdParamSchema, scoreQuerySchema } from "@/server/validators/score";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsedQuery = scoreQuerySchema.safeParse(rawQuery);

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid score query parameters.",
          details: parsedQuery.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const parsedParams = scoreIdParamSchema.safeParse({ id });

  if (!parsedParams.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid property id.",
          details: parsedParams.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const data = await getPropertyScore(parsedParams.data.id, parsedQuery.data.persist);

    if (!data) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Property not found.",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("/api/score/[id] failed", error);

    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to calculate property score.",
        },
      },
      { status: 500 },
    );
  }
}

