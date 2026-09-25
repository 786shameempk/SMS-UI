import { ENGAGEMENT_API_BASE_URL, engagementHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { getSchoolProfile } from "@/features/settings/api";
import { useAuthStore } from "@/store/authStore";
import type {
  CreatorProfile,
  MyTalents,
  ReactionCounts,
  ReviewQueue,
  SchoolShowcase,
  TalentCard,
  TalentCategory,
  TalentCreatorType,
  TalentDecision,
  TalentDetail,
  TalentDiscover,
  TalentFeedFilters,
  TalentFormValues,
  TalentMedia,
  TalentPage,
  TalentReactionType,
  TalentReport,
  TalentReportReason,
  TalentReportStatus,
  TalentSchoolSettings,
  TalentStatus,
  TalentVisibility,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// EngagementService's enums serialize as PascalCase ("PendingApproval"); the UI uses snake_case
// ("pending_approval"). Every talent enum follows that one rule, so it's done generically.

const toApi = (value: string) => value.replace(/(^|_)([a-z])/g, (_, __, c: string) => c.toUpperCase());
const fromApi = <T extends string>(value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase() as T;

// ── API response shapes (EngagementService DTOs) ────────────────────────────

interface ApiMedia {
  id: string;
  type: string;
  url: string;
  contentType: string;
  fileName: string;
  sizeBytes: number;
  durationSeconds: number | null;
  caption: string | null;
  sortOrder: number;
}

interface ApiCard {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  creator: { userId: string; name: string; type: string; avatarUrl: string | null; subtitle: string | null };
  schoolName: string;
  visibility: string;
  status: string;
  isFeatured: boolean;
  isHidden: boolean;
  reviewerFeedback: string | null;
  createdAt: string;
  submittedAt: string | null;
  publishedAt: string | null;
  viewCount: number;
  reactionCount: number;
  reactions: Array<{ type: string; count: number }>;
  myReaction: string | null;
  cover: ApiMedia | null;
  mediaCount: number;
  mediaTypes: string[];
}

interface ApiDetail extends ApiCard {
  sectionId: string | null;
  media: ApiMedia[];
  reviews: Array<{ id: string; action: string; actorUserId: string; actorName: string; actorRole: string | null; comment: string | null; at: string }>;
  permissions: TalentDetail["permissions"];
  openReportCount: number;
  hasReportedByMe: boolean;
}

interface ApiCategoryCount {
  category: string;
  count: number;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

const absolute = (relative: string) => new URL(relative, ENGAGEMENT_API_BASE_URL).toString();

function mapMedia(m: ApiMedia): TalentMedia {
  return {
    id: m.id,
    type: fromApi(m.type),
    url: absolute(m.url),
    contentType: m.contentType,
    fileName: m.fileName,
    sizeBytes: m.sizeBytes,
    durationSeconds: m.durationSeconds ?? undefined,
    caption: m.caption ?? undefined,
    sortOrder: m.sortOrder,
  };
}

function mapReactions(rows: Array<{ type: string; count: number }>): ReactionCounts {
  return Object.fromEntries(rows.map((r) => [fromApi<TalentReactionType>(r.type), r.count]));
}

function mapCard(c: ApiCard): TalentCard {
  return {
    id: c.id,
    tenantId: c.tenantId,
    title: c.title,
    description: c.description ?? undefined,
    category: fromApi(c.category),
    tags: c.tags,
    creator: {
      userId: c.creator.userId,
      name: c.creator.name,
      type: fromApi(c.creator.type),
      avatarUrl: c.creator.avatarUrl ?? undefined,
      subtitle: c.creator.subtitle ?? undefined,
    },
    schoolName: c.schoolName,
    visibility: fromApi(c.visibility),
    status: fromApi(c.status),
    isFeatured: c.isFeatured,
    isHidden: c.isHidden,
    reviewerFeedback: c.reviewerFeedback ?? undefined,
    createdAt: c.createdAt,
    submittedAt: c.submittedAt ?? undefined,
    publishedAt: c.publishedAt ?? undefined,
    viewCount: c.viewCount,
    reactionCount: c.reactionCount,
    reactions: mapReactions(c.reactions),
    myReaction: c.myReaction ? fromApi(c.myReaction) : undefined,
    cover: c.cover ? mapMedia(c.cover) : undefined,
    mediaCount: c.mediaCount,
    mediaTypes: c.mediaTypes.map((t) => fromApi(t)),
  };
}

function mapDetail(d: ApiDetail): TalentDetail {
  return {
    ...mapCard(d),
    sectionId: d.sectionId ?? undefined,
    media: d.media.map(mapMedia),
    reviews: d.reviews.map((r) => ({
      id: r.id,
      action: fromApi(r.action),
      actorUserId: r.actorUserId,
      actorName: r.actorName,
      actorRole: r.actorRole ?? undefined,
      comment: r.comment ?? undefined,
      at: r.at,
    })),
    permissions: d.permissions,
    openReportCount: d.openReportCount,
    hasReportedByMe: d.hasReportedByMe,
  };
}

const mapCards = (rows: ApiCard[]) => rows.map(mapCard);
const mapCategories = (rows: ApiCategoryCount[]) => rows.map((c) => ({ category: fromApi<TalentCategory>(c.category), count: c.count }));

/** The signed-in user's display name - the JWT carries only ids, so history/snapshots need it sent. */
function actorName(): string {
  const user = useAuthStore.getState().user;
  return user?.name || user?.email || "Unknown";
}

// ── Discovery ───────────────────────────────────────────────────────────────

export async function getDiscover(): Promise<TalentDiscover> {
  const d = await unwrap(engagementHttpClient.get<Record<string, unknown> & { categories: ApiCategoryCount[] }>("/api/talents/discover"));
  const rail = (key: string) => mapCards(d[key] as ApiCard[]);
  return {
    featured: rail("featured"),
    trending: rail("trending"),
    recent: rail("recent"),
    mostViewed: rail("mostViewed"),
    mostAppreciated: rail("mostAppreciated"),
    mySchool: rail("mySchool"),
    teacherTalents: rail("teacherTalents"),
    categories: mapCategories(d.categories),
    totalShowcases: d.totalShowcases as number,
    totalCreators: d.totalCreators as number,
    totalSchools: d.totalSchools as number,
  };
}

export async function searchTalents(filters: TalentFeedFilters): Promise<TalentPage> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.search) params.search = filters.search;
  if (filters.category) params.category = toApi(filters.category);
  if (filters.creatorType) params.creatorType = toApi(filters.creatorType);
  if (filters.tenantId) params.tenantId = filters.tenantId;
  if (filters.visibility) params.visibility = toApi(filters.visibility);
  if (filters.mySchool) params.mySchool = true;
  if (filters.featured) params.featured = true;
  params.sort = toApi(filters.sort ?? "recent");
  params.page = filters.page ?? 1;
  params.pageSize = filters.pageSize ?? 24;

  const page = await unwrap(engagementHttpClient.get<{ items: ApiCard[]; total: number; page: number; pageSize: number }>("/api/talents", { params }));
  return { ...page, items: mapCards(page.items) };
}

export async function getTalent(id: string): Promise<TalentDetail> {
  return mapDetail(await unwrap(engagementHttpClient.get<ApiDetail>(`/api/talents/${id}`)));
}

export async function getCreatorProfile(userId: string): Promise<CreatorProfile> {
  const p = await unwrap(
    engagementHttpClient.get<{
      creator: ApiCard["creator"];
      tenantId: string;
      schoolName: string;
      isMe: boolean;
      categories: string[];
      stats: CreatorProfile["stats"];
      highlights: ApiCard[];
      showcases: ApiCard[];
    }>(`/api/talents/creators/${userId}`),
  );
  return {
    creator: {
      userId: p.creator.userId,
      name: p.creator.name,
      type: fromApi<TalentCreatorType>(p.creator.type),
      avatarUrl: p.creator.avatarUrl ?? undefined,
      subtitle: p.creator.subtitle ?? undefined,
    },
    tenantId: p.tenantId,
    schoolName: p.schoolName,
    isMe: p.isMe,
    categories: p.categories.map((c) => fromApi<TalentCategory>(c)),
    stats: p.stats,
    highlights: mapCards(p.highlights),
    showcases: mapCards(p.showcases),
  };
}

export async function getSchoolShowcase(tenantId: string): Promise<SchoolShowcase> {
  const s = await unwrap(
    engagementHttpClient.get<
      Omit<SchoolShowcase, "tagline" | "categories" | "featured" | "studentTalents" | "teacherTalents" | "recent" | "trending" | "achievements"> & {
        tagline: string | null;
        categories: ApiCategoryCount[];
        featured: ApiCard[];
        studentTalents: ApiCard[];
        teacherTalents: ApiCard[];
        recent: ApiCard[];
        trending: ApiCard[];
        achievements: ApiCard[];
      }
    >(`/api/talents/schools/${encodeURIComponent(tenantId)}`),
  );
  return {
    tenantId: s.tenantId,
    schoolName: s.schoolName,
    tagline: s.tagline ?? undefined,
    isMySchool: s.isMySchool,
    stats: s.stats,
    featured: mapCards(s.featured),
    studentTalents: mapCards(s.studentTalents),
    teacherTalents: mapCards(s.teacherTalents),
    recent: mapCards(s.recent),
    trending: mapCards(s.trending),
    achievements: mapCards(s.achievements),
    categories: mapCategories(s.categories),
  };
}

// ── My Talents ──────────────────────────────────────────────────────────────

export async function getMyTalents(): Promise<MyTalents> {
  const m = await unwrap(
    engagementHttpClient.get<{ items: ApiCard[]; stats: Omit<MyTalents["stats"], "reactions"> & { reactions: Array<{ type: string; count: number }> } }>(
      "/api/talents/mine",
    ),
  );
  return { items: mapCards(m.items), stats: { ...m.stats, reactions: mapReactions(m.stats.reactions) } };
}

/** The school name is a display snapshot; prefer the school profile, fall back to the tenant id. */
async function currentSchoolName(): Promise<string> {
  try {
    const profile = await getSchoolProfile();
    if (profile.name) return profile.name;
  } catch {
    // Not every role may read the school profile - the tenant id is an acceptable fallback, and the
    // backend prefers the school's own configured Talent Showcase display name when one is set.
  }
  return useAuthStore.getState().activeTenantId;
}

export async function createTalent(values: TalentFormValues, creatorSubtitle?: string): Promise<TalentDetail> {
  const user = useAuthStore.getState().user;
  return mapDetail(
    await unwrap(
      engagementHttpClient.post<ApiDetail>("/api/talents", {
        title: values.title,
        description: values.description || null,
        category: toApi(values.category),
        tags: values.tags,
        visibility: toApi(values.visibility),
        creatorName: actorName(),
        creatorAvatarUrl: user?.avatarUrl ?? null,
        creatorSubtitle: creatorSubtitle || null,
        sectionId: null,
        schoolName: await currentSchoolName(),
      }),
    ),
  );
}

export async function updateTalent(
  id: string,
  values: TalentFormValues,
  extras: { mediaOrder?: string[]; mediaCaptions?: Record<string, string | null> } = {},
): Promise<TalentDetail> {
  return mapDetail(
    await unwrap(
      engagementHttpClient.put<ApiDetail>(`/api/talents/${id}`, {
        title: values.title,
        description: values.description || null,
        category: toApi(values.category),
        tags: values.tags,
        visibility: toApi(values.visibility),
        mediaOrder: extras.mediaOrder ?? null,
        mediaCaptions: extras.mediaCaptions ?? null,
      }),
    ),
  );
}

export async function uploadTalentMedia(
  id: string,
  files: Array<{ file: File; durationSeconds?: number }>,
  onProgress?: (fraction: number) => void,
): Promise<TalentMedia[]> {
  const form = new FormData();
  for (const { file, durationSeconds } of files) {
    form.append("files", file, file.name);
    form.append("durations", durationSeconds ? String(durationSeconds) : "");
  }
  const rows = await unwrap(
    engagementHttpClient.post<ApiMedia[]>(`/api/talents/${id}/media`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => onProgress?.(e.total ? e.loaded / e.total : 0),
    }),
  );
  return rows.map(mapMedia);
}

export async function deleteTalentMedia(id: string, mediaId: string): Promise<void> {
  await unwrap(engagementHttpClient.delete(`/api/talents/${id}/media/${mediaId}`));
}

export async function deleteTalent(id: string): Promise<void> {
  await unwrap(engagementHttpClient.delete(`/api/talents/${id}`));
}

const workflow = async (id: string, action: "submit" | "archive" | "restore") =>
  mapDetail(await unwrap(engagementHttpClient.post<ApiDetail>(`/api/talents/${id}/${action}`, { actorName: actorName() })));

export const submitTalent = (id: string) => workflow(id, "submit");
export const archiveTalent = (id: string) => workflow(id, "archive");
export const restoreTalent = (id: string) => workflow(id, "restore");

// ── Approval ────────────────────────────────────────────────────────────────

export async function getReviewQueue(filters: { status?: TalentStatus; creatorType?: TalentCreatorType; category?: TalentCategory } = {}): Promise<ReviewQueue> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = toApi(filters.status);
  if (filters.creatorType) params.creatorType = toApi(filters.creatorType);
  if (filters.category) params.category = toApi(filters.category);
  const q = await unwrap(engagementHttpClient.get<Omit<ReviewQueue, "items"> & { items: ApiCard[] }>("/api/talents/review-queue", { params }));
  return { ...q, items: mapCards(q.items) };
}

