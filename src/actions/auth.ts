"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";

const registerSchema = z.object({
  nickname: z
    .string()
    .min(2, "道号至少两个字")
    .max(20, "道号至多二十字"),
  password: z.string().min(4, "密码至少四位"),
});

export async function register(formData: FormData) {
  const parsed = registerSchema.safeParse({
    nickname: formData.get("nickname"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { nickname, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { nickname } });
  if (existing) {
    return { error: "此道号已被占用" };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { nickname, password: hashed },
  });

  // Auto-login after registration
  await signIn("credentials", {
    nickname,
    password,
    redirect: false,
  });

  return { success: true };
}

export async function login(formData: FormData) {
  const nickname = formData.get("nickname") as string;
  const password = formData.get("password") as string;

  if (!nickname || !password) {
    return { error: "请填写道号与密码" };
  }

  try {
    await signIn("credentials", {
      nickname,
      password,
      redirect: false,
    });
    return { success: true };
  } catch {
    return { error: "道号或密码有误" };
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
