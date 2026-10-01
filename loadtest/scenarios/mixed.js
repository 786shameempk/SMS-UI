// Main test: admins, teachers and parents using the app at the same time.
//   k6 run -e PROFILE=load loadtest/scenarios/mixed.js
import { stages, THRESHOLDS, PROFILE } from "../lib/config.js";
export { adminJourney, teacherJourney, parentJourney } from "../lib/journeys.js";

// Share of the virtual users per role. A school has far more parents than staff.
const MIX = { admin: 0.1, teacher: 0.3, parent: 0.6 };

function scenario(exec, share) {
  return { executor: "ramping-vus", exec, startVUs: 0, stages: stages(share), gracefulRampDown: "30s" };
}

export const options = {
  scenarios: {
    admins: scenario("adminJourney", MIX.admin),
    teachers: scenario("teacherJourney", MIX.teacher),
    parents: scenario("parentJourney", MIX.parent),
  },
  thresholds: THRESHOLDS,
  tags: { profile: PROFILE },
};
