import type { ItemUnit, StockTransactionType } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const ITEM_UNIT_OPTIONS: Array<{ value: ItemUnit; label: string }> = [
  { value: "piece", label: "Piece" },
  { value: "box", label: "Box" },
  { value: "packet", label: "Packet" },
  { value: "kg", label: "Kilogram" },
  { value: "litre", label: "Litre" },
  { value: "ream", label: "Ream" },
  { value: "set", label: "Set" },
];

export const TRANSACTION_TYPE_CONFIG: Record<StockTransactionType, { label: string; variant: BadgeVariant }> = {
  purchase: { label: "Purchase", variant: "success" },
  issue: { label: "Issue", variant: "info" },
  adjustment: { label: "Adjustment", variant: "warning" },
};
