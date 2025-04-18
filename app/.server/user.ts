import type { User } from "~/types";
import bcrypt from "bcryptjs";
import {prisma} from "./prisma";

const saltRounds = 10;

export const getUsers = async () => {
  let users: User[] = [];
  try {
    const usrs = await prisma.user.findMany();
    users = usrs.map((user) => {
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        createdAt: user.createdAt,
      } satisfies User;
    });
  } catch (error) {
    console.log(error);
    users = [];
  }

  return users;
};

export const getUserByEmail = async (email: string) => {
  try {
    const u = await prisma.user.findUnique({ where: { email } });
    return u;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const createUser = async (
  email: string,
  password: string,
  role: string,
  firstName: string,
  lastName: string
) => {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const id = crypto.randomUUID().toString();
    const user = await prisma.user.create({
      data: {
        id,
        email,
        role,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });
    const u: User = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      image: user.image,
      createdAt: user.createdAt,
    };

    return u;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const user = await prisma.user.delete({ where: { id } });
    const u: { id: string } = { id: user.id };
    return u;
  } catch (error) {
    console.log(error);
    return null;
  }
};
