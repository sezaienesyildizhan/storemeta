export interface AppleAppInfoLocalizationAttributes {
  locale?: string;
  name?: string;
  subtitle?: string;
  privacyPolicyUrl?: string;
}

export interface AppleAppInfoLocalizationData {
  type: "appInfoLocalizations";
  id?: string;
  attributes: AppleAppInfoLocalizationAttributes;
}

export interface AppleAppInfoLocalizationPayload {
  data: AppleAppInfoLocalizationData;
}

export interface AppleAppStoreVersionLocalizationAttributes {
  locale?: string;
  description?: string;
  keywords?: string;
  marketingUrl?: string;
  promotionalText?: string;
  supportUrl?: string;
  whatsNew?: string;
}

export interface AppleAppStoreVersionLocalizationData {
  type: "appStoreVersionLocalizations";
  id?: string;
  attributes: AppleAppStoreVersionLocalizationAttributes;
}

export interface AppleAppStoreVersionLocalizationPayload {
  data: AppleAppStoreVersionLocalizationData;
}
