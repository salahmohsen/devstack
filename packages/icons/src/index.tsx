import { HugeiconsIcon, type HugeiconsIconProps, type IconSvgElement } from "@hugeicons/react";
import { forwardRef } from "react";

export type { HugeiconsIconProps } from "@hugeicons/react";

import {
  AddCircleHalfDotIcon as HugeAddCircleHalfDotIcon,
  AddSquareIcon as HugeAddSquareIcon,
  Alert01Icon as HugeAlert01Icon,
  AlertCircleIcon as HugeAlertCircleIcon,
  ArchiveIcon as HugeArchiveIcon,
  ArrangeIcon as HugeArrangeIcon,
  ArrowDown01Icon as HugeArrowDown01Icon,
  ArrowExpand02Icon as HugeArrowExpand02Icon,
  ArrowLeft01Icon as HugeArrowLeft01Icon,
  ArrowMoveDownRightIcon as HugeArrowMoveDownRightIcon,
  ArrowReloadHorizontalIcon as HugeArrowReloadHorizontalIcon,
  ArrowRight01Icon as HugeArrowRight01Icon,
  ArrowUp01Icon as HugeArrowUp01Icon,
  ArrowUpDownIcon as HugeArrowUpDownIcon,
  BookOpen01Icon as HugeBookOpen01Icon,
  BubbleChatIcon as HugeBubbleChatIcon,
  Bug01Icon as HugeBug01Icon,
  Building03Icon as HugeBuilding03Icon,
  Calendar01Icon as HugeCalendar01Icon,
  Cancel01Icon as HugeCancel01Icon,
  CancelCircleIcon as HugeCancelCircleIcon,
  CellsIcon as HugeCellsIcon,
  CenterFocusIcon as HugeCenterFocusIcon,
  CheckListIcon as HugeCheckListIcon,
  CheckmarkCircle01Icon as HugeCheckmarkCircle01Icon,
  CircleIcon as HugeCircleIcon,
  ClipboardIcon as HugeClipboardIcon,
  Clock01Icon as HugeClock01Icon,
  CommandIcon as HugeCommandIcon,
  Comment01Icon as HugeComment01Icon,
  ComputerIcon as HugeComputerIcon,
  ConsoleIcon as HugeConsoleIcon,
  Copy01Icon as HugeCopy01Icon,
  DangerIcon as HugeDangerIcon,
  DashboardSquare01Icon as HugeDashboardSquare01Icon,
  Delete01Icon as HugeDelete01Icon,
  DocumentCodeIcon as HugeDocumentCodeIcon,
  Download02Icon as HugeDownload02Icon,
  DragDropVerticalIcon as HugeDragDropVerticalIcon,
  EyeIcon as HugeEyeIcon,
  EyeOffIcon as HugeEyeOffIcon,
  File01Icon as HugeFile01Icon,
  File02Icon as HugeFile02Icon,
  FilterIcon as HugeFilterIcon,
  FingerPrintIcon as HugeFingerPrintIcon,
  Folder01Icon as HugeFolder01Icon,
  FolderLibraryIcon as HugeFolderLibraryIcon,
  GalleryVerticalEndIcon as HugeGalleryVerticalEndIcon,
  GitBranchIcon as HugeGitBranchIcon,
  GitCommitIcon as HugeGitCommitIcon,
  GitCompareIcon as HugeGitCompareIcon,
  GitForkIcon as HugeGitForkIcon,
  GitMergeIcon as HugeGitMergeIcon,
  GitPullRequestClosedIcon as HugeGitPullRequestClosedIcon,
  GitPullRequestDraftIcon as HugeGitPullRequestDraftIcon,
  GitPullRequestIcon as HugeGitPullRequestIcon,
  GripHorizontalIcon as HugeGripHorizontalIcon,
  Heading02Icon as HugeHeading02Icon,
  Heading03Icon as HugeHeading03Icon,
  Home01Icon as HugeHome01Icon,
  House01Icon as HugeHouse01Icon,
  InboxIcon as HugeInboxIcon,
  InformationCircleIcon as HugeInformationCircleIcon,
  LanguageCircleIcon as HugeLanguageCircleIcon,
  LeftToRightBlockQuoteIcon as HugeLeftToRightBlockQuoteIcon,
  LeftToRightListBulletIcon as HugeLeftToRightListBulletIcon,
  LeftToRightListNumberIcon as HugeLeftToRightListNumberIcon,
  Link01Icon as HugeLink01Icon,
  Link02Icon as HugeLink02Icon,
  Loading03Icon as HugeLoading03Icon,
  Location01Icon as HugeLocation01Icon,
  LockIcon as HugeLockIcon,
  Logout01Icon as HugeLogout01Icon,
  Mail01Icon as HugeMail01Icon,
  MapPinIcon as HugeMapPinIcon,
  Menu01Icon as HugeMenu01Icon,
  Message01Icon as HugeMessage01Icon,
  MinusSignIcon as HugeMinusSignIcon,
  Moon02Icon as HugeMoon02Icon,
  MoreHorizontalIcon as HugeMoreHorizontalIcon,
  Notification01Icon as HugeNotification01Icon,
  PackageIcon as HugePackageIcon,
  ParagraphIcon as HugeParagraphIcon,
  PencilEdit01Icon as HugePencilEdit01Icon,
  PlayCircleIcon as HugePlayCircleIcon,
  PlusSignIcon as HugePlusSignIcon,
  PresentationBarChart01Icon as HugePresentationBarChart01Icon,
  RedoIcon as HugeRedoIcon,
  Remove01Icon as HugeRemove01Icon,
  Search01Icon as HugeSearch01Icon,
  Settings01Icon as HugeSettings01Icon,
  Settings03Icon as HugeSettings03Icon,
  SidebarLeftIcon as HugeSidebarLeftIcon,
  SidebarRightIcon as HugeSidebarRightIcon,
  SourceCodeIcon as HugeSourceCodeIcon,
  SquareLock02Icon as HugeSquareLock02Icon,
  Sun01Icon as HugeSun01Icon,
  TextBoldIcon as HugeTextBoldIcon,
  TextItalicIcon as HugeTextItalicIcon,
  TextStrikethroughIcon as HugeTextStrikethroughIcon,
  TextUnderlineIcon as HugeTextUnderlineIcon,
  Tick02Icon as HugeTick02Icon,
  TickDouble01Icon as HugeTickDouble01Icon,
  Triangle01Icon as HugeTriangle01Icon,
  UndoIcon as HugeUndoIcon,
  UserAdd01Icon as HugeUserAdd01Icon,
  UserCircleIcon as HugeUserCircleIcon,
  UserGroupIcon as HugeUserGroupIcon,
  UserSquareIcon as HugeUserSquareIcon,
  ViewIcon as HugeViewIcon,
  WifiDisconnected01Icon as HugeWifiDisconnected01Icon
} from "@hugeicons/core-free-icons";

