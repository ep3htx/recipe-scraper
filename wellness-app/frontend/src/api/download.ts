import { api, ApiError } from "./client";

// File downloads need the same Bearer auth as every other API call, so a
// plain <a href="/api/export/..."> won't work — the browser navigation
// wouldn't carry the in-memory access token. Fetch as a blob instead and
// trigger the save via a throwaway object URL.
export async function downloadFile(path: string, filename: string) {
  const res = await api.raw(path);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
