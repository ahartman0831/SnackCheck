import { describe, expect, it } from "vitest";
import { isAuthorizedSubmissionCookie } from "../../lib/submissions/submission-token";

describe("P0-5 submission ownership token", () => {
  it("must not treat a cookie of ${id}.${anything} as authorized", () => {
    const submissionId = "11111111-1111-1111-1111-111111111111";
    expect(
      isAuthorizedSubmissionCookie(`${submissionId}.forged-request-id`, submissionId),
    ).toBe(false);
  });
});
