const APPROVED_ALIAS_STATUSES = new Set([
  "EXACT_STATUTE_TERM",
  "AUTHORITATIVE_SYNONYM",
  "EXPERT_VERIFIED",
]);

export interface RulesetPublicationInput {
  effectiveFrom: string | null;
  isPublished: boolean;
  rulesetHash: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewDocumentUrl: string | null;
  reviewDocumentHash: string | null;
  publishedBy: string | null;
  activePrimarySourceCount: number;
  enabledSubstanceCount: number;
  enabledSubstancesHaveProvenance: boolean;
  enabledAliasesApprovedAndSourced: boolean;
  enabledContextsHaveProvenance: boolean;
}

export function publicationBlockers(input: RulesetPublicationInput): string[] {
  const blockers: string[] = [];
  if (!input.effectiveFrom) {
    blockers.push("effective_from is required");
  }
  if (input.activePrimarySourceCount < 1) {
    blockers.push("at least one active primary source is required");
  }
  if (input.enabledSubstanceCount !== 11) {
    blockers.push("exactly 11 enabled statutory substances are required");
  }
  if (!input.enabledSubstancesHaveProvenance) {
    blockers.push("every enabled substance must have source provenance");
  }
  if (!input.enabledAliasesApprovedAndSourced) {
    blockers.push("every enabled alias must be approved and sourced");
  }
  if (!input.enabledContextsHaveProvenance) {
    blockers.push("every enabled context must have source provenance");
  }
  if (!input.rulesetHash) {
    blockers.push("canonical ruleset hash must be populated");
  }
  const hasReview = [
    input.reviewedBy,
    input.reviewedAt,
    input.reviewDocumentUrl,
    input.reviewDocumentHash,
  ].some((value) => value !== null);
  if (
    hasReview &&
    (!input.reviewedBy ||
      !input.reviewedAt ||
      !/^https:\/\/[^\s]+$/.test(input.reviewDocumentUrl ?? "") ||
      !/^[0-9a-f]{64}$/.test(input.reviewDocumentHash ?? ""))
  ) {
    blockers.push(
      "optional review must include reviewer, timestamp, HTTPS document and SHA-256",
    );
  }
  if (input.isPublished && !input.publishedBy) {
    blockers.push("publisher is required");
  }
  return blockers;
}

export function canPublishRuleset(input: RulesetPublicationInput): boolean {
  return publicationBlockers({ ...input, isPublished: true }).length === 0;
}

export function isApprovedAliasStatus(status: string): boolean {
  return APPROVED_ALIAS_STATUSES.has(status);
}

export function nextDraftVersion(currentVersion: number): number {
  return currentVersion + 1;
}
