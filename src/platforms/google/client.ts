import { StoremetaError } from "../../cli/errors.js";
import type { GoogleCredentialsSettings } from "../../config/types.js";
import { getGoogleAccessToken } from "../../auth/google/service-account-auth.js";

const GOOGLE_PLAY_API_BASE_URL =
  "https://androidpublisher.googleapis.com/androidpublisher/v3";

export interface GooglePlayRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
}

export class GooglePlayClient {
  private readonly credentials: GoogleCredentialsSettings;
  private readonly env: NodeJS.ProcessEnv;

  public constructor(
    credentials: GoogleCredentialsSettings,
    env: NodeJS.ProcessEnv = process.env,
  ) {
    this.credentials = credentials;
    this.env = env;
  }

  public async request(
    path: string,
    options: GooglePlayRequestOptions = {},
  ): Promise<Response> {
    const accessToken = await getGoogleAccessToken(this.credentials, this.env);
    const response = await fetch(`${GOOGLE_PLAY_API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
      body: options.body,
    });

    if (!response.ok) {
      throw new StoremetaError(
        "API_ERROR",
        `Google Play API request failed with ${response.status} ${response.statusText}`,
      );
    }

    return response;
  }

  public async requestJson<T>(
    path: string,
    options: GooglePlayRequestOptions = {},
  ): Promise<T> {
    const response = await this.request(path, {
      ...options,
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
    });

    return (await response.json()) as T;
  }
}

export function createGooglePlayClient(
  credentials: GoogleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): GooglePlayClient {
  return new GooglePlayClient(credentials, env);
}
