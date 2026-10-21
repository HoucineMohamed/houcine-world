// Turns an image path of the content layer ("src/assets/x.png") into the address Vite gives that file in
// the build. Browser-only (it uses import.meta.glob), so the Node test never imports this file.
const files = import.meta.glob("/src/assets/**/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** The built address of a content image, or undefined if the file is not under src/assets. */
export const assetUrl = (src: string): string | undefined => files[`/${src}`];
