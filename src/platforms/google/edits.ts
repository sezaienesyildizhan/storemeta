import { GooglePlayClient } from "./client.js";

export interface GoogleAppEdit {
  id: string;
  expiryTimeSeconds?: string;
}

export async function createGoogleEdit(
  client: GooglePlayClient,
  packageName: string,
): Promise<GoogleAppEdit> {
  return client.requestJson<GoogleAppEdit>(
    `/applications/${encodeURIComponent(packageName)}/edits`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );
}

export async function commitGoogleEdit(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  options?: {
    changesNotSentForReview?: boolean;
  },
): Promise<GoogleAppEdit> {
  const query = new URLSearchParams();

  if (options?.changesNotSentForReview !== undefined) {
    query.set(
      "changesNotSentForReview",
      String(options.changesNotSentForReview),
    );
  }

  const querySuffix = query.size === 0 ? "" : `?${query.toString()}`;

  return client.requestJson<GoogleAppEdit>(
    `/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}:commit${querySuffix}`,
    {
      method: "POST",
    },
  );
}
