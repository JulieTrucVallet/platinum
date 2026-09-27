import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { objectFields, positiveId } from "./stock.validation";

export const publicAccount = { id: true, username: true, email: true, role: true } as const;
export async function checkIdentityAvailable(username: string, email: string, exceptId?: number) {
  const duplicate = await prisma.user.findFirst({ where: {
    ...(exceptId === undefined ? {} : { id: { not: exceptId } }),
    OR: [{ username }, { email: { equals: email, mode: "insensitive" } }],
  }, select: { id: true } });
  if (duplicate) throw new ApiError(409, "Ce nom d’utilisateur ou cette adresse e-mail est déjà utilisé");
}
export function identity(username: unknown, email: unknown) {
  if (typeof username !== "string" || username.trim().length < 2 || username.trim().length > 80) throw new ApiError(400, "Nom d’utilisateur attendu (2 à 80 caractères)");
  if (typeof email !== "string" || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new ApiError(400, "Adresse e-mail invalide");
  return { username: username.trim(), email: email.trim().toLowerCase() };
}
export function passwordValue(value: unknown, registering = false) {
  if (typeof value !== "string" || value.length < (registering ? 8 : 1) || Buffer.byteLength(value, "utf8") > 72) throw new ApiError(400, "Mot de passe invalide (8 caractères minimum à l’inscription, 72 octets maximum)");
  return value;
}
export function accountError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ApiError(409, "Ce nom d’utilisateur ou cette adresse e-mail est déjà utilisé");
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new ApiError(404, "Compte introuvable");
  throw error;
}
export async function getAccount(id: number) {
  const account = await prisma.user.findUnique({ where: { id }, select: publicAccount });
  if (!account) throw new ApiError(401, "Compte introuvable");
  return account;
}
export async function updateAccount(id: number, value: unknown) {
  const body = objectFields(value, ["username", "email", "currentPassword"]);
  const fields = identity(body.username, body.email);
  const password = passwordValue(body.currentPassword);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(401, "Compte introuvable");
  if (!await bcrypt.compare(password, user.password)) throw new ApiError(403, "Le mot de passe actuel est incorrect");
  await checkIdentityAvailable(fields.username, fields.email, id);
  try { return await prisma.user.update({ where: { id }, data: fields, select: publicAccount }); }
  catch (error) { return accountError(error); }
}
export async function listAccounts(value: unknown) {
  const query = objectFields(value, ["q", "page"]);
  if (query.q !== undefined && (typeof query.q !== "string" || query.q.length > 100)) throw new ApiError(400, "Recherche invalide");
  const q = (query.q as string | undefined)?.trim() || "";
  const page = query.page === undefined ? 1 : positiveId(query.page), pageSize = 20;
  if ((page - 1) * pageSize > 2147483647) throw new ApiError(400, "Pagination hors limites");
  const where: Prisma.UserWhereInput = { OR: [{ username: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: { ...publicAccount, createdAt: true }, orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items, total, page, pageSize };
}
export async function deleteAccount(id: number, actorId: number) {
  if (id === actorId) throw new ApiError(403, "Vous ne pouvez pas supprimer votre propre compte ici");
  // Le rôle fait partie de la condition d’écriture : aucun administrateur ne peut être supprimé.
  const result = await prisma.user.deleteMany({ where: { id, role: "USER" } });
  if (!result.count) throw new ApiError(404, "Compte standard introuvable ou non supprimable");
}