type IconProps = Omit<HugeiconsIconProps, "icon">;

const ic = (iconDef: IconSvgElement) =>
  forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <HugeiconsIcon ref={ref} icon={iconDef} {...props} />
  ));

export const IssuesIcon = ic(HugeAddCircleHalfDotIcon);
export const AlertCircleIcon = ic(HugeAlertCircleIcon);
export const AlertIcon = ic(HugeAlert01Icon);
export const AlertTriangleIcon = ic(HugeTriangle01Icon);
export const ArchiveIcon = ic(HugeArchiveIcon);
export const SortIcon = ic(HugeArrangeIcon);
export const ChevronDownIcon = ic(HugeArrowDown01Icon);
export const ExpandIcon = ic(HugeArrowExpand02Icon);
export const ChevronLeftIcon = ic(HugeArrowLeft01Icon);
export const ArrowMoveDownRightIcon = ic(HugeArrowMoveDownRightIcon);
export const RefreshCwIcon = ic(HugeArrowReloadHorizontalIcon);
export const ChevronRightIcon = ic(HugeArrowRight01Icon);
export const ChevronUpIcon = ic(HugeArrowUp01Icon);
export const BookOpenIcon = ic(HugeBookOpen01Icon);
export const BugIcon = ic(HugeBug01Icon);
export const BuildingIcon = ic(HugeBuilding03Icon);
export const CalendarIcon = ic(HugeCalendar01Icon);
export const CloseIcon = ic(HugeCancel01Icon);
export const XIcon = ic(HugeCancel01Icon);
export const IssueClosedNotPlannedIcon = ic(HugeCancelCircleIcon);
export const CellsIcon = ic(HugeCellsIcon);
export const CenterFocusIcon = ic(HugeCenterFocusIcon);
export const ReviewsIcon = ic(HugeCheckListIcon);
export const IssueClosedCompletedIcon = ic(HugeCheckmarkCircle01Icon);
export const CircleIcon = ic(HugeCircleIcon);
export const ClockIcon = ic(HugeClock01Icon);
export const CommandIcon = ic(HugeCommandIcon);
export const CommentIcon = ic(HugeComment01Icon);
export const SystemIcon = ic(HugeComputerIcon);
export const CopyIcon = ic(HugeCopy01Icon);
export const DashboardIcon = ic(HugeDashboardSquare01Icon);
export const Delete01Icon = ic(HugeDelete01Icon);
export const DangerIcon = ic(HugeDangerIcon);
export const DownloadIcon = ic(HugeDownload02Icon);
export const EyeIcon = ic(HugeEyeIcon);
export const EyeOffIcon = ic(HugeEyeOffIcon);
export const GripVerticalIcon = ic(HugeDragDropVerticalIcon);
export const FileIcon = ic(HugeFile02Icon);
export const FilterIcon = ic(HugeFilterIcon);
export const FolderIcon = ic(HugeFolder01Icon);
export const FolderLibraryIcon = ic(HugeFolderLibraryIcon);
export const GitBranchIcon = ic(HugeGitBranchIcon);
export const GitCommitIcon = ic(HugeGitCommitIcon);
export const GitCompareIcon = ic(HugeGitCompareIcon);
export const GitForkIcon = ic(HugeGitForkIcon);
export const GitMergeIcon = ic(HugeGitMergeIcon);
export const GitPullRequestClosedIcon = ic(HugeGitPullRequestClosedIcon);
export const GitPullRequestDraftIcon = ic(HugeGitPullRequestDraftIcon);
export const GitPullRequestIcon = ic(HugeGitPullRequestIcon);
export const HomeIcon = ic(HugeHome01Icon);
export const InboxIcon = ic(HugeInboxIcon);
export const InfoIcon = ic(HugeInformationCircleIcon);
export const LanguageIcon = ic(HugeLanguageCircleIcon);
export const LinkIcon = ic(HugeLink01Icon);
export const ExternalLinkIcon = ic(HugeLink02Icon);
export const LoaderCircleIcon = ic(HugeLoading03Icon);
export const LocationIcon = ic(HugeLocation01Icon);
export const LockIcon = ic(HugeLockIcon);
export const LogOutIcon = ic(HugeLogout01Icon);
export const MailIcon = ic(HugeMail01Icon);
export const MessageIcon = ic(HugeMessage01Icon);
export const MinusSignIcon = ic(HugeMinusSignIcon);
export const MoonIcon = ic(HugeMoon02Icon);
export const MoreHorizontalIcon = ic(HugeMoreHorizontalIcon);
export const NotificationIcon = ic(HugeNotification01Icon);
export const PackageIcon = ic(HugePackageIcon);
export const EditIcon = ic(HugePencilEdit01Icon);
export const PlusSignIcon = ic(HugePlusSignIcon);
export const PlusIcon = ic(HugeAddSquareIcon);
export const Remove01Icon = ic(HugeRemove01Icon);
export const SearchIcon = ic(HugeSearch01Icon);
export const SettingsIcon = ic(HugeSettings01Icon);
export const PanelLeftIcon = ic(HugeSidebarLeftIcon);
export const CodeIcon = ic(HugeSourceCodeIcon);
export const SquareLock02Icon = ic(HugeSquareLock02Icon);
export const SunIcon = ic(HugeSun01Icon);
export const CheckIcon = ic(HugeTick02Icon);
export const CheckCircleIcon = ic(HugeTickDouble01Icon);
export const TickIcon = ic(HugeTick02Icon);
export const UserAddIcon = ic(HugeUserAdd01Icon);
export const UserCircleIcon = ic(HugeUserCircleIcon);
export const FollowersIcon = ic(HugeUserGroupIcon);
export const ViewIcon = ic(HugeViewIcon);
export const WifiOffIcon = ic(HugeWifiDisconnected01Icon);

