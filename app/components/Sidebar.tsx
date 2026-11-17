import Link from 'next/link';
import { Home, Users, Briefcase, List, BarChart2 } from 'lucide-react';

export default function Sidebar() {
  const menu = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/candidates', label: 'Candidates', icon: Users },
    { href: '/interviews', label: 'Interviews', icon: Briefcase },
    { href: '/questions', label: 'Question Bank', icon: List },
    { href: '/reports', label: 'Reports', icon: BarChart2 },
  ];

  return (
    <nav className="w-64 bg-surface min-h-full p-4">
      <ul className="space-y-2">
        {menu.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-2 p-2 rounded hover:bg-primary/10 text-gray-800"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
