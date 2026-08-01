export interface SessionRecord {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface DeviceRecord {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "tablet";
  os: string;
  trustedAt: string;
  lastUsedAt: string;
}
