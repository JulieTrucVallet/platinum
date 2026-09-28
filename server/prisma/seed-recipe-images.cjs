const path = require("node:path");
const { readRecipes, recipeSource } = require("./seed-recipes.cjs");

async function seedRecipeImages(prisma, { dryRun = true } = {}) {
  const catalogue = readRecipes().filter((recipe) => recipe.imageUrl);

  return prisma.$transaction(
    async (tx) => {
      if (!dryRun) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(1784, 2)`;
      }

      let planned = 0;
      let updated = 0;

      for (const recipe of catalogue) {
        const where = {
          source: recipeSource(recipe),
          authorId: null,
          OR: [{ imageUrl: null }, { imageUrl: "" }],
        };

        planned += await tx.recipe.count({ where });

        if (!dryRun) {
          const result = await tx.recipe.updateMany({
            where,
            data: { imageUrl: recipe.imageUrl },
          });

          updated += result.count;
        }
      }

      return { available: catalogue.length, planned, updated, dryRun };
    },
    { maxWait: 10000, timeout: 60000 },
  );
}

async function main() {
  const args = process.argv.slice(2);

  if (
    args.some((argument) => !["--apply", "--dry-run"].includes(argument)) ||
    (args.includes("--apply") && args.includes("--dry-run"))
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
        await seedRecipeImages(prisma, {
          dryRun: !args.includes("--apply"),
        }),
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
      error.code ? `Import interrompu (${error.code})` : error.message,
    );
    process.exitCode = 1;
  });
}

module.exports = { seedRecipeImages };
