import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().min(1),
});

const parsedServerEnv = serverEnvSchema.safeParse(process.env);
if (!parsedServerEnv.success) {
  console.error("Invalid server environment variables", parsedServerEnv.error.flatten().fieldErrors);
  throw new Error("Invalid server environment variables");
}

const parsedClientEnv = clientEnvSchema.safeParse({
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
});
if (!parsedClientEnv.success) {
  console.error("Invalid client environment variables", parsedClientEnv.error.flatten().fieldErrors);
  throw new Error("Invalid client environment variables");
}

export const env = {
  ...parsedServerEnv.data,
  ...parsedClientEnv.data,
};

