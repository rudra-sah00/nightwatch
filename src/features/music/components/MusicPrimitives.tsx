import Link from 'next/link';

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

export function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
      {children}
    </div>
  );
}

export function Card({
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
      <div className="aspect-square bg-card border-[3px] border-border overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
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
}
