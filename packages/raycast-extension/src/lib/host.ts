import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import type { RunRequest, RunResponse } from "../types";

interface Preferences {
  hostUrl: string;
  apiKey: string;
}

/**
 * Generic API call function for Host communication
 */
export async function callHostApi<T>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST";
    body?: any;
  }
): Promise<T> {
  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.hostUrl) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Host URL not configured",
    });
    throw new Error("Host URL not configured");
  }

  const response = await fetch(`${prefs.hostUrl}${endpoint}`, {
    method: options?.method || "GET",
    headers: {
      Authorization: `Bearer ${prefs.apiKey}`,
      "Content-Type": "application/json",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unauthorized – check API key",
    });
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    // Try to parse error message from response
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    const errorMessage = errorData.error || `HTTP ${response.status}`;

    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: errorMessage,
    });
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

/**
 * Convenience function for running a skill
 */
export async function callHostRun(request: RunRequest): Promise<RunResponse> {
  return callHostApi<RunResponse>("/api/run", {
    method: "POST",
    body: request,
  });
}
