import { prisma } from "@/lib/prisma";

export async function findPropertyDashboardById(propertyId: string) {
  return prisma.property.findUnique({
    where: {
      id: propertyId,
    },
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
      },
      subwayConnections: {
        orderBy: {
          walkingMinutes: "asc",
        },
        take: 6,
        include: {
          station: {
            select: {
              id: true,
              name: true,
              lines: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      },
      complaints: {
        orderBy: {
          reportedAt: "desc",
        },
        take: 120,
      },
      violations: {
        orderBy: {
          issuedAt: "desc",
        },
        take: 20,
      },
      nearbyAmenities: {
        orderBy: {
          distanceMeters: "asc",
        },
        take: 24,
        include: {
          amenity: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });
}

