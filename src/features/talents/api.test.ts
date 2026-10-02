import * as talents from "./api";
import { getSchoolProfile } from "@/features/settings/api";
import { engagementHttpClient } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { signIn, stubClient } from "@/test/utils";

vi.mock("@/features/settings/api", () => ({ getSchoolProfile: vi.fn(async () => ({ name: "Green Valley School" })) }));

const media = { id: "md1", type: "Image", url: "api/talents/media/md1?exp=1&sig=x", contentType: "image/png", fileName: "a.png", sizeBytes: 10, durationSeconds: null, caption: null, sortOrder: 0 };
const card = (overrides: Record<string, unknown> = {}) => ({
  id: "tl1", tenantId: "t", title: "Monsoon", description: null, category: "SchoolActivity", tags: ["rain"],
  creator: { userId: "u1", name: "Asha", type: "Student", avatarUrl: null, subtitle: null }, schoolName: "GVS", visibility: "SchoolOnly", status: "NeedsChanges",
  isFeatured: false, isHidden: false, reviewerFeedback: null, createdAt: "", submittedAt: null, publishedAt: null, viewCount: 3, reactionCount: 1,
  reactions: [{ type: "Love", count: 1 }], myReaction: "Appreciate", cover: media, mediaCount: 1, mediaTypes: ["Image", "Audio"], ...overrides,
});
const detail = (overrides: Record<string, unknown> = {}) => ({
  ...card(), sectionId: null, media: [media],
  reviews: [{ id: "rv1", action: "ChangesRequested", actorUserId: "p1", actorName: "Principal", actorRole: null, comment: null, at: "" }],
  permissions: { isOwner: true }, openReportCount: 0, hasReportedByMe: false, ...overrides,
});

