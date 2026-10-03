export type CommunicationKind = "Notice" | "ParentMessage" | "StudentMessage" | "Announcement" | "Circular";
export type NoticeTone = "Neutral" | "Friendly" | "Formal";
export type RewriteAction = "ImproveGrammar" | "MoreFormal" | "Friendlier" | "MoreConcise" | "Translate";

export interface DraftNoticeRequest {
  kind: CommunicationKind;
  instruction: string;
  audience?: string;
  tone: NoticeTone;
  language?: string;
  schoolName?: string;
}

/** Four forms of one notice. Placeholders like [date] mark details the instruction did not give. */
export interface NoticeDraft {
  title: string;
  content: string;
  shortVersion: string;
  formalVersion: string;
}

export interface RewriteRequest {
  text: string;
  action: RewriteAction;
  language?: string;
}
