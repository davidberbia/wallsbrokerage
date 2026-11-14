export function shouldBypassAuthInPreview() {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("-preview--") ||
    hostname.includes("-dev.")
  );
}