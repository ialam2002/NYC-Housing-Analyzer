import { z } from "zod";

export const propertyIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type PropertyIdParamInput = z.infer<typeof propertyIdParamSchema>;

