import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getRateLimitKey } from "@/server/middleware/rate-limiter";
import { resolveRequestUser } from "@/server/auth/request-user";
import { addFavorite, deleteFavorite, listFavorites } from "@/server/services/favorites.service";
import { addFavoriteBodySchema, removeFavoriteQuerySchema } from "@/server/validators/favorites";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required for favorites.",
      },
    },
    { status: 401 },
  );
}

export async function GET() {
  const user = await resolveRequestUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const data = await listFavorites(user.id);
    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("/api/favorites GET failed", error);

    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to fetch favorites.",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await resolveRequestUser();
  if (!user) {
    return unauthorizedResponse();
  }

  const rateLimitKey = getRateLimitKey(request);
  const rateLimit = checkRateLimit(rateLimitKey, 20);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded. Please try again later.",
        },
      },
      { status: 429 },
    );
  }

  const bodyResult = addFavoriteBodySchema.safeParse(await request.json().catch(() => null));
  if (!bodyResult.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid favorites request body.",
          details: bodyResult.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const result = await addFavorite(user.id, bodyResult.data.propertyId);

    if (!result) {
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

    return NextResponse.json({ data: result, error: null }, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error("/api/favorites POST failed", error);

    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to save favorite.",
        },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await resolveRequestUser();
  if (!user) {
    return unauthorizedResponse();
  }

  const rateLimitKey = getRateLimitKey(request);
  const rateLimit = checkRateLimit(rateLimitKey, 20);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded. Please try again later.",
        },
      },
      { status: 429 },
    );
  }

  const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
  const queryResult = removeFavoriteQuerySchema.safeParse(rawQuery);

  if (!queryResult.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid favorites delete query parameters.",
          details: queryResult.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const data = await deleteFavorite(user.id, queryResult.data.propertyId);

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("/api/favorites DELETE failed", error);

    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to remove favorite.",
        },
      },
      { status: 500 },
    );
  }
}

