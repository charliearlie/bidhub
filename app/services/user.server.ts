// app/utils/user.server.ts
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { json } from "@remix-run/node";

import { prisma } from "./prisma.server";
import { EditUserForm, LoginForm, RegisterForm } from "~/services/types.server";
import { createUserSession } from "~/session.server";
import sendEmail from "~/services/email.server";

import resetPasswordEmailTemplate from "~/util/helpers/email/reset-password-email";
import { User } from "@prisma/client";
import { redirect, typedjson } from "remix-typedjson";

export const register = async (user: RegisterForm) => {
  const exists = await prisma.user.count({ where: { email: user.email } });
  if (exists) {
    return json(
      { error: `User already exists with that email` },
      { status: 400 }
    );
  }

  const newUser = await createUser(user);

  if (!newUser) {
    return json(
      {
        error: `Something went wrong trying to create a new user.`,
        fields: { email: user.email, password: user.password },
      },
      { status: 400 }
    );
  }

  return createUserSession(newUser.id);
};

export const login = async ({ email, password }: LoginForm) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await bcrypt.compare(password, user.password)))
    return json({ error: `Incorrect login` }, { status: 400 });

  return createUserSession(user.id);
};

export const forgotPassword = async (email: string) => {
  const exists = await prisma.user.count({ where: { email } });
  if (!exists) {
    return json({ error: `No user with that email exists` }, { status: 400 });
  }

  const token = uuidv4();
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 1);
  await prisma.forgotPassword.create({
    data: {
      email,
      token,
      expiration,
    },
  });

  const html = resetPasswordEmailTemplate(token);
  await sendEmail(email, "Reset your password", html);

  return json({ success: true });
};

export const resetPassword = async (password: string, token: string) => {
  const forgotPassword = await prisma.forgotPassword.findUnique({
    where: {
      token,
    },
  });

  if (!forgotPassword || forgotPassword.expiration < new Date()) {
    return json({ false: true, error: "Token is invalid" });
  }

  const updatedUser = await prisma.user.update({
    where: {
      email: forgotPassword.email,
    },
    data: {
      password: await bcrypt.hash(password, 10),
    },
  });
  await prisma.forgotPassword.delete({
    where: {
      token,
    },
  });

  return createUserSession(updatedUser.id);
};

export const createUser = async (user: RegisterForm) => {
  const passwordHash = await bcrypt.hash(user.password, 10);
  const newUser = await prisma.user.create({
    data: {
      email: user.email,
      password: passwordHash,
      username: user.username,
    },
  });
  return { id: newUser.id, email: newUser.email };
};

export const editUser = async (userId: string, edited: EditUserForm) => {
  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarUrl: edited.avatarUrl,
        personalDetails: {
          upsert: {
            update: {
              firstName: edited.firstName || "",
              lastName: edited.lastName || "",
            },
            set: {
              firstName: edited.firstName || "",
              lastName: edited.lastName || "",
            },
          },
        },
      },
    });
    return typedjson({ error: null, updatedUser });
  } catch (e) {
    return typedjson({ updatedUser: null, error: "Couldn't update lad" });
  }
};