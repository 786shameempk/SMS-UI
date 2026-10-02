// The 8 AM rush: many people signing in at once. Login hashes the password, so it is CPU-heavy
// and usually the first thing to slow down.
//   k6 run -e PROFILE=stress loadtest/scenarios/login-rush.js
import { sleep } from "k6";
import { stages, THRESHOLDS, PROFILE } from "../lib/config.js";
import { login, pickUser } from "../lib/api.js";

const ROLES = ["admin", "teacher", "parent"];

export const options = {
  scenarios: {
    logins: { executor: "ramping-vus", startVUs: 0, stages: stages(), gracefulRampDown: "10s" },
  },
  thresholds: THRESHOLDS,
  tags: { profile: PROFILE },
};

export default function () {
  login(pickUser(ROLES[__VU % ROLES.length]));
  sleep(1);
}
