import { Borough } from "@prisma/client";
import { z } from "zod";

const intFromQuery = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    if (typeof value === "string") {
      return Number.parseInt(value, 10);
    }

    return value;
  },
  z.number().int().nonnegative().optional(),
);

export const searchSortSchema = z.enum(["rent_asc", "rent_desc", "score_desc"]);

export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(120).optional(),
    borough: z.nativeEnum(Borough).optional(),
    minRent: intFromQuery,
    maxRent: intFromQuery,
    beds: intFromQuery,
    page: z.preprocess(
      (value) => {
        if (value === undefined || value === null || value === "") {
          return 1;
        }

        if (typeof value === "string") {
          return Number.parseInt(value, 10);
        }

        return value;
      },
      z.number().int().positive().default(1),
    ),
    pageSize: z.preprocess(
      (value) => {
        if (value === undefined || value === null || value === "") {
          return 12;
        }

        if (typeof value === "string") {
          return Number.parseInt(value, 10);
        }

        return value;
      },
      z.number().int().min(1).max(50).default(12),
    ),
    sort: z.preprocess(
      (value) => {
        if (value === undefined || value === null || value === "") {
          return "score_desc";
        }

        return value;
      },
      searchSortSchema,
    ),
  })
  .refine((data) => (data.minRent && data.maxRent ? data.minRent <= data.maxRent : true), {
    message: "minRent must be less than or equal to maxRent",
    path: ["minRent"],
  });

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

