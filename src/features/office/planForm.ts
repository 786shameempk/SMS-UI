import type { PlanVersion, PlanVersionRequest } from "./types";

export const emptyVersion = (): PlanVersionRequest => ({
  billingCycle: "Annual", cycleMonths: null, currencyCode: "INR", basePrice: 0, taxRatePercent: 18, includedStudents: 500, extraStudentPrice: 0, maxBranches: 1,
  extraBranchPrice: 0, maxUsers: 50, storageGb: 50, modules: [], aiFeatures: [], mobileApps: [], features: [], trialDays: 0, graceDays: 7, autoRenew: true,
  renewalRules: null, upgradePolicy: null, downgradePolicy: null, changeNotes: null,
});

export const versionToRequest = (v: PlanVersion): PlanVersionRequest => ({
  billingCycle: v.billingCycle, cycleMonths: v.billingCycle === "Custom" ? v.cycleMonths : null, currencyCode: v.currencyCode, basePrice: v.basePrice,
  taxRatePercent: v.taxRatePercent, includedStudents: v.includedStudents, extraStudentPrice: v.extraStudentPrice, maxBranches: v.maxBranches, extraBranchPrice: v.extraBranchPrice,
  maxUsers: v.maxUsers, storageGb: v.storageGb, modules: v.modules, aiFeatures: v.aiFeatures, mobileApps: v.mobileApps, features: v.features, trialDays: v.trialDays,
  graceDays: v.graceDays, autoRenew: v.autoRenew, renewalRules: v.renewalRules, upgradePolicy: v.upgradePolicy, downgradePolicy: v.downgradePolicy, changeNotes: v.changeNotes,
});
