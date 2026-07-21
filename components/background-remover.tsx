"use client";

import { Download, ImageIcon, LoaderCircle, RefreshCcw, ShieldCheck, UploadCloud } from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
type ProcessingState = "idle" | "processing" | "success" | "error";

function getValidationError(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Please upload a JPG, PNG, or WebP image.";
  if (file.size > MAX_FILE_SIZE) return "Your image must be 10 MB or smaller.";
  return null;
}

export function BackgroundRemover() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const originalUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
  }, []);

  function revokeUrl(url: string | null) {
    if (url) URL.revokeObjectURL(url);
  }

  function selectFile(selectedFile: File) {
    const validationError = getValidationError(selectedFile);
    if (validationError) {
      setState("error");
      setError(validationError);
      return;
    }

    abortControllerRef.current?.abort();
    revokeUrl(originalUrlRef.current);
    revokeUrl(resultUrlRef.current);
    const nextOriginalUrl = URL.createObjectURL(selectedFile);
    originalUrlRef.current = nextOriginalUrl;
    resultUrlRef.current = null;
    setFile(selectedFile);
    setOriginalUrl(nextOriginalUrl);
    setResultUrl(null);
    setError(null);
    setState("idle");
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) selectFile(selectedFile);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (state !== "processing" && event.dataTransfer.files[0]) selectFile(event.dataTransfer.files[0]);
  }

  async function removeBackground() {
    if (!file || state === "processing") return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setState("processing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/remove-background", { method: "POST", body: formData, signal: controller.signal });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "We could not process this image. Please try again.");
      }
      const result = await response.blob();
      if (result.type !== "image/png") throw new Error("The processing service returned an unexpected file type.");
      revokeUrl(resultUrlRef.current);
      const nextResultUrl = URL.createObjectURL(result);
      resultUrlRef.current = nextResultUrl;
      setResultUrl(nextResultUrl);
      setState("success");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        setState("idle");
        return;
      }
      setState("error");
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong. Please try again.");
    } finally {
      abortControllerRef.current = null;
    }
  }

  function reset() {
    abortControllerRef.current?.abort();
    revokeUrl(originalUrlRef.current);
    revokeUrl(resultUrlRef.current);
    originalUrlRef.current = null;
    resultUrlRef.current = null;
    setFile(null);
    setOriginalUrl(null);
    setResultUrl(null);
    setError(null);
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e0edff,transparent_32rem)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        <a className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950" href="#top">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white"><ImageIcon size={19} /></span>
          Background Remover
        </a>
        <a className="text-sm font-semibold text-slate-600 transition hover:text-blue-600" href="#how-it-works">How it works</a>
      </header>

      <section id="top" className="mx-auto max-w-6xl px-6 pb-20 pt-10 lg:px-8 lg:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">Fast, private, simple</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">Remove image backgrounds in seconds.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Upload one image, let Remove.bg handle the background, then download a transparent PNG. We do not store your images.</p>
        </div>

        <div className="mx-auto mt-10 max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/30 sm:p-6">
          {!file ? <div className={`rounded-2xl border-2 border-dashed px-6 py-16 text-center transition sm:px-12 ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50/80 hover:border-blue-300 hover:bg-blue-50/40"}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-100 text-blue-600"><UploadCloud size={28} /></span>
            <h2 className="mt-5 text-xl font-bold text-slate-900">Drop your image here</h2>
            <p className="mt-2 text-sm text-slate-500">or choose a file from your device</p>
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200">Upload image</button>
            <p className="mt-4 text-xs font-medium text-slate-400">JPG, PNG, or WebP · up to 10 MB</p>
          </div> : <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-2"><PreviewCard label="Original" imageUrl={originalUrl} /><PreviewCard label="Result" imageUrl={resultUrl} isResult state={state} /></div>
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row">
              <div className="min-w-0 text-center sm:text-left"><p className="truncate text-sm font-bold text-slate-800">{file.name}</p><p className="mt-1 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB · Your image stays out of permanent storage.</p></div>
              <div className="flex flex-wrap justify-center gap-3">{state === "success" && resultUrl ? <a href={resultUrl} download="image-without-background.png" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"><Download size={17} />Download PNG</a> : <button type="button" onClick={removeBackground} disabled={state === "processing"} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-200">{state === "processing" ? <><LoaderCircle className="animate-spin" size={17} />Removing background...</> : "Remove background"}</button>}<button type="button" onClick={reset} disabled={state === "processing"} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-slate-200"><RefreshCcw size={16} />New image</button></div>
            </div>
          </div>}
          <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleInputChange} />
          <p aria-live="polite" className={`mt-4 text-center text-sm font-medium ${error ? "text-rose-600" : "text-slate-500"}`}>{error ?? (state === "processing" ? "Your image is being processed. This usually takes a few seconds." : "")}</p>
        </div>
        <div className="mx-auto mt-6 flex max-w-5xl items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm text-slate-600"><ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={19} /><p><strong className="text-slate-800">Privacy first.</strong> Your image is sent to Remove.bg for this one-time process. This site does not save images or results.</p></div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200 bg-white"><div className="mx-auto max-w-6xl px-6 py-20 lg:px-8"><h2 className="text-center text-3xl font-black tracking-tight text-slate-950">Three simple steps</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{["Upload a JPG, PNG, or WebP image.", "We remove the background automatically.", "Download your transparent PNG."].map((text, index) => <div className="rounded-2xl border border-slate-200 p-6" key={text}><span className="grid size-9 place-items-center rounded-full bg-blue-100 text-sm font-black text-blue-700">0{index + 1}</span><p className="mt-5 text-base font-bold leading-6 text-slate-800">{text}</p></div>)}</div></div></section>
      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-slate-500 lg:px-8">Images are processed only for your request and are not stored by this site.</footer>
    </main>
  );
}

function PreviewCard({ imageUrl, isResult = false, label, state }: { imageUrl: string | null; isResult?: boolean; label: string; state?: ProcessingState }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><p className="text-sm font-bold text-slate-700">{label}</p>{isResult && state === "success" ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Ready</span> : null}</div><div className={`relative grid min-h-72 place-items-center overflow-hidden p-4 sm:min-h-96 ${isResult ? "checkerboard" : "bg-slate-50"}`}>{imageUrl ? <img src={imageUrl} alt={isResult ? "Background removed result" : "Original upload"} className="max-h-[26rem] max-w-full rounded-lg object-contain shadow-sm" /> : <div className="text-center text-sm font-medium text-slate-500">{state === "processing" ? <><LoaderCircle className="mx-auto mb-3 animate-spin text-blue-600" size={26} />Removing background...</> : "Your transparent result will appear here."}</div>}</div></div>;
}
