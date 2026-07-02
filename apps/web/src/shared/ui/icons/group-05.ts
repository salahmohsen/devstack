import * as fc from "react-icons/fc";
import * as fi from "react-icons/fi";

import { type IconLibraries } from "./types";

export const iconLibraries: IconLibraries = {
  fc: fc as unknown as IconLibraries[string],
  fi: fi as unknown as IconLibraries[string]
};
