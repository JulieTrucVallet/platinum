import { IngredientUnit, Prisma, StorageLocation } from "@prisma/client";
import { ApiError } from "../utils/api-error";

export function positiveId(value: unknown): number {
  if ((typeof value !== "string" && typeof value !== "number") ||
      (typeof value === "string" && value !== value.trim()) ||
      !/^[1-9]\d*$/.test(String(value))) {
    throw new ApiError(400, "Identifiant invalide");
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id > 2147483647) throw new ApiError(400, "Identifiant invalide");
  return id;
}

export function objectFields(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "Objet JSON attendu");
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new ApiError(400, "Champ non autorisé");
  return body;
}

export function locationValue(value: unknown): StorageLocation {
  if (typeof value !== "string" || !Object.values(StorageLocation).includes(value as StorageLocation)) {
    throw new ApiError(400, "Emplacement invalide");
  }
  return value as StorageLocation;
}

const units: Record<string, { reference: IngredientUnit; factor: number }> = {
  GRAM: { reference: "GRAM", factor: 1 },
  KILOGRAM: { reference: "GRAM", factor: 1000 },
  MILLILITER: { reference: "MILLILITER", factor: 1 },
  LITER: { reference: "MILLILITER", factor: 1000 },
  PIECE: { reference: "PIECE", factor: 1 },
};

export function referenceQuantity(value: unknown, unit: unknown, reference: IngredientUnit): Prisma.Decimal {
  if ((typeof value !== "number" && typeof value !== "string") ||
      (typeof value === "string" && value !== value.trim()) ||
      !/^\d{1,9}(\.\d{1,3})?$/.test(String(value))) {
    throw new ApiError(400, "Quantité positive attendue, avec au plus trois décimales");
  }
  if (typeof unit !== "string" || !Object.prototype.hasOwnProperty.call(units, unit) || units[unit].reference !== reference) {
    throw new ApiError(400, "Unité incompatible avec cet ingrédient");
  }
  const quantity = new Prisma.Decimal(value).mul(units[unit].factor);
  if (quantity.lte(0) || quantity.gt("999999999.999")) {
    throw new ApiError(400, "Quantité hors limites ; supprimez la ligne si le stock est épuisé");
  }
  return quantity;
}