export async function reviewTalent(id: string, decision: TalentDecision, comment?: string, visibility?: TalentVisibility): Promise<TalentDetail> {
  return mapDetail(
    await unwrap(
      engagementHttpClient.post<ApiDetail>(`/api/talents/${id}/review`, {
        decision: toApi(decision),
        comment: comment || null,
        visibility: visibility ? toApi(visibility) : null,
        actorName: actorName(),
      }),
    ),
  );
}

export async function featureTalent(id: string, featured: boolean): Promise<TalentDetail> {
  return mapDetail(await unwrap(engagementHttpClient.post<ApiDetail>(`/api/talents/${id}/feature`, { featured, actorName: actorName() })));
}

// ── Appreciation ────────────────────────────────────────────────────────────

export async function reactToTalent(id: string, type: TalentReactionType | null): Promise<TalentCard> {
  const card = type
    ? await unwrap(engagementHttpClient.put<ApiCard>(`/api/talents/${id}/reaction`, { type: toApi(type) }))
    : await unwrap(engagementHttpClient.delete<ApiCard>(`/api/talents/${id}/reaction`));
  return mapCard(card);
}

export async function recordTalentView(id: string): Promise<{ counted: boolean; viewCount: number }> {
  return unwrap(engagementHttpClient.post<{ counted: boolean; viewCount: number }>(`/api/talents/${id}/views`));
}

