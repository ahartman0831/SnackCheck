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
  if (!input.reviewedBy || !input.reviewedAt) {
    blockers.push("signed reviewer and reviewed_at are required");
  }
  if (!input.reviewDocumentUrl || !input.reviewDocumentHash) {
    blockers.push("review document URL and hash are required");
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
