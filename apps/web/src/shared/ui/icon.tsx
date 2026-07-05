import * as React from "react";
import { type IconBaseProps, type IconType } from "react-icons/lib";

type typesPropsIcon = {
  nameIcon: string;
  propsIcon?: IconBaseProps;
};

let allIconsPromise: Promise<Record<string, IconType>> | undefined;

const iconComponentCache = new Map<string, IconType>();

async function resolveIcon(nameIcon: string): Promise<IconType | null> {
  const lib = nameIcon
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(" ")[0]
    .toLocaleLowerCase();

  const cacheKey = `${lib}:${nameIcon}`;
  const cached = iconComponentCache.get(cacheKey);
  if (cached) return cached;

  allIconsPromise ??= (async () => {
    const allGroups = await Promise.all([
      import("./icons/group-01"),
      import("./icons/group-02"),
      import("./icons/group-03"),
      import("./icons/group-04"),
      import("./icons/group-05"),
      import("./icons/group-06"),
      import("./icons/group-07"),
      import("./icons/group-08"),
      import("./icons/group-09"),
      import("./icons/group-10"),
      import("./icons/group-11"),
      import("./icons/group-12"),
      import("./icons/group-13"),
      import("./icons/group-14"),
      import("./icons/group-15")
    ]);
    const all: Record<string, IconType> = {};
    for (const m of allGroups) {
      for (const libModules of Object.values(m.iconLibraries)) {
        Object.assign(all, libModules);
      }
    }
    return all;
  })();

  const allIcons = await allIconsPromise;
  const Comp = allIcons[nameIcon] ?? null;
  if (Comp) iconComponentCache.set(cacheKey, Comp);
  return Comp;
}

function Icon({ nameIcon, propsIcon }: typesPropsIcon): React.ReactElement | null {
  const [Component, setComponent] = React.useState<IconType | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void resolveIcon(nameIcon).then((comp) => {
      if (!cancelled) setComponent(() => comp);
    });
    return () => {
      cancelled = true;
    };
  }, [nameIcon]);

  if (!Component) return null;
  return <Component {...propsIcon} />;
}

export { Icon };
