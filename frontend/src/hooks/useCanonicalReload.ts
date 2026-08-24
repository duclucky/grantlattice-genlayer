import { useEffect } from "react";

import type { TransactionStage } from "../domain/types";

export function useCanonicalReload(
  stage: TransactionStage,
  reload: () => void,
) {
  useEffect(() => {
    if (stage === "FINALIZED") {
      reload();
    }
  }, [reload, stage]);
}
