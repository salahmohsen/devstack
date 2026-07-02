import * as ti from "react-icons/ti";
import * as vsc from "react-icons/vsc";
import * as wi from "react-icons/wi";

import { type IconLibraries } from "./types";

export const iconLibraries: IconLibraries = {
  ti: ti as unknown as IconLibraries[string],
  vsc: vsc as unknown as IconLibraries[string],
  wi: wi as unknown as IconLibraries[string]
};
