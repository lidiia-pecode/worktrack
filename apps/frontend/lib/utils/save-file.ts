import type { DownloadedFile } from "@/lib/api/core/downloaded-file";

/** Hands a downloaded file to the browser, which saves it under its name. */
export const saveFile = ({ blob, fileName }: DownloadedFile) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  // Freed after the click has been handled: Safari cancels the download if
  // the link is freed straight away.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
