import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { AI_MOCK_ENABLED } from "../assistant/api";
import type { AiDocument, StudyRequest, StudyResponse, UploadDocumentInput } from "./types";

async function call<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

const demoOff = () => new Error("The study assistant needs the AI service. It is switched off in demo mode.");

export async function askStudyAssistant(body: StudyRequest): Promise<StudyResponse> {
  if (AI_MOCK_ENABLED) throw demoOff();
  return call(aiHttpClient.post<StudyResponse>("api/ai/study-assistant", body));
}

export async function listAiDocuments(classId?: string): Promise<AiDocument[]> {
  if (AI_MOCK_ENABLED) return [];
  return call(aiHttpClient.get<AiDocument[]>("api/ai/documents", { params: { classId } }));
}

export async function uploadAiDocument(input: UploadDocumentInput): Promise<AiDocument> {
  if (AI_MOCK_ENABLED) throw demoOff();
  const form = new FormData();
  form.append("File", input.file);
  form.append("Title", input.title);
  form.append("ClassId", input.classId);
  form.append("SubjectId", input.subjectId);
  form.append("Visibility", input.visibility);
  return call(aiHttpClient.post<AiDocument>("api/ai/documents", form));
}

/** Prepare a study material for AI (staff). Processing continues in the background; poll getMaterialIndex. */
export async function indexMaterial(materialId: string, rebuild = false): Promise<AiDocument> {
  if (AI_MOCK_ENABLED) throw demoOff();
  return call(aiHttpClient.post<AiDocument>(`api/ai/materials/${materialId}/index`, null, { params: rebuild ? { rebuild: true } : undefined }));
}

/** A material's AI index, or null when it was never prepared. */
export async function getMaterialIndex(materialId: string): Promise<AiDocument | null> {
  if (AI_MOCK_ENABLED) return null;
  const res = await aiHttpClient.get<AiDocument | "">(`api/ai/materials/${materialId}/index`).catch((err) => {
    throw new Error(extractApiErrorMessage(err));
  });
  return res.status === 204 || !res.data ? null : (res.data as AiDocument);
}

/** File types the AI can read (same list as direct uploads). */
export const isAiReadableFile = (fileName?: string) => Boolean(fileName && UPLOAD_EXTENSIONS.some((e) => fileName.toLowerCase().endsWith(e)));

export async function deleteAiDocument(id: string): Promise<void> {
  await call(aiHttpClient.delete<void>(`api/ai/documents/${id}`));
}

export const UPLOAD_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt"];
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** The first problem with a file before it is uploaded (the server validates again), or null. */
export function validateUpload(file: File | null): string | null {
  if (!file) return "Choose a file.";
  const name = file.name.toLowerCase();
  if (!UPLOAD_EXTENSIONS.some((e) => name.endsWith(e))) return `Only ${UPLOAD_EXTENSIONS.join(", ")} files can be uploaded.`;
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return "Files can be at most 20 MB.";
  return null;
}
