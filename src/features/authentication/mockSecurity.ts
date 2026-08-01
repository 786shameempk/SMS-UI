import type { DeviceRecord, SessionRecord } from "./types";

export function buildMockSessions(): SessionRecord[] {
  return [
    {
      id: "sess-current",
      device: "This device",
      browser: "Chrome 129 on Windows",
      location: "Bengaluru, IN",
      ipAddress: "203.0.113.42",
      lastActiveAt: new Date().toISOString(),
      isCurrent: true,
    },
    {
      id: "sess-2",
      device: "iPhone 15",
      browser: "Safari on iOS 18",
      location: "Bengaluru, IN",
      ipAddress: "203.0.113.77",
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      isCurrent: false,
    },
    {
      id: "sess-3",
      device: "MacBook Pro",
      browser: "Firefox 131 on macOS",
      location: "Chennai, IN",
      ipAddress: "203.0.113.101",
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      isCurrent: false,
    },
  ];
}

export function buildMockDevices(): DeviceRecord[] {
  return [
    {
      id: "dev-1",
      name: "Ava's Laptop",
      type: "desktop",
      os: "Windows 11",
      trustedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
      lastUsedAt: new Date().toISOString(),
    },
    {
      id: "dev-2",
      name: "iPhone 15",
      type: "mobile",
      os: "iOS 18",
      trustedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
      lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
  ];
}
