export type DownloadedFile = {
  blob: Blob;
  fileName: string;
};

const FALLBACK_FILE_NAME = "download";

/** The file name the server gave in `Content-Disposition`. */
export const fileNameFromDisposition = (disposition: string | null): string =>
  disposition?.match(/filename="([^"]+)"/)?.[1] ?? FALLBACK_FILE_NAME;

export const readDownloadedFile = async (
  res: Response,
): Promise<DownloadedFile> => ({
  blob: await res.blob(),
  fileName: fileNameFromDisposition(res.headers.get("Content-Disposition")),
});
