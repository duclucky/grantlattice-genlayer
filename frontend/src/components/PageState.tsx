import type { ReactNode } from "react";

interface PageStateProps {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "danger";
}

export function PageState({ title, children, tone = "neutral" }: PageStateProps) {
  return (
    <section className={`page-state page-state-${tone}`} aria-live="polite">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
