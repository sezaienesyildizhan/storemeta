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
