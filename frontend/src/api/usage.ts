import api from "./client";
import type { UsageSummary } from "../types";

export async function getUsage(): Promise<UsageSummary> {
  const { data } = await api.get<UsageSummary>("/usage");
  return data;
}
