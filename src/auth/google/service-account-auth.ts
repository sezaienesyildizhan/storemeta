import { GoogleAuth } from "google-auth-library";

import { StoremetaError } from "../../cli/errors.js";
import type { GoogleCredentialsSettings } from "../../config/types.js";
import { requireGoogleCredentials } from "./load-credentials.js";

export const GOOGLE_PLAY_SCOPE =
  "https://www.googleapis.com/auth/androidpublisher";

export function createGoogleServiceAccountAuth(
  credentials: GoogleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): GoogleAuth {
  const resolvedCredentials = requireGoogleCredentials(credentials, env);

  return new GoogleAuth({
    keyFile: resolvedCredentials.serviceAccountPath,
    scopes: [GOOGLE_PLAY_SCOPE],
  });
}

export async function getGoogleAccessToken(
  credentials: GoogleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const auth = createGoogleServiceAccountAuth(credentials, env);
  const client = await auth.getClient();
  const accessTokenResult = await client.getAccessToken();
  const accessToken =
    typeof accessTokenResult === "string"
      ? accessTokenResult
      : accessTokenResult?.token;

  if (
    accessToken === undefined ||
    accessToken === null ||
    accessToken.trim().length === 0
  ) {
    throw new StoremetaError(
      "AUTH_ERROR",
      "Failed to obtain a Google Play access token from the service account",
    );
  }

  return accessToken;
}
