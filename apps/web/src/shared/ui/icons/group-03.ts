import * as ci from "react-icons/ci";
import * as di from "react-icons/di";

import { type IconLibraries } from "./types";

export const iconLibraries: IconLibraries = {
  ci: ci as unknown as IconLibraries[string],
  di: di as unknown as IconLibraries[string]
};
