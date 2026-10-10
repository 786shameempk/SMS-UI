import { answerHelpQuestion, type HelpReply } from "./assistant";
import { helpCatalog } from "./catalog";
import type { Viewer } from "./access";

/**
 * The assistant's documentation lookup against the real catalogue. Kept in its own module so the (large) catalogue is only
 * downloaded when someone first asks a question, not with the app shell.
 */
export function askHelp(question: string, viewer: Viewer): HelpReply | null {
  return answerHelpQuestion(question, viewer, helpCatalog);
}
