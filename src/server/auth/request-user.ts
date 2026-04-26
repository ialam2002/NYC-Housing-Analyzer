import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/server/auth/options";

type ResolvedRequestUser = {
  id: string;
  email: string | null;
};

export async function resolveRequestUser(): Promise<ResolvedRequestUser | null> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user;

  if (!sessionUser) {
    return null;
  }

  if (sessionUser.id) {
    return {
      id: sessionUser.id,
      email: sessionUser.email ?? null,
    };
  }

  if (!sessionUser.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: sessionUser.email },
    select: {
      id: true,
      email: true,
    },
  });

  return user;
}

