import { StoremetaError } from "../../cli/errors.js";
import type { AppleCredentialsSettings } from "../../config/types.js";
import { createAppleJwtToken } from "../../auth/apple/jwt.js";

const APP_STORE_CONNECT_API_BASE_URL = "https://api.appstoreconnect.apple.com/v1";

export interface AppStoreConnectRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: BodyInit;
}

export class AppStoreConnectClient {
  private readonly credentials: AppleCredentialsSettings;
  private readonly env: NodeJS.ProcessEnv;

  public constructor(
    credentials: AppleCredentialsSettings,
    env: NodeJS.ProcessEnv = process.env,
  ) {
    this.credentials = credentials;
    this.env = env;
  }

  public async request(
    path: string,
    options: AppStoreConnectRequestOptions = {},
  ): Promise<Response> {
    const jwt = await createAppleJwtToken(this.credentials, this.env);
    const requestUrl =
      path.startsWith("https://") || path.startsWith("http://")
        ? path
        : `${APP_STORE_CONNECT_API_BASE_URL}${path}`;
    const response = await fetch(requestUrl, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
        ...options.headers,
      },
      body: options.body,
    });

    if (!response.ok) {
      throw new StoremetaError(
        "API_ERROR",
        `App Store Connect API request failed with ${response.status} ${response.statusText}`,
      );
    }

    return response;
  }

  public async requestJson<T>(
    path: string,
    options: AppStoreConnectRequestOptions = {},
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

export function createAppStoreConnectClient(
  credentials: AppleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): AppStoreConnectClient {
  return new AppStoreConnectClient(credentials, env);
}
