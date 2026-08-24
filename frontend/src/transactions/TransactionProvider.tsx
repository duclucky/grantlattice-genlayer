import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type {
  TransactionStage,
  WriteRequest,
} from "../domain/types";

export interface TransactionActivity {
  id: string;
  label: string;
  grantId: string;
  hash: string;
  stage: TransactionStage;
}

interface TransactionContextValue {
  activities: TransactionActivity[];
  run(
    label: string,
    grantId: string,
    createRequest: () => Promise<WriteRequest>,
  ): Promise<TransactionStage>;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: PropsWithChildren) {
  const [activities, setActivities] = useState<TransactionActivity[]>([]);

  const run = useCallback<TransactionContextValue["run"]>(
    async (label, grantId, createRequest) => {
      const request = await createRequest();
      const id = `${request.hash}:${grantId}`;
      const submitted: TransactionActivity = {
        id,
        label,
        grantId,
        hash: request.hash,
        stage: "SUBMITTED",
      };
      setActivities((current) => [submitted, ...current]);

      let stage: TransactionStage;
      try {
        stage = await request.wait((nextStage) => {
          setActivities((current) =>
            current.map((activity) =>
              activity.id === id ? { ...activity, stage: nextStage } : activity,
            ),
          );
        });
      } catch {
        stage = "FAILED";
      }
      setActivities((current) =>
        current.map((activity) =>
          activity.id === id ? { ...activity, stage } : activity,
        ),
      );
      return stage;
    },
    [],
  );

  const value = useMemo(() => ({ activities, run }), [activities, run]);
  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions(): TransactionContextValue {
  const value = useContext(TransactionContext);
  if (!value) {
    throw new Error("useTransactions must be used inside TransactionProvider");
  }
  return value;
}
