
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCandidate, deleteCandidate } from "./actions";

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
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_240px_auto]">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, email or application ID..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                />

                <select
                    value={college}
                    onChange={(event) => setCollege(event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                    <option value="">All colleges</option>
                    {colleges.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={() => {
                        setSearch("");
                        setCollege("");
                    }}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                    Clear filters
                </button>
            </div>

            {/* Feedback */}
            {message && (
                <div
                    role="status"
                    className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700"
                >
                    {message}
                </div>
            )}

            {/* Candidate Count */}
            <div className="mb-3 text-sm text-gray-600">
                Showing <strong>{filteredCandidates.length}</strong> of{" "}
                <strong>{candidates.length}</strong> candidates
            </div>

            {/* Candidate Table */}
            {filteredCandidates.length > 0 ? (
                <div className="overflow-x-auto rounded border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-surface">
                            <tr>
                                {[
                                    "Name",
                                    "Email",
                                    "Application ID",
                                    "College",
                                    "Registered",
                                    "Actions",
                                ].map((heading) => (
                                    <th
                                        key={heading}
                                        className="px-4 py-3 text-left text-sm font-medium text-gray-700"
                                    >
                                        {heading}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredCandidates.map((candidate) => (
                                <tr key={candidate.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-800">
                                        {candidate.name}
                                    </td>

                                    <td className="px-4 py-3 text-sm text-gray-800">
                                        {candidate.email}
                                    </td>

                                    <td className="px-4 py-3 text-sm text-gray-800">
                                        {candidate.applicationId}
                                    </td>

                                    <td className="px-4 py-3 text-sm text-gray-800">
                                        {candidate.college}
                                    </td>

                                    <td className="px-4 py-3 text-sm text-gray-800">
                                        {candidate.registered}
                                    </td>

                                    <td className="px-4 py-3">
                                        <div className="flex gap-3">
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
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                            >
                                                {editingId === candidate.id ? "Close" : "Edit"}
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isPending}
                                                onClick={() =>
                                                    handleDelete(candidate.id, candidate.name)
                                                }
                                                className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                                            >
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
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="font-medium text-gray-700">
                        No matching candidates found.
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                        Try changing your search or clearing the filters.
                    </p>
                </div>
            )}

            {/* Edit Candidate Form */}
            {editingId && (
                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-5">
                    {(() => {
                        const candidate = candidates.find(
                            (item) => item.id === editingId
                        );

                        if (!candidate) return null;

                        return (
                            <>
                                <h3 className="mb-4 text-lg font-semibold text-gray-800">
                                    Edit Candidate
                                </h3>

                                <form
                                    action={(formData) =>
                                        handleUpdate(candidate.id, formData)
                                    }
                                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                                >
                                    <div>
                                        <label
                                            htmlFor="edit-name"
                                            className="mb-1 block text-sm font-medium"
                                        >
                                            Full Name *
                                        </label>

                                        <input
                                            id="edit-name"
                                            name="name"
                                            required
                                            maxLength={100}
                                            defaultValue={candidate.name}
                                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-email"
                                            className="mb-1 block text-sm font-medium"
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
                                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-applicationId"
                                            className="mb-1 block text-sm font-medium"
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
                                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-college"
                                            className="mb-1 block text-sm font-medium"
                                        >
                                            College
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
                                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                                        />
                                    </div>

                                    <div className="flex gap-3 md:col-span-2">
                                        <button
                                            type="submit"
                                            disabled={isPending}
                                            className="rounded-md bg-primary px-5 py-2 text-white hover:opacity-90 disabled:opacity-50"
                                        >
                                            {isPending ? "Saving..." : "Save Changes"}
                                        </button>

                                        <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => setEditingId(null)}
                                            className="rounded-md border border-gray-300 px-5 py-2 hover:bg-gray-100"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </>
                        );
                    })()}
                </div>
            )}

            {isPending && (
                <p className="mt-3 text-sm text-gray-500" aria-live="polite">
                    Processing your request...
                </p>
            )}
        </div>
    );
}