// ── Safety ──────────────────────────────────────────────────────────────────

export async function reportTalent(id: string, reason: TalentReportReason, details?: string): Promise<void> {
  await unwrap(engagementHttpClient.post(`/api/talents/${id}/reports`, { reason: toApi(reason), details: details || null }));
}

interface ApiReport extends Omit<TalentReport, "reason" | "status" | "details" | "resolvedByName" | "resolvedAt" | "resolutionNote"> {
  reason: string;
  status: string;
  details: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

const mapReport = (r: ApiReport): TalentReport => ({
  ...r,
  reason: fromApi(r.reason),
  status: fromApi(r.status),
  details: r.details ?? undefined,
  resolvedByName: r.resolvedByName ?? undefined,
  resolvedAt: r.resolvedAt ?? undefined,
  resolutionNote: r.resolutionNote ?? undefined,
});

export async function listTalentReports(status?: TalentReportStatus): Promise<TalentReport[]> {
  const rows = await unwrap(engagementHttpClient.get<ApiReport[]>("/api/talents/reports", { params: status ? { status: toApi(status) } : {} }));
  return rows.map(mapReport);
}

export async function resolveTalentReport(reportId: string, resolution: "dismiss" | "hide_content", note?: string): Promise<TalentReport> {
  return mapReport(
    await unwrap(
      engagementHttpClient.post<ApiReport>(`/api/talents/reports/${reportId}/resolve`, {
        resolution: toApi(resolution),
        note: note || null,
        actorName: actorName(),
      }),
    ),
  );
}

// ── School settings ─────────────────────────────────────────────────────────

interface ApiSettings extends Omit<TalentSchoolSettings, "studentReviewScope" | "displayName" | "tagline"> {
  studentReviewScope: string;
  displayName: string | null;
  tagline: string | null;
}

const mapSettings = (s: ApiSettings): TalentSchoolSettings => ({
  ...s,
  studentReviewScope: fromApi(s.studentReviewScope),
  displayName: s.displayName ?? undefined,
  tagline: s.tagline ?? undefined,
});

export async function getTalentSettings(): Promise<TalentSchoolSettings> {
  return mapSettings(await unwrap(engagementHttpClient.get<ApiSettings>("/api/talents/settings")));
}

export async function updateTalentSettings(values: Omit<TalentSchoolSettings, "tenantId">): Promise<TalentSchoolSettings> {
  return mapSettings(
    await unwrap(
      engagementHttpClient.put<ApiSettings>("/api/talents/settings", {
        ...values,
        displayName: values.displayName || null,
        tagline: values.tagline || null,
        studentReviewScope: toApi(values.studentReviewScope),
      }),
    ),
  );
}
