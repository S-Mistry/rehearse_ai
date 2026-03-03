import { NextResponse } from "next/server";
import { createDocument } from "@/lib/rehearse/repositories/memory-store";
import { readDocumentInput } from "@/lib/rehearse/services/document-intake";
import { extractCvProfile } from "@/lib/rehearse/services/rehearse-service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const intake = await readDocumentInput(formData, "cv");
    const parsed = await extractCvProfile(intake.rawText);
    const document = createDocument({
      kind: "cv",
      storagePath: intake.storagePath,
      sourceType: intake.sourceType,
      rawText: intake.rawText,
      structuredJson: parsed.structured,
      parseStatus: parsed.warnings.length > 0 ? "warning" : "parsed",
      parseWarnings: parsed.warnings,
    });

    return NextResponse.json({
      cvProfileId: document.id,
      summary: parsed.structured,
      warnings: parsed.warnings,
      provider: parsed.provider,
    });
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Unable to process the CV.",
      { status: 400 },
    );
  }
}
