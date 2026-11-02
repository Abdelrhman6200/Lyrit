import Image, { type ImageProps } from "next/image";

/** next/image wrapper that skips optimisation for SVG placeholders. */
export function Media(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image {...props} unoptimized={props.unoptimized ?? src.endsWith(".svg")} />;
}
