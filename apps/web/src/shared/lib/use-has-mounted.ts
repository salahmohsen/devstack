import { useEffect, useState } from "react";

export function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setHasMounted(true);
  }, []);

  return hasMounted;
}