export const ArrowRightIcon = ic(HugeArrowRight01Icon);
export const ChevronsUpDownIcon = ic(HugeArrowUpDownIcon);
export const MessageSquareIcon = ic(HugeBubbleChatIcon);
export const ClipboardCopyIcon = ic(HugeClipboardIcon);
export const TerminalIcon = ic(HugeConsoleIcon);
export const LayoutDashboardIcon = ic(HugeDashboardSquare01Icon);
export const FileCodeIcon = ic(HugeDocumentCodeIcon);
export const FileTextIcon = ic(HugeFile01Icon);
export const FingerprintIcon = ic(HugeFingerPrintIcon);
export const HouseIcon = ic(HugeHouse01Icon);
export const MapPinIcon = ic(HugeMapPinIcon);
export const MenuIcon = ic(HugeMenu01Icon);
export const PlayCircleIcon = ic(HugePlayCircleIcon);
export const BarChartIcon = ic(HugePresentationBarChart01Icon);
export const Settings2Icon = ic(HugeSettings03Icon);
export const PanelRightCloseIcon = ic(HugeSidebarRightIcon);
export const CircleUserIcon = ic(HugeUserCircleIcon);
export const UserSquareIcon = ic(HugeUserSquareIcon);
export const constGripHorizontalIcon = ic(HugeGripHorizontalIcon);
export const GalleryVerticalEndIcon = ic(HugeGalleryVerticalEndIcon);

export const TextBoldIcon = ic(HugeTextBoldIcon);
export const TextItalicIcon = ic(HugeTextItalicIcon);
export const TextStrikethroughIcon = ic(HugeTextStrikethroughIcon);
export const TextUnderlineIcon = ic(HugeTextUnderlineIcon);
export const ParagraphIcon = ic(HugeParagraphIcon);
export const Heading02Icon = ic(HugeHeading02Icon);
export const Heading03Icon = ic(HugeHeading03Icon);
export const ListBulletIcon = ic(HugeLeftToRightListBulletIcon);
export const ListOrderedIcon = ic(HugeLeftToRightListNumberIcon);
export const BlockQuoteIcon = ic(HugeLeftToRightBlockQuoteIcon);
export const UndoIcon = ic(HugeUndoIcon);
export const RedoIcon = ic(HugeRedoIcon);

export { ActionsIcon } from "./actions-icon";
export { ShieldAlertIcon } from "./shield-alert-icon";
export { StarIcon } from "./star-icon";
