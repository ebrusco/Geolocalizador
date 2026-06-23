export function exportSearchUrl(searchId: number, format = "xlsx"): string {
  return `/api/v1/searches/${searchId}/export?format=${format}`;
}

export interface EmailScrapeProgress {
  completed: number;
  total: number;
  found: number;
}

export interface EmailScrapeResult {
  found: number;
  total_with_web: number;
}

export function scrapeEmails(
  searchId: number,
  onProgress: (p: EmailScrapeProgress) => void,
  onComplete: (r: EmailScrapeResult) => void,
  onError: (msg: string) => void,
): () => void {
  const ctrl = new AbortController();

  fetch(`/api/v1/searches/${searchId}/scrape-emails`, {
    method: "POST",
    signal: ctrl.signal,
  }).then(async (resp) => {
    if (!resp.ok || !resp.body) {
      onError("Error iniciando scraping de emails");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            if (currentEvent === "progress") {
              onProgress(data as EmailScrapeProgress);
            } else if (currentEvent === "completed") {
              onComplete(data as EmailScrapeResult);
            } else if (currentEvent === "error") {
              onError(data.detail || "Error desconocido");
            }
          } catch {
            // skip malformed
          }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== "AbortError") {
      onError("Error de conexión");
    }
  });

  return () => ctrl.abort();
}