describe("talents api", () => {
  beforeEach(() => signIn("student", { name: "Asha Nair", avatarUrl: "https://cdn/a.png" }));

  it("maps PascalCase enums to snake_case and makes media links absolute", async () => {
    stubClient(engagementHttpClient, { "GET /api/talents/tl1": detail() });

    const t = await talents.getTalent("tl1");

    expect(t).toMatchObject({
      category: "school_activity", visibility: "school_only", status: "needs_changes", myReaction: "appreciate",
      reactions: { love: 1 }, mediaTypes: ["image", "audio"], description: undefined, sectionId: undefined,
      creator: { type: "student", avatarUrl: undefined }, reviews: [{ action: "changes_requested", actorRole: undefined }],
    });
    expect(t.cover?.url).toMatch(/^https?:.*\/api\/talents\/media\/md1\?exp=1&sig=x$/);
    expect(t.media[0].durationSeconds).toBeUndefined();
  });

  it("discover rails, search filters and paging", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET /api/talents/discover": {
        featured: [card()], trending: [], recent: [card({ id: "tl2", myReaction: null, cover: null })], mostViewed: [], mostAppreciated: [], mySchool: [], teacherTalents: [],
        categories: [{ category: "Art", count: 4 }], totalShowcases: 4, totalCreators: 2, totalSchools: 1,
      },
      "GET /api/talents": { items: [card()], total: 1, page: 2, pageSize: 12 },
    });

    const discover = await talents.getDiscover();
    const page = await talents.searchTalents({ search: "rain", category: "school_activity", creatorType: "student", tenantId: "t", visibility: "public", mySchool: true, featured: true, sort: "most_viewed", page: 2, pageSize: 12 } as never);
    await talents.searchTalents({} as never);

    expect(discover.categories).toEqual([{ category: "art", count: 4 }]);
    expect(discover.recent[0]).toMatchObject({ myReaction: undefined, cover: undefined });
    expect(page.items).toHaveLength(1);
    expect((calls[1].config as { params: unknown }).params).toEqual({
      search: "rain", category: "SchoolActivity", creatorType: "Student", tenantId: "t", visibility: "Public", mySchool: true, featured: true, sort: "MostViewed", page: 2, pageSize: 12,
    });
    expect((calls[2].config as { params: unknown }).params).toEqual({ sort: "Recent", page: 1, pageSize: 24 });
  });

  it("creator profile, school showcase and my talents", async () => {
    stubClient(engagementHttpClient, {
      "GET /api/talents/creators/u1": { creator: card().creator, tenantId: "t", schoolName: "GVS", isMe: true, categories: ["Music"], stats: {}, highlights: [card()], showcases: [] },
      "GET /api/talents/schools/tenant%20a": {
        tenantId: "tenant a", schoolName: "GVS", tagline: null, isMySchool: true, stats: {}, categories: [], featured: [], studentTalents: [card()], teacherTalents: [], recent: [], trending: [], achievements: [],
      },
      "GET /api/talents/mine": { items: [card()], stats: { total: 1, reactions: [{ type: "Like", count: 2 }] } },
    });

    expect((await talents.getCreatorProfile("u1"))).toMatchObject({ categories: ["music"], creator: { type: "student" } });
    expect((await talents.getSchoolShowcase("tenant a"))).toMatchObject({ tagline: undefined, studentTalents: [{ id: "tl1" }] });
    expect((await talents.getMyTalents()).stats).toMatchObject({ total: 1, reactions: { like: 2 } });
  });

  it("creates under the signed-in user and the school's display name, falling back to the tenant id", async () => {
    const calls = stubClient(engagementHttpClient, { "POST /api/talents": detail() });
    const values = { title: "Monsoon", description: "", category: "writing", tags: ["poetry"], visibility: "public" };

    await talents.createTalent(values as never, "Class 5 · A");
    vi.mocked(getSchoolProfile).mockRejectedValueOnce(new Error("down"));
    await talents.createTalent(values as never);

    expect(calls[0].body).toEqual({
      title: "Monsoon", description: null, category: "Writing", tags: ["poetry"], visibility: "Public", creatorName: "Asha Nair",
      creatorAvatarUrl: "https://cdn/a.png", creatorSubtitle: "Class 5 · A", sectionId: null, schoolName: "Green Valley School",
    });
    expect(calls[1].body).toMatchObject({ creatorSubtitle: null, schoolName: useAuthStore.getState().activeTenantId });
  });

  it("updates, uploads with progress, and the workflow actions carry the actor's name", async () => {
    const calls = stubClient(engagementHttpClient, {
      "PUT /api/talents/tl1": detail(),
      "POST /api/talents/tl1/media": (_u: string, _b: unknown, config: { onUploadProgress: (e: { loaded: number; total?: number }) => void }) => {
        config.onUploadProgress({ loaded: 5, total: 10 });
        config.onUploadProgress({ loaded: 5 });
        return [media];
      },
      "DELETE /api/talents/tl1/media/md1": null,
      "DELETE /api/talents/tl1": null,
      "POST /api/talents/tl1/(submit|archive|restore)": detail(),
      "POST /api/talents/tl1/review": detail({ status: "Approved" }),
      "POST /api/talents/tl1/feature": detail({ isFeatured: true }),
    });
    const progress: number[] = [];

    await talents.updateTalent("tl1", { title: "M", description: "", category: "art", tags: [], visibility: "school_only" } as never, { mediaOrder: ["md1"] });
    const uploaded = await talents.uploadTalentMedia("tl1", [{ file: new File(["x"], "a.png"), durationSeconds: 12 }, { file: new File(["y"], "b.png") }], (f) => progress.push(f));
    await talents.deleteTalentMedia("tl1", "md1");
    await talents.deleteTalent("tl1");
    await talents.submitTalent("tl1");
    await talents.archiveTalent("tl1");
    await talents.restoreTalent("tl1");
    expect((await talents.reviewTalent("tl1", "request_changes" as never, "Add a photo", "school_only")).status).toBe("approved");
    await talents.reviewTalent("tl1", "approve" as never);
    expect((await talents.featureTalent("tl1", true)).isFeatured).toBe(true);

    expect(calls[0].body).toMatchObject({ category: "Art", visibility: "SchoolOnly", mediaOrder: ["md1"], mediaCaptions: null });
    expect(uploaded).toHaveLength(1);
    expect(progress).toEqual([0.5, 0]);
    expect((calls[1].body as FormData).getAll("durations")).toEqual(["12", ""]);
    expect(calls.filter((c) => /submit|archive|restore/.test(c.url)).map((c) => c.body)).toEqual(Array(3).fill({ actorName: "Asha Nair" }));
    expect(calls.find((c) => c.url.endsWith("/review"))?.body).toEqual({ decision: "RequestChanges", comment: "Add a photo", visibility: "SchoolOnly", actorName: "Asha Nair" });
    expect(calls.filter((c) => c.url.endsWith("/review"))[1].body).toEqual({ decision: "Approve", comment: null, visibility: null, actorName: "Asha Nair" });
  });

  it("reactions, views, reports and the review queue", async () => {
    const calls = stubClient(engagementHttpClient, {
      "PUT /api/talents/tl1/reaction": card({ myReaction: "Congrats" }),
      "DELETE /api/talents/tl1/reaction": card({ myReaction: null }),
      "POST /api/talents/tl1/views": { counted: true, viewCount: 4 },
      "POST /api/talents/tl1/reports": null,
      "GET /api/talents/review-queue": { items: [card()], pending: 1 },
      "GET /api/talents/reports": [{ id: "rp1", reason: "Inappropriate", status: "ContentHidden", details: null, resolvedByName: null, resolvedAt: null, resolutionNote: null }],
      "POST /api/talents/reports/rp1/resolve": { id: "rp1", reason: "Spam", status: "Dismissed", details: "x", resolvedByName: "P", resolvedAt: "t", resolutionNote: "ok" },
    });

    expect((await talents.reactToTalent("tl1", "congrats" as never)).myReaction).toBe("congrats");
    expect((await talents.reactToTalent("tl1", null)).myReaction).toBeUndefined();
    expect(await talents.recordTalentView("tl1")).toEqual({ counted: true, viewCount: 4 });
    await talents.reportTalent("tl1", "other" as never);
    expect((await talents.getReviewQueue({ status: "pending_approval", creatorType: "teacher", category: "art" } as never)).items).toHaveLength(1);
    await talents.getReviewQueue();
    expect((await talents.listTalentReports("open" as never))[0]).toMatchObject({ reason: "inappropriate", status: "content_hidden", details: undefined });
    await talents.listTalentReports();
    expect((await talents.resolveTalentReport("rp1", "dismiss"))).toMatchObject({ status: "dismissed", resolutionNote: "ok" });

    expect(calls[0].body).toEqual({ type: "Congrats" });
    expect(calls[3].body).toEqual({ reason: "Other", details: null });
    expect((calls[4].config as { params: unknown }).params).toEqual({ status: "PendingApproval", creatorType: "Teacher", category: "Art" });
    expect((calls[6].config as { params: unknown }).params).toEqual({ status: "Open" });
    expect(calls.at(-1)?.body).toEqual({ resolution: "Dismiss", note: null, actorName: "Asha Nair" });
  });

  it("school settings", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET /api/talents/settings": { tenantId: "t", studentReviewScope: "TeachersAndAdmins", displayName: null, tagline: null, allowStudentPublic: true, allowTeacherPublic: true, autoHideReportThreshold: 3 },
      "PUT /api/talents/settings": { tenantId: "t", studentReviewScope: "AdminsOnly", displayName: "GVS", tagline: "Shine", allowStudentPublic: false, allowTeacherPublic: true, autoHideReportThreshold: 5 },
    });

    expect(await talents.getTalentSettings()).toMatchObject({ studentReviewScope: "teachers_and_admins", displayName: undefined });
    const updated = await talents.updateTalentSettings({ studentReviewScope: "admins_only", displayName: "GVS", tagline: "Shine", allowStudentPublic: false, allowTeacherPublic: true, autoHideReportThreshold: 5 } as never);

    expect(updated).toMatchObject({ studentReviewScope: "admins_only", displayName: "GVS" });
    expect(calls[1].body).toMatchObject({ studentReviewScope: "AdminsOnly" });
  });

  it("falls back to the email, then 'Unknown', for the actor name", async () => {
    const calls = stubClient(engagementHttpClient, { "POST /api/talents/tl1/submit": detail() });

    signIn("student", { name: "" });
    await talents.submitTalent("tl1");
    useAuthStore.setState({ user: null });
    await talents.submitTalent("tl1");

    expect(calls.map((c) => c.body)).toEqual([{ actorName: "user@school.test" }, { actorName: "Unknown" }]);
  });
});
