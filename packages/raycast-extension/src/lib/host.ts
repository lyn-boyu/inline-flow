import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import type { RunRequest, RunResponse } from "../types";

interface Preferences {
  hostUrl: string;
  apiKey: string;
}

export async function callHostRun(request: RunRequest): Promise<RunResponse> {
  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.hostUrl) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Host URL not configured",
    });
    throw new Error("Host URL not configured");
  }

  const response = await fetch(`${prefs.hostUrl}/api/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${prefs.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (response.status === 401) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unauthorized – check API key",
    });
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Error ${response.status}`,
    });
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();
}
