import { createScoreSnapshot, findScoreSignalsByPropertyId } from "@/server/repositories/score.repository";
import { computeRentWiseScore } from "@/server/scoring/rentwise-score.engine";
import type { PropertyScoreResponseData } from "@/types/score";
export async function getPropertyScore(propertyId: string, persist = false): Promise<PropertyScoreResponseData | null> {
  const signals = await findScoreSignalsByPropertyId(propertyId);
  if (!signals) {
    return null;
  }
  const { score, details } = computeRentWiseScore({
    borough: signals.borough,
    subwayConnections: signals.subwayConnections,
    complaints: signals.complaints,
    nearbyAmenities: signals.nearbyAmenities,
    violations: signals.violations,
  });
  if (persist) {
    await createScoreSnapshot(propertyId, score, details.algorithmVersion);
  }
  return {
    propertyId,
    score,
    previousOverall: signals.scores[0]?.overall ?? null,
    details,
  };
}
