export type CommandStatus = "success" | "partial" | "failure";

export interface CommandItemResult {
  target: string;
  success: boolean;
  message?: string;
}

export interface CommandSummary {
  status: CommandStatus;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  results: CommandItemResult[];
}
