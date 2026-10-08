import { subdomainFromHostname } from "./tenantHost";

const BASE = "sms-schoolsphere.com";
const PLATFORM = ["www", "demo"];

describe("subdomainFromHostname", () => {
  it("reads the school from {subdomain}.{base domain}, case-insensitively", () => {
    expect(subdomainFromHostname("greenvalley.sms-schoolsphere.com", BASE, PLATFORM)).toBe("greenvalley");
    expect(subdomainFromHostname("StMarys.SMS-SchoolSphere.com.", BASE, PLATFORM)).toBe("stmarys");
    expect(subdomainFromHostname("abc-school.sms-schoolsphere.com", BASE, PLATFORM)).toBe("abc-school");
  });

  it("is null on the apex, platform hosts, nested names and other domains", () => {
    expect(subdomainFromHostname("sms-schoolsphere.com", BASE, PLATFORM)).toBeNull();
    expect(subdomainFromHostname("www.sms-schoolsphere.com", BASE, PLATFORM)).toBeNull();
    expect(subdomainFromHostname("demo.sms-schoolsphere.com", BASE, PLATFORM)).toBeNull();
    expect(subdomainFromHostname("a.b.sms-schoolsphere.com", BASE, PLATFORM)).toBeNull();
    expect(subdomainFromHostname("greenvalley.evil.com", BASE, PLATFORM)).toBeNull();
    expect(subdomainFromHostname("evilsms-schoolsphere.com", BASE, PLATFORM)).toBeNull();
    expect(subdomainFromHostname("localhost", BASE, PLATFORM)).toBeNull();
    expect(subdomainFromHostname("127.0.0.1", BASE, PLATFORM)).toBeNull();
  });
});
