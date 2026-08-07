export type CorrelatedRequest = {
  header(name: string): string | undefined;
  method: string;
  originalUrl: string;
  requestId?: string;
};
