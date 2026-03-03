import { describe, expect, it } from "vitest";
import { buildDocumentStoragePath } from "@/lib/rehearse/services/document-storage";

describe("buildDocumentStoragePath", () => {
  it("creates a future-safe owner-scoped storage path", () => {
    expect(
      buildDocumentStoragePath({
        ownerId: "owner-123",
        kind: "cv",
        documentId: "doc-456",
        fileName: "Senior Product Manager Resume.pdf",
      }),
    ).toBe("users/owner-123/cv/doc-456/Senior-Product-Manager-Resume.pdf");
  });
});
