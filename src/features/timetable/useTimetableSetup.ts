import { useQuery } from "@tanstack/react-query";
import { getTimetableSetup } from "./api";
import { DAY_DEFINITIONS, DEFAULT_WORKING_DAYS, PERIOD_DEFINITIONS } from "./constants";
import { workingDayColumns } from "./setup";
import type { TimetableSetup } from "./types";

export const TIMETABLE_SETUP_KEY = ["timetable", "setup"] as const;

const BUILT_IN: TimetableSetup = { periods: PERIOD_DEFINITIONS, workingDays: DEFAULT_WORKING_DAYS, isCustom: false };

/**
 * The branch's periods and school days. While loading (or if the server can't be reached) the built-in schedule is
 * shown, so the timetable grid never renders empty.
 */
export function useTimetableSetup() {
  const query = useQuery({ queryKey: TIMETABLE_SETUP_KEY, queryFn: getTimetableSetup, staleTime: 5 * 60_000 });
  const setup = query.data ?? BUILT_IN;
  return {
    ...query,
    setup,
    periods: setup.periods,
    /** Break rows are shown but never given lessons. */
    teachingPeriods: setup.periods.filter((p) => !p.isBreak),
    /** The school days as grid columns. */
    days: query.data ? workingDayColumns(setup.workingDays) : DAY_DEFINITIONS,
  };
}
