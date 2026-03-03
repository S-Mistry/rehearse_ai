import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/api-response";
import { createDocument } from "@/lib/rehearse/repositories/memory-store";
import { readDocumentInput } from "@/lib/rehearse/services/document-intake";
import { extractJdProfile } from "@/lib/rehearse/services/rehearse-service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const documentId = randomUUID();
    const intake = await readDocumentInput(formData, "jd", documentId);

    if (intake.parseError) {
      const document = await createDocument({
        id: documentId,
        kind: "jd",
        fileName: intake.fileName,
        storagePath: intake.storagePath,
        sourceType: intake.sourceType,
        rawText: intake.rawText,
        structuredJson: {
          coreCompetencies: [],
          leadershipExpectationLevel: "unknown",
          strategicVsExecutionWeight: "unknown",
          stakeholderComplexityLevel: "unknown",
          performanceKeywords: [],
        },
        parseStatus: "failed",
        parseWarnings: [intake.parseError],
        provider: "fallback:local-parser",
      });

      return NextResponse.json({
        documentId: document.id,
        parseStatus: document.parseStatus,
        storagePath: document.storagePath,
        provider: document.provider,
        warnings: document.parseWarnings,
        document,
      });
    }

    const parsed = await extractJdProfile(intake.rawText);
    const document = await createDocument({
      id: documentId,
      kind: "jd",
      fileName: intake.fileName,
      storagePath: intake.storagePath,
      sourceType: intake.sourceType,
      rawText: intake.rawText,
      structuredJson: parsed.structured,
      parseStatus: parsed.warnings.length > 0 ? "warning" : "parsed",
      parseWarnings: parsed.warnings,
      provider: parsed.provider,
    });

    return NextResponse.json({
      documentId: document.id,
      parseStatus: document.parseStatus,
      storagePath: document.storagePath,
      provider: parsed.provider,
      warnings: parsed.warnings,
      document,
    });
  } catch (error) {
    return jsonError(
      400,
      "JD_PROCESSING_FAILED",
      error instanceof Error ? error.message : "Unable to process the JD.",
    );
  }
}
