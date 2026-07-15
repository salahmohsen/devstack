import { cn } from "@tsu-stack/ui/lib/utils";

type IconProps = {
  icon?: string | null;
  className?: string;
  fallbackToLetter?: boolean;
  letterClassName?: string;
  name?: string;
};

function renderSvg(svgRaw: string, className?: string): React.ReactElement {
  let svg = svgRaw.trim();

  if (!svg.startsWith("<svg")) {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">${svg}</svg>`;
  } else {
    svg = svg
      .replace(/\swidth="[^"]*"/, "")
      .replace(/\sheight="[^"]*"/, "")
      .replace(/<svg/, '<svg width="100%" height="100%"');
  }

  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function Icon({
  icon,
  className,
  fallbackToLetter = false,
  letterClassName,
  name
}: IconProps): React.ReactElement | null {
  if (icon) {
    return renderSvg(icon, className);
  }

  if (fallbackToLetter) {
    return (
      <span
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md bg-muted text-sm font-medium",
          letterClassName
        )}
      >
        {name?.charAt(0)?.toUpperCase()}
      </span>
    );
  }

  return null;
}

function IconLetter({
  letter,
  letterClassName
}: {
  letter: string;
  letterClassName?: string;
}): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md bg-muted text-sm font-medium",
        letterClassName
      )}
    >
      {letter.charAt(0).toUpperCase()}
    </span>
  );
}

export { Icon, IconLetter, renderSvg };
export type { IconProps };
