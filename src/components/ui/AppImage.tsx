import Image, { type ImageProps } from "next/image";

type AppImageProps = Omit<ImageProps, "alt"> & {
  alt: string;
};

/** Imagen optimizada con next/image; usar en logos y assets estáticos. */
export function AppImage({ alt, ...props }: AppImageProps) {
  return <Image alt={alt} {...props} />;
}
