import { z } from "zod";

const booleanFromQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "1" || normalized === "true") {
      return true;
    }

    if (normalized === "0" || normalized === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

export const scoreIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const scoreQuerySchema = z.object({
  persist: booleanFromQuery.default(false),
});

export type ScoreIdParamInput = z.infer<typeof scoreIdParamSchema>;
export type ScoreQueryInput = z.infer<typeof scoreQuerySchema>;

