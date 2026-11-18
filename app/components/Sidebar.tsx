
import Link from "next/link";
import {
  Home,
  Users,
  Briefcase,
  List,
  BarChart2,
} from "lucide-react";

export default function Sidebar() {
  const menu = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/candidates", label: "Candidates", icon: Users },
    { href: "/interviews", label: "Interviews", icon: Briefcase },
    { href: "/questions", label: "Question Bank", icon: List },
    { href: "/reports", label: "Reports", icon: BarChart2 },
  ];

  return (
    <nav className="min-h-screen w-64 bg-surface p-4">
      <ul className="space-y-2">
        {menu.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              prefetch={false}
              className="flex items-center gap-2 rounded p-3 text-gray-800 hover:bg-primary/10"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
