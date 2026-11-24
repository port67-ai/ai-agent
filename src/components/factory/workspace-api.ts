// Small browser helpers for the video workspace (CHG-0103). Every call goes to the authorised factory API; nothing is read directly.
export async function api<T = Record<string, unknown>>(path: string, data?: unknown): Promise<T> {
  const response = await fetch("/api/factory/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "content-type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body as T;
}

/** Send one file as the raw request body, as the studio uploads do. The server checks the real file type. */
export async function uploadFile<T = Record<string, unknown>>(path: string, file: File, query: Record<string, string>): Promise<T> {
  const response = await fetch(`/api/factory/${path}?${new URLSearchParams(query)}`, { method: "POST", headers: { "content-type": file.type || "application/octet-stream" }, body: file, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Upload failed");
  return body as T;
}
