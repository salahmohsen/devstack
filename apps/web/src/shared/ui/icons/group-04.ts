import * as fa from "react-icons/fa";
import * as fa6 from "react-icons/fa6";

import { type IconLibraries } from "./types";

export const iconLibraries: IconLibraries = {
  fa: fa as unknown as IconLibraries[string],
  fa6: fa6 as unknown as IconLibraries[string]
};
