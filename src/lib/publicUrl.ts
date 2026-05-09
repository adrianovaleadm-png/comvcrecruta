// Returns the base URL to use for public-facing links (e.g. job application pages).
// When running inside a Lovable private preview (lovableproject.com or id-preview--*.lovable.app),
// the link would require Lovable login, so we fall back to the published domain.
const PUBLISHED_URL = "https://comvcrecruta.lovable.app";

export function getPublicBaseUrl(): string {
  if (typeof window === "undefined") return PUBLISHED_URL;
  const host = window.location.hostname;
  const isPrivatePreview =
    host.endsWith(".lovableproject.com") ||
    host.startsWith("id-preview--") ||
    host === "localhost" ||
    host === "127.0.0.1";
  return isPrivatePreview ? PUBLISHED_URL : window.location.origin;
}

export function getPublicJobUrl(jobId: string): string {
  return `${getPublicBaseUrl()}/vaga/${jobId}/candidatar`;
}
