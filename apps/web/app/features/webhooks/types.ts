export interface EndpointRow {
  id: string;
  name: string | null;
  url: string;
  events: string;
  isActive: boolean;
  createdAt: Date;
}
