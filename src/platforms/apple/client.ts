import { StoremetaError } from "../../cli/errors.js";
import type { AppleCredentialsSettings } from "../../config/types.js";
import { createAppleJwtToken } from "../../auth/apple/jwt.js";

const APP_STORE_CONNECT_API_BASE_URL = "https://api.appstoreconnect.apple.com/v1";

export interface AppStoreConnectRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: BodyInit;
}

export interface AppStoreConnectPagedLinks {
  self?: string;
  next?: string;
}

export interface AppStoreConnectPagedResponse<T> {
  data: T[];
  links?: AppStoreConnectPagedLinks;
}

interface AppStoreConnectErrorDocument {
  errors?: Array<{
    id?: string;
    status?: string;
    code?: string;
    title?: string;
    detail?: string;
  }>;
}

async function createAppStoreConnectErrorMessage(
  response: Response,
): Promise<string> {
  const fallbackMessage =
    `App Store Connect API request failed with ${response.status} ${response.statusText}`;

  try {
    const errorDocument =
      (await response.json()) as AppStoreConnectErrorDocument;
    const firstError = errorDocument.errors?.[0];

    if (firstError === undefined) {
      return fallbackMessage;
    }

    const detailParts = [
      firstError.code,
      firstError.title,
      firstError.detail,
    ].filter((part): part is string => part !== undefined && part.trim().length > 0);

    if (detailParts.length === 0) {
      return fallbackMessage;
    }

    return `${fallbackMessage}: ${detailParts.join(" - ")}`;
  } catch {
    return fallbackMessage;
  }
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

    let response: Response;

    try {
      response = await fetch(requestUrl, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
          ...options.headers,
        },
        body: options.body,
      });
    } catch (cause) {
      throw new StoremetaError(
        "API_ERROR",
        "App Store Connect API request failed before a response was received",
        { cause },
      );
    }

    if (!response.ok) {
      throw new StoremetaError(
        "API_ERROR",
        await createAppStoreConnectErrorMessage(response),
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

export async function postAppStoreConnectJson<TResponse>(
  client: AppStoreConnectClient,
  path: string,
  body: unknown,
): Promise<TResponse> {
  return client.requestJson<TResponse>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function patchAppStoreConnectJson<TResponse>(
  client: AppStoreConnectClient,
  path: string,
  body: unknown,
): Promise<TResponse> {
  return client.requestJson<TResponse>(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function requestAllAppStoreConnectPages<T>(
  client: AppStoreConnectClient,
  path: string,
): Promise<T[]> {
  const resources: T[] = [];
  const seenPaths = new Set<string>();
  let currentPath: string | undefined = path;

  while (currentPath !== undefined) {
    if (seenPaths.has(currentPath)) {
      throw new StoremetaError(
        "API_ERROR",
        `App Store Connect pagination loop detected at ${currentPath}`,
      );
    }

    seenPaths.add(currentPath);

    const response: AppStoreConnectPagedResponse<T> =
      await client.requestJson<AppStoreConnectPagedResponse<T>>(
      currentPath,
    );

    resources.push(...response.data);

    if (response.data.length === 0) {
      break;
    }

    currentPath =
      response.links?.next !== undefined && response.links.next.length > 0
        ? response.links.next
        : undefined;
  }

  return resources;
}
