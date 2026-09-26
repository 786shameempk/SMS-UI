import { ACADEMIC_API_BASE_URL, academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  StudyMaterial,
  StudyMaterialAudience,
  StudyMaterialCategory,
  StudyMaterialCounts,
  StudyMaterialFilters,
  StudyMaterialFormValues,
  StudyMaterialStatus,
} from "./types";

// AcademicService serializes enums as PascalCase names (JsonStringEnumConverter); the UI uses camelCase.
const toApiEnum = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
const fromApiEnum = <T extends string>(v: string) => (v.charAt(0).toLowerCase() + v.slice(1)) as T;

interface ApiStudyMaterial {
  id: string;
  tenantId: string;
  isGlobal: boolean;
  title: string;
  description: string | null;
  category: string;
  academicYearId: string | null;
  classId: string | null;
  sectionId: string | null;
  subjectId: string | null;
  className: string | null;
  sectionName: string | null;
  subjectName: string | null;
  chapter: string | null;
  audience: string;
  status: string;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  isScheduled: boolean;
  isPinned: boolean;
  uploadedByUserId: string;
  uploadedByName: string;
  uploadedByRole: string;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  isPreviewable: boolean;
  viewUrl: string | null;
  downloadUrl: string | null;
  linkUrl: string | null;
  viewCount: number;
  downloadCount: number;
  permissions: StudyMaterial["permissions"];
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

/** The API returns file links relative to AcademicService ("api/study-materials/files/…"). */
const absolute = (url: string | null) => (url ? new URL(url, ACADEMIC_API_BASE_URL).toString() : undefined);

function mapMaterial(m: ApiStudyMaterial): StudyMaterial {
  return {
    id: m.id,
    tenantId: m.tenantId,
    isGlobal: m.isGlobal,
    title: m.title,
    description: m.description ?? undefined,
    category: fromApiEnum<StudyMaterialCategory>(m.category),
    academicYearId: m.academicYearId ?? undefined,
    classId: m.classId ?? undefined,
    sectionId: m.sectionId ?? undefined,
    subjectId: m.subjectId ?? undefined,
    className: m.className ?? undefined,
    sectionName: m.sectionName ?? undefined,
    subjectName: m.subjectName ?? undefined,
    chapter: m.chapter ?? undefined,
    audience: fromApiEnum<StudyMaterialAudience>(m.audience),
    status: fromApiEnum<StudyMaterialStatus>(m.status),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt ?? undefined,
    publishedAt: m.publishedAt ?? undefined,
    availableFrom: m.availableFrom ?? undefined,
    availableUntil: m.availableUntil ?? undefined,
    isScheduled: m.isScheduled,
    isPinned: m.isPinned,
    uploadedByUserId: m.uploadedByUserId,
    uploadedByName: m.uploadedByName,
    uploadedByRole: m.uploadedByRole,
    fileName: m.fileName ?? undefined,
    contentType: m.contentType ?? undefined,
    sizeBytes: m.sizeBytes ?? undefined,
    isPreviewable: m.isPreviewable,
    viewUrl: absolute(m.viewUrl),
    downloadUrl: absolute(m.downloadUrl),
    linkUrl: m.linkUrl ?? undefined,
    viewCount: m.viewCount,
    downloadCount: m.downloadCount,
    permissions: m.permissions,
  };
}

export async function listStudyMaterials(filters: StudyMaterialFilters): Promise<StudyMaterial[]> {
  const rows = await unwrap(
    academicHttpClient.get<ApiStudyMaterial[]>("/api/study-materials", {
      params: {
        view: filters.view,
        status: filters.status ? toApiEnum(filters.status) : undefined,
        category: filters.category ? toApiEnum(filters.category) : undefined,
        classId: filters.classId || undefined,
        subjectId: filters.subjectId || undefined,
        scope: filters.scope,
        search: filters.search?.trim() || undefined,
      },
    }),
  );
  return rows.map(mapMaterial);
}

export async function getMyStudyMaterialCounts(): Promise<StudyMaterialCounts> {
  return unwrap(academicHttpClient.get<StudyMaterialCounts>("/api/study-materials/mine/counts"));
}

function toForm(values: StudyMaterialFormValues, publish: boolean, file?: File | null, removeFile?: boolean): FormData {
  const form = new FormData();
  const put = (key: string, value: string | undefined | null) => {
    if (value !== undefined && value !== null && value !== "") form.append(key, value);
  };
  put("title", values.title);
  put("description", values.description);
  put("category", toApiEnum(values.category));
  put("academicYearId", values.academicYearId);
  put("classId", values.classId);
  put("sectionId", values.sectionId);
  put("subjectId", values.subjectId);
  put("gradeLabel", values.gradeLabel);
  put("subjectLabel", values.subjectLabel);
  put("chapter", values.chapter);
  put("audience", toApiEnum(values.audience));
  put("availableFrom", values.availableFrom);
  put("availableUntil", values.availableUntil);
  put("linkUrl", values.linkUrl);
  form.append("publish", String(publish));
  if (removeFile) form.append("removeFile", "true");
  if (file) form.append("file", file, file.name);
  return form;
}

const multipart = (onProgress?: (fraction: number) => void) => ({
  headers: { "Content-Type": "multipart/form-data" },
  onUploadProgress: (e: { loaded: number; total?: number }) => onProgress?.(e.total ? e.loaded / e.total : 0),
});

export async function createStudyMaterial(
  values: StudyMaterialFormValues,
  options: { publish: boolean; file?: File | null; onProgress?: (fraction: number) => void },
): Promise<StudyMaterial> {
  return mapMaterial(
    await unwrap(academicHttpClient.post<ApiStudyMaterial>("/api/study-materials", toForm(values, options.publish, options.file), multipart(options.onProgress))),
  );
}

export async function updateStudyMaterial(
  id: string,
  values: StudyMaterialFormValues,
  options: { publish: boolean; file?: File | null; removeFile?: boolean; onProgress?: (fraction: number) => void },
): Promise<StudyMaterial> {
  return mapMaterial(
    await unwrap(
      academicHttpClient.put<ApiStudyMaterial>(
        `/api/study-materials/${id}`,
        toForm(values, options.publish, options.file, options.removeFile),
        multipart(options.onProgress),
      ),
    ),
  );
}

export async function transitionStudyMaterial(id: string, action: "publish" | "archive" | "restore"): Promise<StudyMaterial> {
  return mapMaterial(await unwrap(academicHttpClient.post<ApiStudyMaterial>(`/api/study-materials/${id}/${action}`)));
}

export async function pinStudyMaterial(id: string, pinned: boolean): Promise<StudyMaterial> {
  return mapMaterial(await unwrap(academicHttpClient.put<ApiStudyMaterial>(`/api/study-materials/${id}/pin`, { pinned })));
}

export async function deleteStudyMaterial(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/study-materials/${id}`));
}
