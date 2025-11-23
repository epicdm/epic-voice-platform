export enum FunnelStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  ARCHIVED = "archived"
}

export interface Funnel {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isActive: boolean;
  status?: FunnelStatus;
  settings?: any;  // Funnel settings/configuration
  createdAt: Date;
  updatedAt: Date;
}

export type FunnelListItem = Funnel;  // Alias for list view

export interface FunnelNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

export interface FunnelEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export function getFunnelStatusLabel(status: FunnelStatus | string): string {
  switch (status) {
    case FunnelStatus.DRAFT:
      return "Draft";
    case FunnelStatus.ACTIVE:
      return "Active";
    case FunnelStatus.PAUSED:
      return "Paused";
    case FunnelStatus.ARCHIVED:
      return "Archived";
    default:
      return "Unknown";
  }
}
