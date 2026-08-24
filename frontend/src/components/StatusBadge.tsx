import {
  CheckCircleIcon,
  ClockIcon,
  ProhibitIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import type { GrantStatus } from "../domain/types";

const copy: Record<GrantStatus, string> = {
  ACTIVE: "Active authority",
  PROPOSED: "Awaiting review",
  RETRYABLE: "Needs another review",
  DENIED: "Broader than parent",
  REVOKED: "Revoked",
};

export function StatusBadge({ status }: { status: GrantStatus }) {
  const Icon = status === "ACTIVE"
    ? CheckCircleIcon
    : status === "PROPOSED"
      ? ClockIcon
      : status === "RETRYABLE"
        ? WarningCircleIcon
        : ProhibitIcon;

  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <Icon aria-hidden="true" size={16} weight="fill" />
      {copy[status]}
    </span>
  );
}
