import type { DocumentKind } from "@/types/rehearse";

export async function readDocumentInput(formData: FormData, kind: DocumentKind) {
  const rawText = String(formData.get("text") ?? "").trim();
  const file = formData.get("file");

  if (rawText) {
    return {
      kind,
      sourceType: "paste" as const,
      rawText,
      storagePath: null,
      fileName: null,
    };
  }

  if (!(file instanceof File)) {
    throw new Error(`Provide pasted text or upload a file for the ${kind.toUpperCase()}.`);
  }

  const extracted = await extractTextFromFile(file);
  return {
    kind,
    sourceType: "upload" as const,
    rawText: extracted,
    storagePath: null,
    fileName: file.name,
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
