import type { PropertyListItem } from "@/types/domain";

export type FavoriteItem = {
  id: string;
  propertyId: string;
  createdAt: string;
  property: PropertyListItem;
};

export type FavoritesResponseData = {
  items: FavoriteItem[];
  total: number;
};

export type AddFavoriteResult = {
  favorite: FavoriteItem;
  created: boolean;
};

export type RemoveFavoriteResult = {
  removed: boolean;
};

