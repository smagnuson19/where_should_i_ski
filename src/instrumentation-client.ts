import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogRegion =
  process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu" ? "eu" : "us";

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: "/ingest",
    ui_host: `https://${posthogRegion}.posthog.com`,
    defaults: "2026-08-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
