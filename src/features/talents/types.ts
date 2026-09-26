export type TalentCategory =
  | "art"
  | "music"
  | "dance"
  | "voice"
  | "photography"
  | "writing"
  | "sports"
  | "science"
  | "technology"
  | "crafts"
  | "academic"
  | "school_activity"
  | "other";

export type TalentVisibility = "school_only" | "public";

export type TalentStatus = "draft" | "pending_approval" | "approved" | "needs_changes" | "rejected" | "archived";

export type TalentCreatorType = "student" | "teacher" | "parent";

export type TalentMediaType = "image" | "video" | "audio";

export type TalentReactionType = "like" | "love" | "appreciate" | "amazing" | "congrats";

export type TalentReviewAction =
  | "submitted"
  | "resubmitted"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "archived"
  | "featured"
  | "unfeatured"
  | "hidden"
  | "restored";

export type TalentReportReason = "inappropriate" | "bullying" | "privacy" | "copyright" | "spam" | "other";

export type TalentReportStatus = "open" | "dismissed" | "content_hidden";

export type TalentStudentReviewScope = "teachers_and_admins" | "admins_only";

export type TalentSort = "recent" | "trending" | "most_viewed" | "most_appreciated";

export type TalentDecision = "approve" | "request_changes" | "reject";

export interface TalentCreator {
  userId: string;
  name: string;
  type: TalentCreatorType;
  avatarUrl?: string;
  subtitle?: string;
}

export interface TalentMedia {
  id: string;
  type: TalentMediaType;
  /** Absolute, signed, short-lived. */
  url: string;
  contentType: string;
  fileName: string;
  sizeBytes: number;
  durationSeconds?: number;
  caption?: string;
  sortOrder: number;
}

export type ReactionCounts = Partial<Record<TalentReactionType, number>>;

export interface TalentCard {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  category: TalentCategory;
  tags: string[];
  creator: TalentCreator;
  schoolName: string;
  visibility: TalentVisibility;
  status: TalentStatus;
  isFeatured: boolean;
  isHidden: boolean;
  reviewerFeedback?: string;
  createdAt: string;
  submittedAt?: string;
  publishedAt?: string;
  viewCount: number;
  reactionCount: number;
  reactions: ReactionCounts;
  myReaction?: TalentReactionType;
  cover?: TalentMedia;
  mediaCount: number;
  mediaTypes: TalentMediaType[];
}

export interface TalentReviewEntry {
  id: string;
  action: TalentReviewAction;
  actorUserId: string;
  actorName: string;
  actorRole?: string;
  comment?: string;
  at: string;
}

export interface TalentPermissions {
  isOwner: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canDelete: boolean;
  canReview: boolean;
  canFeature: boolean;
  canReact: boolean;
  canReport: boolean;
}

export interface TalentDetail extends TalentCard {
  sectionId?: string;
  media: TalentMedia[];
  reviews: TalentReviewEntry[];
  permissions: TalentPermissions;
  openReportCount: number;
  hasReportedByMe: boolean;
}

export interface TalentPage {
  items: TalentCard[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CategoryCount {
  category: TalentCategory;
  count: number;
}

export interface TalentDiscover {
  featured: TalentCard[];
  trending: TalentCard[];
  recent: TalentCard[];
  mostViewed: TalentCard[];
  mostAppreciated: TalentCard[];
  mySchool: TalentCard[];
  teacherTalents: TalentCard[];
  categories: CategoryCount[];
  totalShowcases: number;
  totalCreators: number;
  totalSchools: number;
}

export interface TalentStats {
  showcases: number;
  creators: number;
  views: number;
  reactions: number;
}

export interface SchoolShowcase {
  tenantId: string;
  schoolName: string;
  tagline?: string;
  isMySchool: boolean;
  stats: TalentStats;
  featured: TalentCard[];
  studentTalents: TalentCard[];
  teacherTalents: TalentCard[];
  recent: TalentCard[];
  trending: TalentCard[];
  achievements: TalentCard[];
  categories: CategoryCount[];
}

export interface CreatorProfile {
  creator: TalentCreator;
  tenantId: string;
  schoolName: string;
  isMe: boolean;
  categories: TalentCategory[];
  stats: TalentStats;
  highlights: TalentCard[];
  showcases: TalentCard[];
}

export interface MyTalentStats {
  total: number;
  drafts: number;
  pending: number;
  published: number;
  needsChanges: number;
  rejected: number;
  archived: number;
  schoolOnly: number;
  public: number;
  totalViews: number;
  totalReactions: number;
  reactions: ReactionCounts;
}

export interface MyTalents {
  items: TalentCard[];
  stats: MyTalentStats;
}

export interface ReviewQueue {
  items: TalentCard[];
  pending: number;
  studentPending: number;
  teacherPending: number;
  parentPending: number;
  reviewedThisWeek: number;
  openReports: number;
}

export interface TalentReport {
  id: string;
  showcaseId: string;
  showcaseTitle: string;
  creatorName: string;
  showcaseHidden: boolean;
  reason: TalentReportReason;
  details?: string;
  status: TalentReportStatus;
  fromAnotherSchool: boolean;
  createdAt: string;
  resolvedByName?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface TalentSchoolSettings {
  tenantId: string;
  displayName?: string;
  tagline?: string;
  studentReviewScope: TalentStudentReviewScope;
  allowStudentPublic: boolean;
  allowTeacherPublic: boolean;
  autoHideReportThreshold: number;
}

export interface TalentFeedFilters {
  search?: string;
  category?: TalentCategory;
  creatorType?: TalentCreatorType;
  tenantId?: string;
  visibility?: TalentVisibility;
  mySchool?: boolean;
  featured?: boolean;
  sort?: TalentSort;
  page?: number;
  pageSize?: number;
}

export interface TalentFormValues {
  title: string;
  description: string;
  category: TalentCategory;
  tags: string[];
  visibility: TalentVisibility;
}
