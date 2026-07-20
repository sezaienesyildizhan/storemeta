export type MetadataFormat = "markdown" | "yaml";

export interface ProjectSettings {
  name: string;
  defaultApp: string;
}

export interface MetadataSettings {
  baseDir: string;
  format: MetadataFormat;
}

export interface ScreenshotSettings {
  baseDir: string;
}

export interface AppleCredentialsSettings {
  issuerIdEnv: string;
  keyIdEnv: string;
  privateKeyPathEnv: string;
}

export interface GoogleCredentialsSettings {
  serviceAccountPathEnv: string;
}

export interface LocaleSettings {
  default?: string[];
  map?: Record<string, string>;
}

export interface ScreenshotGroupSettings {
  locales: string[];
}

export interface GoogleScreenshotSettings {
  groups?: Record<string, ScreenshotGroupSettings>;
}

export interface AppleAppSettings {
  appId: string;
  credentials: AppleCredentialsSettings;
  locales?: LocaleSettings;
}

export interface GoogleAppSettings {
  packageName: string;
  credentials: GoogleCredentialsSettings;
  locales?: LocaleSettings;
  screenshots?: GoogleScreenshotSettings;
}

export interface AppSettings {
  metadata: MetadataSettings;
  screenshots: ScreenshotSettings;
  apple?: AppleAppSettings;
  google?: GoogleAppSettings;
}

export interface StoremetaConfig {
  version: number;
  project: ProjectSettings;
  apps: Record<string, AppSettings>;
}
