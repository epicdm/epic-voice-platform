export interface Funnel {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
