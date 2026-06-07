import { type SVGProps } from "react";

export function ShieldAlertIcon(
  props: SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }
) {
  const { size = 24, width, height, strokeWidth = 1.5, ...rest } = props;
  const isDecorative = rest["aria-label"] == null && rest["aria-labelledby"] == null;
  return (
    <svg
      aria-hidden={isDecorative || undefined}
      color="currentColor"
      fill="none"
      focusable="false"
      height={height ?? size}
      role={isDecorative ? undefined : "img"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={width ?? size}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="16" r="0.5" fill="currentColor" />
    </svg>
  );
}
