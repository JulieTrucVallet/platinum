import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { identity, passwordValue, publicAccount, accountError, checkIdentityAvailable } from "./account.service";

export async function registerUser(username: unknown, email: unknown, password: unknown) {
  const fields = identity(username, email);
  const hashedPassword = await bcrypt.hash(passwordValue(password, true), 10);
  await checkIdentityAvailable(fields.username, fields.email);
  try { return await prisma.user.create({ data: { ...fields, password: hashedPassword }, select: publicAccount }); }
  catch (error) { return accountError(error); }
}
export async function loginUser(email: unknown, password: unknown) {
  if (typeof email !== "string" || email.length > 254) throw new ApiError(400, "Adresse e-mail invalide");
  const checkedPassword = passwordValue(password);
  const user = await prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } });
  if (!user || !await bcrypt.compare(checkedPassword, user.password)) throw new ApiError(401, "Identifiants incorrects");
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
  return { token, user: { id: user.id, username: user.username, email: user.email, role: user.role } };
}
