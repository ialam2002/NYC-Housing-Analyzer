import { prisma } from "@/lib/prisma";
import type { ScoreBreakdown } from "@/types/domain";

export async function findScoreSignalsByPropertyId(propertyId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 180);

  return prisma.property.findUnique({
    where: {
      id: propertyId,
    },
    select: {
      id: true,
      borough: true,
      subwayConnections: {
        orderBy: {
          walkingMinutes: "asc",
        },
        take: 12,
        select: {
          walkingMinutes: true,
          distanceMeters: true,
        },
      },
      complaints: {
        where: {
          reportedAt: {
            gte: since,
          },
        },
        select: {
          category: true,
          status: true,
          reportedAt: true,
        },
      },
      nearbyAmenities: {
        orderBy: {
          distanceMeters: "asc",
        },
        take: 60,
        select: {
          distanceMeters: true,
          amenity: {
            select: {
              type: true,
            },
          },
        },
      },
      violations: {
        select: {
          severity: true,
          status: true,
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
  });
}

export async function createScoreSnapshot(propertyId: string, score: ScoreBreakdown, algorithmVersion: string) {
  return prisma.rentWiseScore.create({
    data: {
      propertyId,
      overall: score.overall,
      transit: score.transit,
      complaints: score.complaints,
      amenities: score.amenities,
      safety: score.safety,
      buildingCondition: score.buildingCondition,
      algorithmVersion,
    },
    select: {
      id: true,
      calculatedAt: true,
    },
  });
}

