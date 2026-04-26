import { prisma } from "@/lib/prisma";

export async function findFavoritesByUserId(userId: string) {
  return prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      property: {
        include: {
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
      },
    },
  });
}

export async function findFavoriteByUserAndProperty(userId: string, propertyId: string) {
  return prisma.favorite.findUnique({
    where: {
      userId_propertyId: {
        userId,
        propertyId,
      },
    },
    include: {
      property: {
        include: {
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
      },
    },
  });
}

export async function findPropertyId(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true },
  });
}

export async function upsertFavorite(userId: string, propertyId: string) {
  return prisma.favorite.upsert({
    where: {
      userId_propertyId: {
        userId,
        propertyId,
      },
    },
    update: {},
    create: {
      userId,
      propertyId,
    },
    include: {
      property: {
        include: {
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
      },
    },
  });
}

export async function removeFavorite(userId: string, propertyId: string) {
  return prisma.favorite.deleteMany({
    where: {
      userId,
      propertyId,
    },
  });
}

