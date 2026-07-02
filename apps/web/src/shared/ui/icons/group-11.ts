import * as md from "react-icons/md";
import * as pi from "react-icons/pi";

import { type IconLibraries } from "./types";

export const iconLibraries: IconLibraries = {
  md: md as unknown as IconLibraries[string],
  pi: pi as unknown as IconLibraries[string]
};
