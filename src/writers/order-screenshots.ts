import { extname } from "node:path";

import type { ScreenshotDescriptor } from "../formats/screenshot-types.js";

function getCanonicalScreenshotExtension(fileName: string): string {
  const extension = extname(fileName).toLowerCase();

  return extension.length > 0 ? extension : ".png";
}

export function orderScreenshotsForWrite(
  screenshots: ScreenshotDescriptor[],
): ScreenshotDescriptor[] {
  return [...screenshots]
    .sort((left, right) => {
      if (left.position !== right.position) {
        return left.position - right.position;
      }

      return left.fileName.localeCompare(right.fileName);
    })
    .map((screenshot, index) => ({
      ...screenshot,
      position: index + 1,
      fileName: `${index + 1}${getCanonicalScreenshotExtension(screenshot.fileName)}`,
    }));
}
