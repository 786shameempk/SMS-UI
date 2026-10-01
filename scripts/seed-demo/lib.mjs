// Shared plumbing for the demo seeder and the load test: targets, sign-in, API calls, retries, names.
import readline from "node:readline";

/** Where each service lives. "local" = the SMS UI docker-compose ports; anything else = a deployed site behind the gateway. */
export function serviceUrls(target) {
  if (target === "local") {
    return {
      identity: "http://localhost:5118",
      academic: "http://localhost:5136",
      finance: "http://localhost:5137",
      campus: "http://localhost:5139",
      engagement: "http://localhost:5140",
      meetings: "http://localhost:5141",
    };
  }
  const base = target.replace(/\/+$/, "");
  return Object.fromEntries(["identity", "academic", "finance", "campus", "engagement", "meetings"].map((s) => [s, `${base}/services/${s}`]));
}

/** Reads a password without echoing it (falls back to SEED_PASSWORD for unattended runs). */
export async function askPassword(prompt) {
  if (process.env.SEED_PASSWORD) return process.env.SEED_PASSWORD;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const write = rl._writeToOutput.bind(rl);
  rl._writeToOutput = (s) => (s.startsWith(prompt) ? write(s) : write(""));
  const answer = await new Promise((resolve) => rl.question(prompt, resolve));
  rl.close();
  process.stdout.write("\n");
  return answer;
}

export class ApiError extends Error {
  constructor(status, method, url, body) {
    super(`${status} ${method} ${url} :: ${typeof body === "string" ? body.slice(0, 400) : JSON.stringify(body).slice(0, 400)}`);
    this.status = status;
    this.body = body;
  }
}

/** A signed-in API session. Re-signs in automatically when the ~15 min access token expires. */
export class Session {
  constructor(target, email, password) {
    this.urls = serviceUrls(target);
    this.email = email;
    this.password = password;
    this.token = null;
    this.tenant = null;
    this.branch = null;
    this.calls = 0;
  }

  async login() {
    const res = await fetch(`${this.urls.identity}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.accessToken) throw new ApiError(res.status, "POST", "/api/auth/login", body.title ?? body.detail ?? body);
    this.token = body.accessToken;
    this.user = body.user;
    return body;
  }

  /** `service` is one of identity/academic/finance/campus/engagement/meetings. */
  async call(service, method, path, body, { tenant = this.tenant, branch = this.branch, retries = 3 } = {}) {
    const url = `${this.urls[service]}${path}`;
    for (let attempt = 0; ; attempt++) {
      const headers = { Authorization: `Bearer ${this.token}` };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (tenant) headers["X-Tenant-Id"] = tenant;
      if (branch) headers["X-Branch-Id"] = branch;
      let res;
      try {
        this.calls++;
        res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      } catch (err) {
        if (attempt < retries) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw err;
      }
      if (res.status === 401 && attempt < retries) {
        await this.login();
        continue;
      }
      if ((res.status === 429 || res.status >= 502) && attempt < retries) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      const text = await res.text();
      let data = text;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        /* not JSON */
      }
      if (!res.ok) throw new ApiError(res.status, method, url, data);
      return data;
    }
  }

  /** multipart/form-data POST (file uploads), with the same headers and one re-sign-in on 401. */
  async form(service, path, formData, { tenant = this.tenant, branch = this.branch } = {}) {
    const url = `${this.urls[service]}${path}`;
    for (let attempt = 0; ; attempt++) {
      const headers = { Authorization: `Bearer ${this.token}` };
      if (tenant) headers["X-Tenant-Id"] = tenant;
      if (branch) headers["X-Branch-Id"] = branch;
      this.calls++;
      const res = await fetch(url, { method: "POST", headers, body: formData });
      if (res.status === 401 && attempt === 0) {
        await this.login();
        continue;
      }
      const text = await res.text();
      let data = text;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        /* not JSON */
      }
      if (!res.ok) throw new ApiError(res.status, "POST", url, data);
      return data;
    }
  }

  get = (s, p, o) => this.call(s, "GET", p, undefined, o);
  post = (s, p, b = {}, o) => this.call(s, "POST", p, b, o);
  put = (s, p, b = {}, o) => this.call(s, "PUT", p, b, o);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs `fn` over items with limited parallelism, so a deployed site isn't flooded while seeding. */
export async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
}

// ── Deterministic fake data (same seed = same school every run) ─────────────────────────────

export function rng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

export const BOY_NAMES = ["Aarav", "Vivaan", "Aditya", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Rohan", "Kabir", "Ayaan", "Dhruv", "Atharv", "Nikhil", "Rahul", "Karthik", "Varun", "Aniket", "Siddharth", "Pranav", "Harsh", "Yash", "Manav", "Rudra", "Advik", "Shaurya", "Omkar", "Tejas", "Farhan", "Joel"];
export const GIRL_NAMES = ["Saanvi", "Aanya", "Diya", "Ananya", "Aadhya", "Pari", "Myra", "Anika", "Navya", "Kiara", "Ira", "Riya", "Sneha", "Meera", "Kavya", "Ishita", "Tanvi", "Nisha", "Pooja", "Lakshmi", "Fatima", "Zoya", "Aisha", "Neha", "Shreya", "Gauri", "Mira", "Divya", "Anjali", "Sara"];
export const SURNAMES = ["Sharma", "Verma", "Iyer", "Nair", "Menon", "Reddy", "Patel", "Gupta", "Kumar", "Singh", "Das", "Pillai", "Joshi", "Kulkarni", "Rao", "Bose", "Mehta", "Chopra", "Thomas", "Khan", "George", "Varghese", "Krishnan", "Mishra", "Pandey", "Shetty", "Naidu", "Banerjee", "Mathew", "Hegde"];
export const ADULT_MALE = ["Rajesh", "Suresh", "Anil", "Manoj", "Ravi", "Sanjay", "Vinod", "Prakash", "Deepak", "Ashok", "Mahesh", "Ramesh", "Sunil", "Ajay", "Vijay", "Arun", "Gopal", "Mohan", "Naveen", "Sameer"];
export const ADULT_FEMALE = ["Sunita", "Anita", "Kavitha", "Lata", "Rekha", "Meena", "Priya", "Geetha", "Shalini", "Asha", "Deepa", "Radha", "Seema", "Usha", "Vandana", "Bindu", "Jyothi", "Sheela", "Rani", "Nirmala"];
export const CITIES = ["MG Road", "Indiranagar", "Koramangala", "Jayanagar", "Whitefield", "HSR Layout", "Malleshwaram", "BTM Layout", "Hebbal", "Banashankari"];

export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
/** The most recent `count` weekdays (Mon–Sat is a school week in India, so skip Sundays only), oldest first. */
export function recentSchoolDays(count, from = new Date()) {
  const days = [];
  let d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (days.length < count) {
    d = addDays(d, -1);
    if (d.getUTCDay() !== 0) days.unshift(iso(d));
  }
  return days;
}
