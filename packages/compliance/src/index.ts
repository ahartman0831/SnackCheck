export { ENGINE_VERSION } from "./version";

export { normalizeIngredientText, normalizeAlias } from "./normalize";
export { parseIngredients } from "./parse-ingredients";
export { matchRules } from "./match";
export { applyQualityGates } from "./quality-gates";
export { hashCanonicalJson, hashFormulation, hashRuleset } from "./hash-ruleset";
export { evaluateCompliance } from "./engine";
export type { ParseResult, ParseWarning } from "./parse-ingredients";
export { arizonaRuleset, PENDING_ALIAS_FIXTURES } from "./fixtures/arizona-ruleset";
