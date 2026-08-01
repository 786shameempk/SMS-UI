import type { UserRole } from "@/types/auth";
import { mockDelay } from "@/utils/mockDelay";
import { buildDashboardData } from "./mock";
import type { DashboardData } from "./types";

export async function fetchDashboardData(role: UserRole): Promise<DashboardData> {
  return mockDelay(buildDashboardData(role), 500);
}
