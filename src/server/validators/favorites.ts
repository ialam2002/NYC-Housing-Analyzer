import { z } from "zod";

export const favoritePropertyIdSchema = z.string().cuid();

export const addFavoriteBodySchema = z.object({
  propertyId: favoritePropertyIdSchema,
});

export const removeFavoriteQuerySchema = z.object({
  propertyId: favoritePropertyIdSchema,
});

export type AddFavoriteBodyInput = z.infer<typeof addFavoriteBodySchema>;
export type RemoveFavoriteQueryInput = z.infer<typeof removeFavoriteQuerySchema>;

