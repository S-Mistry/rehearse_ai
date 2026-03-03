import { getEffectiveOwnerId } from "@/lib/rehearse/repositories/effective-owner";
import { uploadDocumentToStorage } from "@/lib/rehearse/services/document-storage";
import type { DocumentKind } from "@/types/rehearse";

export async function readDocumentInput(
  formData: FormData,
  kind: DocumentKind,
  documentId: string,
) {
  const rawText = String(formData.get("text") ?? "").trim();
  const file = formData.get("file");

  if (rawText) {
    return {
      kind,
      sourceType: "paste" as const,
      rawText,
      storagePath: null,
      fileName: null,
      parseError: null,
    };
  }

  if (!(file instanceof File)) {
    throw new Error(`Provide pasted text or upload a file for the ${kind.toUpperCase()}.`);
  }

  validateSupportedFile(file);
  const storagePath = await uploadDocumentToStorage({
    ownerId: getEffectiveOwnerId(),
    kind,
    documentId,
    file,
  });
  let extracted = "";
  let parseError: string | null = null;

  try {
    extracted = await extractTextFromFile(file);
  } catch (error) {
    parseError =
      error instanceof Error ? error.message : "Unable to parse the uploaded document.";
  }

  return {
    kind,
    sourceType: "upload" as const,
    rawText: extracted,
    storagePath,
    fileName: file.name,
    parseError,
  };
}

async function extractTextFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension || ["txt", "md"].includes(extension)) {
    return await file.text();
  }

  if (extension === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdfModule = await import("pdf-parse");
    const parser = new pdfModule.PDFParse({
      data: Buffer.from(arrayBuffer),
    });
    const parsed = await parser.getText();
    return parsed.text;
  }

  if (extension === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({
      buffer: Buffer.from(arrayBuffer),
    });
    return parsed.value;
  }

  throw new Error(
    "Unsupported file format. Use PDF, DOCX, TXT, or paste the document text directly.",
  );
}

function validateSupportedFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || ["pdf", "docx", "txt", "md"].includes(extension)) {
    return;
  }

  throw new Error(
    "Unsupported file format. Use PDF, DOCX, TXT, or paste the document text directly.",
  );
}
