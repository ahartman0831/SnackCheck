"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type UploadState =
  "idle" | "selected" | "creating" | "uploading" | "sanitizing" | "ready" | "error";

export function IngredientPhotoUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function choose(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    setState(next ? "selected" : "idle");
    setError(null);
  }

  async function cancelSubmission() {
    if (submissionId) {
      await fetch(`/api/v1/submissions/${submissionId}`, { method: "DELETE" }).catch(
        () => undefined,
      );
    }
    setSubmissionId(null);
    choose(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function upload() {
    if (!file) return;
    setError(null);
    try {
      setState("creating");
      const created = await fetch("/api/v1/uploads/ingredient-label", {
        method: "POST",
      });
      const createdJson = await created.json();
      if (!created.ok || !createdJson.data?.uploadUrl || !createdJson.data?.path) {
        throw new Error(createdJson.error?.message ?? "Photo upload is unavailable.");
      }

      const nextSubmissionId = createdJson.data.submissionId as string;
      const path = createdJson.data.path as string;
      setSubmissionId(nextSubmissionId);
      setState("uploading");
      const uploaded = await fetch(createdJson.data.uploadUrl as string, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploaded.ok) throw new Error("The photo could not be uploaded.");

      setState("sanitizing");
      const completed = await fetch(
        `/api/v1/submissions/${nextSubmissionId}/upload-complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        },
      );
      const completedJson = await completed.json();
      if (!completed.ok) {
        throw new Error(
          completedJson.error?.message ?? "The photo could not be processed safely.",
        );
      }
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Photo upload failed.");
      setState("error");
    }
  }

  const busy = state === "creating" || state === "uploading" || state === "sanitizing";

  return (
    <section className="border-border bg-surface flex flex-col gap-4 rounded-[24px] border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Photograph the ingredient panel</h2>
        <p className="text-muted text-sm">
          Your original photo is private and removed after safety processing. A
          metadata-free copy is retained for up to seven days. No AI reads or evaluates
          the photo in this phase.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
      />

      {previewUrl ? (
        <Image
          src={previewUrl}
          alt="Ingredient photo preview"
          width={640}
          height={480}
          unoptimized
          className="max-h-96 w-full rounded-[18px] object-contain"
        />
      ) : null}

      {busy ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          <progress className="w-full" />
          <p className="text-muted text-sm">
            {state === "creating"
              ? "Preparing a private upload…"
              : state === "uploading"
                ? "Uploading the photo…"
                : "Removing metadata and preparing a safe copy…"}
          </p>
        </div>
      ) : null}

      {state === "ready" ? (
        <p role="status" className="text-pass text-sm font-medium">
          Photo safely prepared. It has not been evaluated or sent to an AI provider.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-fail text-sm">
          {error} You can retake the photo or paste the ingredient list below.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!file ? (
          <Button onClick={() => inputRef.current?.click()}>Take or choose photo</Button>
        ) : null}
        {file && state !== "ready" ? (
          <Button onClick={upload} disabled={busy}>
            Upload photo privately
          </Button>
        ) : null}
        {file ? (
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            Retake
          </Button>
        ) : null}
        {file ? (
          <Button variant="ghost" onClick={cancelSubmission} disabled={busy}>
            Cancel photo
          </Button>
        ) : null}
      </div>
    </section>
  );
}
