import { type IconType } from "react-icons/lib";
import * as pi from "react-icons/pi";
import * as ri from "react-icons/ri";
import * as rx from "react-icons/rx";
import * as si from "react-icons/si";
import * as sl from "react-icons/sl";
import * as tb from "react-icons/tb";
import * as tfi from "react-icons/tfi";
import * as ti from "react-icons/ti";
import * as vsc from "react-icons/vsc";
import * as wi from "react-icons/wi";

export const iconLibraries: Record<string, Record<string, IconType>> = {
  pi: pi as unknown as Record<string, IconType>,
  ri: ri as unknown as Record<string, IconType>,
  rx: rx as unknown as Record<string, IconType>,
  si: si as unknown as Record<string, IconType>,
  sl: sl as unknown as Record<string, IconType>,
  tb: tb as unknown as Record<string, IconType>,
  tfi: tfi as unknown as Record<string, IconType>,
  ti: ti as unknown as Record<string, IconType>,
  vsc: vsc as unknown as Record<string, IconType>,
  wi: wi as unknown as Record<string, IconType>
};
