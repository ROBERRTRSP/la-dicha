export function isSlotVisualPreviewEnabled(): boolean {
  const explicitPreview =
    process.env.SLOT_VISUAL_PREVIEW_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_SLOT_VISUAL_TEST === "true";

  if (process.env.NODE_ENV === "production" && !explicitPreview) {
    return false;
  }

  return process.env.NODE_ENV !== "production" || explicitPreview;
}
