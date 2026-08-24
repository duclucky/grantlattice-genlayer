import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TransactionStage } from "../domain/types";
import { useCanonicalReload } from "./useCanonicalReload";

function Harness({
  stage,
  reload,
}: {
  stage: TransactionStage;
  reload: () => void;
}) {
  useCanonicalReload(stage, reload);
  return null;
}

describe("useCanonicalReload", () => {
  it("reloads canonical state only after finalization", () => {
    const reload = vi.fn();
    const view = render(<Harness reload={reload} stage="SUBMITTED" />);
    view.rerender(<Harness reload={reload} stage="ACCEPTED" />);
    expect(reload).not.toHaveBeenCalled();

    view.rerender(<Harness reload={reload} stage="FINALIZED" />);
    expect(reload).toHaveBeenCalledTimes(1);

    view.rerender(<Harness reload={reload} stage="FAILED" />);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
