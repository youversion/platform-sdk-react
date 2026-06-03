declare const __YV_STYLES__: string;

export function YvStyles() {
  return (
    <style href="yv-sdk-styles" precedence="yv-sdk">
      {__YV_STYLES__}
    </style>
  );
}
