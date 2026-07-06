import type { SVGProps } from "react";
import { cn } from "@/lib/cn";

/*
 * Aurora spot illustrations — geometric line-art for empty states.
 * Thin strokes in semantic tokens on a gradient-glow disc, matching lucide's
 * stroke language. Decorative only: every illustration is aria-hidden; the
 * EmptyState title/description carry the meaning.
 */

type IllustrationProps = SVGProps<SVGSVGElement> & { className?: string };

function Disc({ className, children, ...props }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={96}
      height={96}
      fill="none"
      aria-hidden="true"
      className={cn("drop-shadow-[0_0_18px_var(--accent-subtle)]", className)}
      {...props}
    >
      <circle cx="48" cy="48" r="46" fill="var(--accent-subtle)" opacity="0.5" />
      <circle cx="48" cy="48" r="46" stroke="var(--glass-border)" />
      {children}
    </svg>
  );
}

/** Stacked repository cards with a readiness ring — "no repositories yet". */
export function ReposIllustration(props: IllustrationProps) {
  return (
    <Disc {...props}>
      <rect
        x="26"
        y="38"
        width="34"
        height="24"
        rx="4"
        stroke="var(--text-muted)"
        strokeWidth="1.5"
      />
      <rect
        x="32"
        y="32"
        width="34"
        height="24"
        rx="4"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        fill="var(--bg-surface)"
      />
      <path
        d="M38 40h14M38 46h20"
        stroke="var(--border-default)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="63"
        cy="60"
        r="10"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeDasharray="47 16"
        strokeLinecap="round"
      />
    </Disc>
  );
}

/** Two columns with a balance mark — "nothing selected to compare". */
export function CompareIllustration(props: IllustrationProps) {
  return (
    <Disc {...props}>
      <rect
        x="28"
        y="30"
        width="16"
        height="36"
        rx="4"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
      />
      <rect
        x="52"
        y="38"
        width="16"
        height="28"
        rx="4"
        stroke="var(--text-muted)"
        strokeWidth="1.5"
      />
      <path
        d="M36 24v-2M60 32v-2"
        stroke="var(--border-default)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M42 72h12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </Disc>
  );
}

/** A featured card with a star orbit — "portfolio has nothing featured". */
export function PortfolioIllustration(props: IllustrationProps) {
  return (
    <Disc {...props}>
      <rect
        x="30"
        y="34"
        width="36"
        height="26"
        rx="4"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
      />
      <path
        d="M36 42h16M36 48h24"
        stroke="var(--border-default)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M62 28l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6L62 28z"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M30 68c10-6 26-6 36 0"
        stroke="var(--border-default)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 5"
      />
    </Disc>
  );
}

/** A signpost ring with a broken path — "page not found / invalid repository". */
export function NotFoundIllustration(props: IllustrationProps) {
  return (
    <Disc {...props}>
      <circle
        cx="48"
        cy="46"
        r="16"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        strokeDasharray="70 12"
        strokeLinecap="round"
      />
      <path d="M48 38v10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="54" r="1.6" fill="var(--accent)" />
      <path
        d="M30 70h36"
        stroke="var(--border-default)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 6"
      />
    </Disc>
  );
}
