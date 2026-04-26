import {
  findFavoriteByUserAndProperty,
  findFavoritesByUserId,
  findPropertyId,
  removeFavorite,
  upsertFavorite,
} from "@/server/repositories/favorites.repository";
import type { PropertyListItem } from "@/types/domain";
import type { AddFavoriteResult, FavoriteItem, FavoritesResponseData, RemoveFavoriteResult } from "@/types/favorites";

function toPropertyListItem(property: {
  id: string;
  title: string;
  addressLine1: string;
  borough: string;
  postalCode: string;
  rent: number;
  bedrooms: number | null;
  bathrooms: { toNumber: () => number } | null;
  scores: Array<{ overall: number }>;
}): PropertyListItem {
  return {
    id: property.id,
    title: property.title,
    addressLine1: property.addressLine1,
    borough: property.borough,
    postalCode: property.postalCode,
    rent: property.rent,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms ? property.bathrooms.toNumber() : null,
    score: property.scores[0]?.overall ?? null,
  };
}

function toFavoriteItem(item: {
  id: string;
  propertyId: string;
  createdAt: Date;
  property: {
    id: string;
    title: string;
    addressLine1: string;
    borough: string;
    postalCode: string;
    rent: number;
    bedrooms: number | null;
    bathrooms: { toNumber: () => number } | null;
    scores: Array<{ overall: number }>;
  };
}): FavoriteItem {
  return {
    id: item.id,
    propertyId: item.propertyId,
    createdAt: item.createdAt.toISOString(),
    property: toPropertyListItem(item.property),
  };
}

export async function listFavorites(userId: string): Promise<FavoritesResponseData> {
  const items = await findFavoritesByUserId(userId);

  return {
    items: items.map(toFavoriteItem),
    total: items.length,
  };
}

export async function addFavorite(userId: string, propertyId: string): Promise<AddFavoriteResult | null> {
  const property = await findPropertyId(propertyId);
  if (!property) {
    return null;
  }

  const existing = await findFavoriteByUserAndProperty(userId, propertyId);
  const favorite = await upsertFavorite(userId, propertyId);

  return {
    favorite: toFavoriteItem(favorite),
    created: !existing,
  };
}

export async function deleteFavorite(userId: string, propertyId: string): Promise<RemoveFavoriteResult> {
  const deleted = await removeFavorite(userId, propertyId);

  return {
    removed: deleted.count > 0,
  };
}

