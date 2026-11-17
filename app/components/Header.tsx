import Link from 'next/link';
import { User } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-surface p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold text-primary">Tech Interviewer Admin</h1>
      <div className="flex items-center gap-2">
        <User className="w-5 h-5" />
        <span>Admin</span>
        <Link href="#" className="text-sm text-primary underline">Sign out</Link>
      </div>
    </header>
  );
}
