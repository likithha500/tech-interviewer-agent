"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCandidate, deleteCandidate } from "./actions";
import { Search, Filter, X, Edit2, Trash2, GraduationCap, Mail, Tag, Calendar, UserCheck } from "lucide-react";

type Candidate = {
    id: string;
    name: string;
    email: string;
    applicationId: string;
    college: string;
    registered: string;
};

type Props = {
    candidates: Candidate[];
};

export default function CandidateFilters({ candidates }: Props) {
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [college, setCollege] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();

    const colleges = useMemo(
        () =>
            Array.from(
                new Set(
                    candidates
                        .map((candidate) => candidate.college)
                        .filter((value) => value && value !== "—")
                )
            ).sort(),
        [candidates]
    );

    const filteredCandidates = useMemo(() => {
        const query = search.trim().toLowerCase();

        return candidates.filter((candidate) => {
            const matchesSearch =
                !query ||
                candidate.name.toLowerCase().includes(query) ||
                candidate.email.toLowerCase().includes(query) ||
                candidate.applicationId.toLowerCase().includes(query);

            const matchesCollege =
                !college || candidate.college === college;

            return matchesSearch && matchesCollege;
        });
    }, [candidates, search, college]);

    async function handleUpdate(
        id: string,
        formData: FormData
    ) {
        setMessage("");

        startTransition(async () => {
            const result = await updateCandidate(id, formData);

            if (!result.success) {
                setMessage(result.error || "Unable to update candidate.");
                return;
            }

            setEditingId(null);
            setMessage("Candidate updated successfully.");
            router.refresh();
        });
    }

    async function handleDelete(id: string, name: string) {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${name}? This action cannot be undone.`
        );

        if (!confirmed) return;

        setMessage("");

        startTransition(async () => {
            const result = await deleteCandidate(id);

            if (!result.success) {
                setMessage(result.error || "Unable to delete candidate.");
                return;
            }

            setMessage("Candidate deleted successfully.");
            router.refresh();
        });
    }

    return (
        <div>
            {/* Search and Filters */}
            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_260px_auto]">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name, email or application ID..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
                    />
                </div>

                <div className="relative">
                    <select
                        value={college}
                        onChange={(event) => setCollege(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
                    >
                        <option value="">All Institutions</option>
                        {colleges.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                    <Filter className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setSearch("");
                        setCollege("");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                    <X className="h-3.5 w-3.5 text-slate-400" />
                    Reset
                </button>
            </div>

            {/* Feedback message */}
            {message && (
                <div
                    role="status"
                    className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/80 p-3.5 text-sm font-medium text-indigo-800 shadow-xs"
                >
                    {message}
                </div>
            )}

            {/* Candidate Count */}
            <div className="mb-4 flex items-center justify-between text-xs font-medium text-slate-500">
                <span>
                    Showing <strong className="text-slate-900">{filteredCandidates.length}</strong> of{" "}
                    <strong className="text-slate-900">{candidates.length}</strong> registered candidates
                </span>
            </div>

            {/* Candidate Table */}
            {filteredCandidates.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-200/80">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                        <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-5 py-3.5">Candidate</th>
                                <th className="px-5 py-3.5">Application ID</th>
                                <th className="px-5 py-3.5">Institution</th>
                                <th className="px-5 py-3.5">Registered</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredCandidates.map((candidate) => (
                                <tr key={candidate.id} className="transition-colors hover:bg-slate-50/70">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 font-bold text-xs text-indigo-700">
                                                {candidate.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    {candidate.name}
                                                </p>
                                                <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                                    <Mail className="h-3 w-3" />
                                                    {candidate.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                                            <Tag className="h-3 w-3 text-slate-400" />
                                            {candidate.applicationId}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4 text-slate-600">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                            <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                                            {candidate.college}
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            {candidate.registered}
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                disabled={isPending}
                                                onClick={() => {
                                                    setMessage("");
                                                    setEditingId(
                                                        editingId === candidate.id
                                                            ? null
                                                            : candidate.id
                                                    );
                                                }}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
                                            >
                                                <Edit2 className="h-3 w-3 text-slate-400" />
                                                {editingId === candidate.id ? "Close" : "Edit"}
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isPending}
                                                onClick={() =>
                                                    handleDelete(candidate.id, candidate.name)
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/40 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100/70 disabled:opacity-50"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                    <p className="font-semibold text-slate-700">
                        No matching candidates found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Try adjusting your search criteria or clear your active filters.
                    </p>
                </div>
            )}

            {/* Edit Candidate Modal / Drawer */}
            {editingId && (
                <div className="mt-6 rounded-2xl border border-indigo-100 bg-slate-50/80 p-6 shadow-xs">
                    {(() => {
                        const candidate = candidates.find(
                            (item) => item.id === editingId
                        );

                        if (!candidate) return null;

                        return (
                            <>
                                <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-3">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Edit Candidate: {candidate.name}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <form
                                    action={(formData) =>
                                        handleUpdate(candidate.id, formData)
                                    }
                                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                                >
                                    <div>
                                        <label
                                            htmlFor="edit-name"
                                            className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600"
                                        >
                                            Full Name *
                                        </label>

                                        <input
                                            id="edit-name"
                                            name="name"
                                            required
                                            maxLength={100}
                                            defaultValue={candidate.name}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-email"
                                            className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600"
                                        >
                                            Email Address *
                                        </label>

                                        <input
                                            id="edit-email"
                                            name="email"
                                            type="email"
                                            required
                                            maxLength={254}
                                            defaultValue={candidate.email}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-applicationId"
                                            className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600"
                                        >
                                            Application ID
                                        </label>

                                        <input
                                            id="edit-applicationId"
                                            name="applicationId"
                                            maxLength={50}
                                            defaultValue={
                                                candidate.applicationId === "—"
                                                    ? ""
                                                    : candidate.applicationId
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-college"
                                            className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600"
                                        >
                                            College / Institution
                                        </label>

                                        <input
                                            id="edit-college"
                                            name="college"
                                            maxLength={150}
                                            defaultValue={
                                                candidate.college === "—"
                                                    ? ""
                                                    : candidate.college
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100"
                                        />
                                    </div>

                                    <div className="flex gap-2.5 pt-2 md:col-span-2 justify-end">
                                        <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => setEditingId(null)}
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={isPending}
                                            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isPending ? "Saving changes..." : "Save Changes"}
                                        </button>
                                    </div>
                                </form>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
