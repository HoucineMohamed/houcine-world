/**
 * True when a page's code file could not be downloaded: the visitor is offline, or the site was updated
 * while the tab was open and the old file is gone. Reloading fetches the current files.
 */
export const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error &&
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading (CSS )?chunk/i.test(
    error.message,
  );
