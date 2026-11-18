
"use client";

import { useMemo, useState } from "react";

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
    const [search, setSearch] = useState("");
    const [college, setCollege] = useState("");

    const colleges = useMemo(() => {
        return Array.from(
            new Set(
                candidates
                    .map((candidate) => candidate.college)
                    .filter((value) => value && value !== "—")
            )
        ).sort();
    }, [candidates]);

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

    return (
        <div>
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

            <div className="mb-3 text-sm text-gray-600">
                Showing <strong>{filteredCandidates.length}</strong> of{" "}
                <strong>{candidates.length}</strong> candidates
            </div>

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
        </div>
    );
}
