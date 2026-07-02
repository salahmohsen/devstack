import * as gi from "react-icons/gi";
import * as go from "react-icons/go";

import { type IconLibraries } from "./types";

export const iconLibraries: IconLibraries = {
  gi: gi as unknown as IconLibraries[string],
  go: go as unknown as IconLibraries[string]
};
