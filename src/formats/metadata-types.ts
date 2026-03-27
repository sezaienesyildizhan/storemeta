export type MetadataPlatform = "apple" | "google";

export interface LocalizedMetadataDocument {
  locale: string;
}

export interface AppleMetadataDocument extends LocalizedMetadataDocument {
  app_name?: string;
  subtitle?: string;
  keywords?: string;
  promotional_text?: string;
  description?: string;
  whats_new?: string;
  support_url?: string;
  marketing_url?: string;
  privacy_policy_url?: string;
}

export interface GoogleMetadataDocument extends LocalizedMetadataDocument {
  title?: string;
  short_description?: string;
  full_description?: string;
  video?: string;
}

export type PlatformMetadataDocument =
  | AppleMetadataDocument
  | GoogleMetadataDocument;
