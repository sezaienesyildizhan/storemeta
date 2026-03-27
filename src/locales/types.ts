export type LocaleCode = string;

export type LocaleMap = Record<LocaleCode, LocaleCode>;

export interface LocaleGroup {
  locales: LocaleCode[];
}

export type LocaleGroups = Record<string, LocaleGroup>;

export interface LocaleSelection {
  default?: LocaleCode[];
  map?: LocaleMap;
}
