import type { Room } from "./types";

export const SEED_ROOMS: Room[] = [
  { id: "room-1", name: "Room 101", capacity: 40 },
  { id: "room-2", name: "Room 102", capacity: 40 },
  { id: "room-3", name: "Room 103", capacity: 38 },
  { id: "room-4", name: "Room 201", capacity: 36 },
  { id: "room-5", name: "Room 202", capacity: 36 },
  { id: "room-6", name: "Science Lab", capacity: 30 },
  { id: "room-7", name: "Computer Lab", capacity: 30 },
  { id: "room-8", name: "Activity Hall", capacity: 60 },
];

/** Sections that get a pre-filled weekly timetable on first load, so the page isn't empty. */
export const SEED_TIMETABLE_SECTION_IDS = ["sec-1-a", "sec-6-a", "sec-9-a"];
