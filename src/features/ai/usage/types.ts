export interface UsageBucket {
  key: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface UsageLimits {
  dailyRequestsPerUser: number;
  requestsPerMinutePerUser: number;
  monthlyTokenLimitPerSchool: number;
  /** This calendar month (UTC), the caller's own school. */
  monthTokensUsed: number;
}

export interface UsageSummary {
  from: string;
  to: string;
  requests: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  averageDurationMs: number;
  byFeature: UsageBucket[];
  byModel: UsageBucket[];
  byProvider: UsageBucket[];
  byDay: UsageBucket[];
  /** Keyed by AuthService user id; names are looked up in the school's user list. */
  byUser: UsageBucket[];
  bySchool: UsageBucket[];
  limits: UsageLimits | null;
}
