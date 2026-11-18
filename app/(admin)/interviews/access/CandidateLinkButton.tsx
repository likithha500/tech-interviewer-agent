
"use client";

import { useState, useTransition } from "react";
import { generateCandidateAccessLink } from "./actions";

export default function CandidateLinkButton({
    interviewId,
}: {
    interviewId: string;
}) {
    const [isPending, startTransition] = useTransition();
    const [link, setLink] = useState("");
    const [message, setMessage] = useState("");

    function generateLink() {
        setMessage("");
        setLink("");

        startTransition(async () => {
            const result = await generateCandidateAccessLink(interviewId);

            if (!result.success || !result.path) {
                setMessage(result.error ?? "Could not generate link.");
                return;
            }

            setLink(`${window.location.origin}${result.path}`);
            setMessage("Link generated. Copy and share it securely.");
        });
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(link);
            setMessage("Link copied successfully.");
        } catch {
            setMessage("Could not copy automatically. Select and copy the link.");
        }
    }

    return (
        <div className="min-w-64 space-y-2">
            <button
                type="button"
                onClick={generateLink}
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
                {isPending ? "Generating..." : "Generate Candidate Link"}
            </button>

            {link && (
                <div className="space-y-2">
                    <input
                        readOnly
                        value={link}
                        aria-label="Candidate interview link"
                        className="w-full rounded border border-gray-300 bg-gray-50 px-2 py-2 text-xs text-gray-700"
                        onFocus={(event) => event.currentTarget.select()}
                    />

                    <button
                        type="button"
                        onClick={copyLink}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Copy Link
                    </button>
                </div>
            )}

            {message && (
                <p className="text-xs text-gray-600" aria-live="polite">
                    {message}
                </p>
            )}
        </div>
    );
}
