import { getAttendanceRegister, getSectionRoster } from "../api";
import { writeCached } from "./cache";

const MAX_CLASSES = 40;

/**
 * Saves the rosters and today's registers of the classes this person can take attendance for, so they can be opened
 * without a connection later (the screen also saves each class as it is opened). Returns how many classes were saved.
 */
export async function prepareForOffline(sectionIds: string[], date: string): Promise<number> {
  let saved = 0;
  for (const sectionId of sectionIds.slice(0, MAX_CLASSES)) {
    const [roster, register] = await Promise.all([getSectionRoster(sectionId), getAttendanceRegister(sectionId, date)]);
    await Promise.all([writeCached(`roster:${sectionId}`, roster), writeCached(`register:${sectionId}:${date}`, register)]);
    saved += 1;
  }
  return saved;
}
