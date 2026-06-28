/**
 * Prefer WebP para assets raster en public/ (generados por npm run assets:optimize).
 */
export function rasterAsset(path: string): string {
  return path.replace(/\.(png|jpe?g)$/i, ".webp");
}
