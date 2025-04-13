import bcrypt from "bcryptjs";
import { PrismaClient } from '../app/generated/prisma'

const saltRounds = 10;
const prisma = new PrismaClient()

export async function main() {
  try {
    const hashedPassword = await bcrypt.hash("sham", saltRounds);
    const id = crypto.randomUUID().toString();
    const email = "shamayel.torabi@gmail.com";
    const role = "admin";
    const firstName = "Shamayel";
    const lastName = "Torabi"
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

  } catch (error) {
    console.log(error);
  }
}

await main();
