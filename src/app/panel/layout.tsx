import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { signOut } from "./actions";

const NAV_ITEMS = [
  { href: "/panel", label: "Pulpit" },
  { href: "/panel/okresy", label: "Okresy ewidencji" },
  { href: "/panel/raporty", label: "Raporty" },
  { href: "/panel/miejsca", label: "Miejsca" },
  { href: "/panel/pojazd", label: "Pojazd" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <nav className="flex flex-wrap gap-4">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="font-medium text-gray-700 hover:text-blue-600">
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={signOut}>
            <button type="submit" className="text-gray-500 underline">
              Wyloguj
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
    </div>
  );
}
