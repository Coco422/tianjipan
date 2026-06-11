import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        nickname: { label: "道号", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const nickname = credentials?.nickname as string;
        const password = credentials?.password as string;
        if (!nickname || !password) return null;

        const user = await prisma.user.findUnique({ where: { nickname } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.nickname, email: undefined };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // 登录时或每次请求都刷新余额
      const userId = user?.id || token.id;
      if (userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId as string },
          select: { id: true, nickname: true, role: true, balance: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.nickname = dbUser.nickname;
          token.role = dbUser.role;
          token.balance = dbUser.balance;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.nickname = token.nickname as string;
        session.user.role = token.role as string;
        session.user.balance = token.balance as number;
      }
      return session;
    },
  },
});
