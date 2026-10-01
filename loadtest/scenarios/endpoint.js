// Hammer one endpoint to isolate a slow one found by mixed.js.
//   k6 run -e PROFILE=load -e SERVICE=academic -e ENDPOINT=/api/students loadtest/scenarios/endpoint.js
import { sleep } from "k6";
import { stages, THRESHOLDS, PROFILE } from "../lib/config.js";
import { ensureSession, get } from "../lib/api.js";

const SERVICE = __ENV.SERVICE || "academic";
const ENDPOINT = __ENV.ENDPOINT || "/api/students";
const ROLE = __ENV.ROLE || "admin";

export const options = {
  scenarios: {
    endpoint: { executor: "ramping-vus", startVUs: 0, stages: stages(), gracefulRampDown: "10s" },
  },
  thresholds: THRESHOLDS,
  tags: { profile: PROFILE },
};

export default function () {
  ensureSession(ROLE);
  get(SERVICE, ENDPOINT);
  sleep(Number(__ENV.SLEEP ?? 0.5));
}
