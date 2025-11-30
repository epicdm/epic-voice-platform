export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
