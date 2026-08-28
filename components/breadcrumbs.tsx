import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm font-semibold">
      <ol className="flex flex-wrap items-center gap-2 text-slate-500">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1 || !item.href;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-slate-300">
                  /
                </span>
              ) : null}
              {item.href && !isCurrent ? (
                <Link href={item.href} className="transition hover:text-[#1d4ed8]">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-[#071a33]">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
