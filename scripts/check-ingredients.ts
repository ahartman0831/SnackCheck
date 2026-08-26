import { evaluateCompliance, parseIngredients } from "@snackcheck/compliance";
import { evaluateInput } from "../packages/compliance/src/test-helpers";

const raw = process.argv.slice(2).join(" ");
if (!raw) {
  console.error('Usage: pnpm exec tsx scripts/check-ingredients.ts "Sugar, salt"');
  process.exit(1);
}

const parsed = parseIngredients(raw);
const result = evaluateCompliance(evaluateInput(raw));
console.log(
  JSON.stringify(
    {
      parsed,
      result,
    },
    null,
    2,
  ),
);
