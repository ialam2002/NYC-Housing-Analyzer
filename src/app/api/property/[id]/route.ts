import { NextRequest, NextResponse } from "next/server";

import { getPropertyDashboard } from "@/server/services/property.service";
import { propertyIdParamSchema } from "@/server/validators/property";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const parsedParams = propertyIdParamSchema.safeParse({ id });

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
    const data = await getPropertyDashboard(parsedParams.data.id);

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
    console.error("/api/property/[id] failed", error);

    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to fetch property dashboard.",
        },
      },
      { status: 500 },
    );
  }
}

