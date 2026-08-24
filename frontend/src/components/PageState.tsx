import type { ReactNode } from "react";

interface PageStateProps {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "danger";
  headingLevel?: 1 | 2;
}

export function PageState({
  title,
  children,
  tone = "neutral",
  headingLevel = 2,
}: PageStateProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className={`page-state page-state-${tone}`} aria-live="polite">
      <Heading>{title}</Heading>
      <div>{children}</div>
    </section>
  );
}
