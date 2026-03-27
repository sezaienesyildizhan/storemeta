import type { GoogleScreenshotSettings } from "../config/types.js";
import { normalizeLocaleCodes } from "./normalize.js";

export interface ResolvedScreenshotGroup {
  name: string;
  locales: string[];
}

export function listScreenshotGroups(
  settings?: GoogleScreenshotSettings,
): ResolvedScreenshotGroup[] {
  return Object.entries(settings?.groups ?? {})
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([name, group]) => ({
      name,
      locales: normalizeLocaleCodes(group.locales),
    }));
}

export function getScreenshotGroup(
  settings: GoogleScreenshotSettings | undefined,
  groupName: string,
): ResolvedScreenshotGroup | undefined {
  return listScreenshotGroups(settings).find((group) => group.name === groupName);
}
