import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";

import { prisma } from "@/lib/prisma";

const githubId = process.env.GITHUB_ID;
const githubSecret = process.env.GITHUB_SECRET;
const hasGitHubAuth = Boolean(githubId && githubSecret);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  providers: hasGitHubAuth
    ? [
        GitHubProvider({
          clientId: githubId!,
          clientSecret: githubSecret!,
        }),
      ]
    : [
        CredentialsProvider({
          name: "Disabled Auth",
          credentials: {},
          async authorize() {
            return null;
          },
        }),
      ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
};

