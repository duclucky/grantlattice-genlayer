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

export function StatusBadge({
  status,
  effective = status === "ACTIVE",
}: {
  status: GrantStatus;
  effective?: boolean;
}) {
  const inactiveThroughLineage = status === "ACTIVE" && !effective;
  const Icon = status === "ACTIVE" && effective
    ? CheckCircleIcon
    : status === "PROPOSED"
      ? ClockIcon
      : status === "RETRYABLE"
        ? WarningCircleIcon
        : ProhibitIcon;

  return (
    <span className={`status-badge status-${inactiveThroughLineage ? "inactive" : status.toLowerCase()}`}>
      <Icon aria-hidden="true" size={16} weight="fill" />
      {inactiveThroughLineage ? "Inactive through lineage" : copy[status]}
    </span>
  );
}
