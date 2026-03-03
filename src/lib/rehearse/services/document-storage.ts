import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DocumentKind, EffectiveOwnerId } from "@/types/rehearse";

export const PRIVATE_DOCUMENT_BUCKET = "private-documents";

let bucketEnsured = false;

export function buildDocumentStoragePath(input: {
  ownerId: EffectiveOwnerId;
  kind: DocumentKind;
  documentId: string;
  fileName: string;
}) {
  const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `users/${input.ownerId}/${input.kind}/${input.documentId}/${safeFileName}`;
}

export async function uploadDocumentToStorage(input: {
  ownerId: EffectiveOwnerId;
  kind: DocumentKind;
  documentId: string;
  file: File;
}) {
  const client = createSupabaseAdminClient();
  if (!client) {
    return null;
  }

  await ensurePrivateDocumentBucket();

  const storagePath = buildDocumentStoragePath({
    ownerId: input.ownerId,
    kind: input.kind,
    documentId: input.documentId,
    fileName: input.file.name,
  });

  const arrayBuffer = await input.file.arrayBuffer();
  const { error } = await client.storage.from(PRIVATE_DOCUMENT_BUCKET).upload(
    storagePath,
    Buffer.from(arrayBuffer),
    {
      contentType: input.file.type || undefined,
      upsert: false,
    },
  );

  if (error) {
    throw new Error(error.message || "Unable to upload the document file.");
  }

  return storagePath;
}

async function ensurePrivateDocumentBucket() {
  if (bucketEnsured) {
    return;
  }

  const client = createSupabaseAdminClient();
  if (!client) {
    return;
  }

  const { data: bucket, error } = await client.storage.getBucket(PRIVATE_DOCUMENT_BUCKET);
  if (error && !/not found/i.test(error.message)) {
    throw new Error(error.message || "Unable to inspect Supabase Storage.");
  }

  if (!bucket) {
    const { error: createError } = await client.storage.createBucket(PRIVATE_DOCUMENT_BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
        "application/octet-stream",
      ],
    });
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(createError.message || "Unable to create the documents bucket.");
    }
  }

  bucketEnsured = true;
}
