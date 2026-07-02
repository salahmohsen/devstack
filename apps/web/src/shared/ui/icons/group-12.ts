import * as ri from "react-icons/ri";
import * as rx from "react-icons/rx";

import { type IconLibraries } from "./types";

export const iconLibraries: IconLibraries = {
  ri: ri as unknown as IconLibraries[string],
  rx: rx as unknown as IconLibraries[string]
};
