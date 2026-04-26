import { Prisma, PropertyStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { SearchQuery } from "@/types/search";

function buildWhere(query: SearchQuery): Prisma.PropertyWhereInput {
  const filters: Prisma.PropertyWhereInput[] = [{ status: PropertyStatus.ACTIVE }];

  if (query.q) {
    filters.push({
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { addressLine1: { contains: query.q, mode: "insensitive" } },
        { postalCode: { contains: query.q, mode: "insensitive" } },
        { neighborhood: { name: { contains: query.q, mode: "insensitive" } } },
      ],
    });
  }

  if (query.borough) {
    filters.push({ borough: query.borough });
  }

  if (typeof query.minRent === "number") {
    filters.push({ rent: { gte: query.minRent } });
  }

  if (typeof query.maxRent === "number") {
    filters.push({ rent: { lte: query.maxRent } });
  }

  if (typeof query.beds === "number") {
    filters.push({ bedrooms: { gte: query.beds } });
  }

  return { AND: filters };
}

function buildOrderBy(query: SearchQuery): Prisma.PropertyOrderByWithRelationInput {
  if (query.sort === "rent_asc") {
    return { rent: "asc" };
  }

  if (query.sort === "rent_desc") {
    return { rent: "desc" };
  }

  return { updatedAt: "desc" };
}

export async function findPropertiesBySearch(query: SearchQuery) {
  const where = buildWhere(query);
  const orderBy = buildOrderBy(query);
  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await prisma.$transaction([
    prisma.property.findMany({
      where,
      orderBy,
      skip,
      take: query.pageSize,
      include: {
        neighborhood: {
          select: {
            name: true,
          },
        },
        scores: {
          orderBy: {
            calculatedAt: "desc",
          },
          take: 1,
          select: {
            overall: true,
          },
        },
      },
    }),
    prisma.property.count({ where }),
  ]);

  return { items, total };
}

