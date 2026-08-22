import { type ReactNode } from "react";

export type ApprovalCardStatus =
  | "pending"
  | "submitting"
  | "approved"
  | "rejected"
  | "changes-requested"
  | "answered";

export type ApprovalCardOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type ApprovalCardQuestion = {
  id: string;
  title: string;
  description?: ReactNode;
  options?: ApprovalCardOption[];
  multiple?: boolean;
  allowCustom?: boolean;
  customPlaceholder?: string;
  autoAdvance?: boolean;
};

export type ApprovalCardAnswer = {
  selected: string[];
  custom?: string;
};

export type ApprovalCardAnswers = Record<string, ApprovalCardAnswer>;

export type ApprovalCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  questions?: ApprovalCardQuestion[];
  status?: ApprovalCardStatus;
  answers?: ApprovalCardAnswers;
  defaultAnswers?: ApprovalCardAnswers;
  onAnswersChange?: (answers: ApprovalCardAnswers) => void;
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  onSubmit?: (answers: ApprovalCardAnswers) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onRequestChanges?: () => void;
  onDismiss?: () => void;
  approveLabel?: ReactNode;
  approveVariant?: "default" | "destructive";
  rejectLabel?: ReactNode;
  submitLabel?: ReactNode;
  result?: ReactNode;
  className?: string;
  approveDisabled?: boolean;
  rejectDisabled?: boolean;
  "data-tool-call-id"?: string;
  "data-hitl-kind"?: string;
};
