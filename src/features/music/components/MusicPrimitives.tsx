import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';

/**
 * Layout primitive: a titled section wrapper used on the music home page.
 *
 * Renders a small uppercase section heading followed by its children content.
 * Provides consistent horizontal padding (`px-6`) and vertical spacing (`py-4`).
 *
 * @param props.title - The section heading text (rendered as an `<h2>`).
 * @param props.children - Section content, typically a {@link ScrollRow}.
 */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-4">
      <h2 className="font-headline font-black uppercase tracking-widest text-xs text-foreground/40 mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

/**
 * Layout primitive: a horizontally scrollable row with hidden scrollbar.
 *
 * Uses negative margin + padding trick (`-mx-6 px-6`) so items can scroll
 * edge-to-edge while the first/last items align with the section padding.
 *
 * @param props.children - Flex-shrink-0 items (cards, avatars, etc.).
 */
export function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
      {children}
    </div>
  );
}

/**
 * Layout primitive: a square cover-art card with title and optional subtitle.
 *
 * Renders a fixed-width (36/40 on mobile/desktop) card with a bordered square
 * image, a bold title, and an optional subtitle line. Supports three interaction modes:
 * - **Link** — wraps in a Next.js `<Link>` when `href` is provided.
 * - **Button** — wraps in a `<button>` when `onClick` is provided (no `href`).
 * - **Static** — no wrapper when neither is provided.
 *
 * @param props.image - Cover art URL.
 * @param props.title - Primary label (truncated to one line).
 * @param props.subtitle - Secondary label, e.g. artist name (optional).
 * @param props.href - Navigation target (makes the card a link).
 * @param props.onClick - Click handler (makes the card a button if no `href`).
 */
export const Card = memo(function Card({
  image,
  title,
  subtitle,
  href,
  onClick,
}: {
  image: string;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex-shrink-0 w-36 md:w-40 cursor-pointer">
      <div className="aspect-square bg-card border-[3px] border-border overflow-hidden relative">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(min-width: 768px) 160px, 144px"
          className="object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      <p className="font-headline font-bold text-[10px] uppercase tracking-wider mt-2 truncate">
        {title}
      </p>
      {subtitle && (
        <p className="text-foreground/30 text-[10px] font-headline uppercase tracking-wider truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return inner;
});
