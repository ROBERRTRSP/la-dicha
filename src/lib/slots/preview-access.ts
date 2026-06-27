export function isSlotVisualPreviewEnabled(): boolean {
  const explicitPreview =
    process.env.SLOT_VISUAL_PREVIEW_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_SLOT_VISUAL_TEST === "true";
  const hostedProduction = process.env.VERCEL_ENV === "production";

  if (hostedProduction && !explicitPreview) {
    return false;
  }

  return true;
}
