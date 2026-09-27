const fs = require("node:fs");
const path = require("node:path");

function ingredientKey(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readCatalogue() {
  const groups = JSON.parse(
    fs.readFileSync(path.join(__dirname, "catalogue-ingredients.json"), "utf8"),
  );
  const seen = new Set();

  return groups.flatMap((group) =>
    group.ingredients.map(({ name, unit }) => {
      if (
        typeof name !== "string" ||
        name !== name.trim() ||
        !name ||
        name.length > 100 ||
        !["GRAM", "MILLILITER", "PIECE"].includes(unit)
      ) {
        throw new Error("Entrée invalide dans le catalogue");
      }

      const slug = ingredientKey(name);

      if (!slug || seen.has(slug)) {
        throw new Error(`Ingrédient en double : ${name}`);
      }

      seen.add(slug);

      return { name, slug, unit };
    }),
  );
}

function prepareImport(catalogue, existing) {
  const bySlug = new Map(existing.map((item) => [item.slug, item]));
  const byName = new Map(
    existing.map((item) => [ingredientKey(item.name), item]),
  );
  const additions = [];
  let preserved = 0;

  for (const item of catalogue) {
    const matchingSlug = bySlug.get(item.slug);

    if (matchingSlug && ingredientKey(matchingSlug.name) !== item.slug) {
      throw new Error(
        `Identifiant déjà utilisé pour un autre nom : ${item.slug}`,
      );
    }

    if (matchingSlug || byName.has(item.slug)) {
      preserved++;
    } else {
      additions.push(item);
    }
  }

  return { additions, preserved };
}

async function seedIngredients(prisma, { dryRun = false } = {}) {
  const catalogue = readCatalogue();

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.ingredient.findMany();
    const { additions, preserved } = prepareImport(catalogue, existing);
    let inserted = 0;

    if (!dryRun && additions.length) {
      const result = await transaction.ingredient.createMany({
        data: additions,
        skipDuplicates: true,
      });

      inserted = result.count;
    }

    return {
      catalogue: catalogue.length,
      existing: existing.length,
      preserved,
      planned: additions.length,
      inserted,
      total: await transaction.ingredient.count(),
      dryRun,
    };
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (
    args.some((argument) => !["--dry-run", "--apply"].includes(argument)) ||
    (args.includes("--dry-run") && args.includes("--apply"))
  ) {
    throw new Error("Utilise --dry-run ou --apply, séparément");
  }

  require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
    quiet: true,
  });

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    console.log(
      JSON.stringify(
        await seedIngredients(prisma, { dryRun: !args.includes("--apply") }),
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(
      error.code
        ? `Import interrompu (${error.code}). Vérifie la connexion et les migrations.`
        : error.message,
    );
    process.exitCode = 1;
  });
}

module.exports = {
  ingredientKey,
  readCatalogue,
  prepareImport,
  seedIngredients,
};
