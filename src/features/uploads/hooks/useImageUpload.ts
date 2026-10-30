"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { uploadsApi } from "../api/uploads-api";
import { setUpload } from "../model/upload-slice";
import { imageFileError, transferImage } from "../lib/upload-file";
import { useAppDispatch } from "@/store/hooks";
import { errorMessage } from "@/lib/errors";
import type { MediaRecord } from "../model/schema";

type Receipt = { id: string; name: string };
type Phase = "idle" | "signing" | "uploading" | "verifying";
const subscribeHydration = () => () => {};

export function useImageUpload() {
  const toastId = useId();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const dispatch = useAppDispatch();
  const [sign] = uploadsApi.useSignUploadMutation();
  const [complete] = uploadsApi.useCompleteUploadMutation();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewResource = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [completedMedia, setCompletedMedia] = useState<MediaRecord | null>(
    null,
  );
  const controller = useRef<AbortController | null>(null);
  const request = useRef<{ abort: () => void } | null>(null);
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      request.current?.abort();
      toast.dismiss(toastId);
      if (previewResource.current) URL.revokeObjectURL(previewResource.current);
    };
  }, [toastId]);

  function chooseFile(next: File | null) {
    if (active.current) return;
    setFile(next);
    if (previewResource.current) URL.revokeObjectURL(previewResource.current);
    const url = next && !imageFileError(next) ? URL.createObjectURL(next) : null;
    previewResource.current = url;
    setPreviewUrl(url);
    setCompletedMedia(null);
    setError(next ? imageFileError(next) || "" : "");
  }
  async function verify(current: Receipt) {
    if (!mounted.current) return;
    setPhase("verifying");
    toast.loading("Verifying your image…", { id: toastId });
    dispatch(setUpload({ ...current, status: "verifying" }));
    const operation = complete({ id: current.id });
    request.current = operation;
    const verified = await operation.unwrap();
    dispatch(setUpload({ ...current, status: "complete" }));
    if (!mounted.current) return;
    setCompletedMedia(verified);
    setReceipt(null);
    setFile(null);
    setInputKey((key) => key + 1);
    toast.success("Image uploaded and verified", { id: toastId });
    return verified;
  }
  async function upload() {
    if (active.current || !file || receipt) return;
    const validation = imageFileError(file);
    if (validation) {
      setError(validation);
      return;
    }
    active.current = true;
    setPhase("signing");
    toast.loading("Preparing your image upload…", { id: toastId });
    setError("");
    const transfer = new AbortController();
    controller.current = transfer;
    let current: Receipt | null = null;
    let transferred = false;
    try {
      const operation = sign({
        name: file.name,
        bytes: file.size,
        mime: file.type,
      });
      request.current = operation;
      const signature = await operation.unwrap();
      current = { id: signature.id, name: file.name };
      dispatch(setUpload({ ...current, status: "uploading" }));
      if (mounted.current) setPhase("uploading");
      toast.loading("Transferring your image…", { id: toastId });
      await transferImage(file, signature, transfer.signal);
      transferred = true;
      if (mounted.current) setReceipt(current);
      return await verify(current);
    } catch (failure) {
      if (current) dispatch(setUpload({ ...current, status: "error" }));
      if (mounted.current) {
        const message = transfer.signal.aborted
          ? "Transfer cancelled. You can try again."
          : transferred
            ? "The image transferred, but verification didn’t finish. Retry verification below."
            : errorMessage(failure);
        setError(message);
        toast.error(message, { id: toastId });
      }
    } finally {
      active.current = false;
      request.current = null;
      controller.current = null;
      if (mounted.current) setPhase("idle");
    }
  }
  async function retryVerification() {
    if (active.current || !receipt) return;
    active.current = true;
    setError("");
    try {
      return await verify(receipt);
    } catch (failure) {
      dispatch(setUpload({ ...receipt, status: "error" }));
      if (mounted.current) setError(errorMessage(failure));
      toast.error(errorMessage(failure), { id: toastId });
    } finally {
      active.current = false;
      request.current = null;
      if (mounted.current) setPhase("idle");
    }
  }
  function cancelTransfer() {
    if (phase === "verifying") return;
    controller.current?.abort();
    request.current?.abort();
  }
  function useAnotherImage() {
    if (active.current) return;
    setReceipt(null);
    setCompletedMedia(null);
    setFile(null);
    if (previewResource.current) URL.revokeObjectURL(previewResource.current);
    previewResource.current = null;
    setPreviewUrl(null);
    setError("");
    setInputKey((key) => key + 1);
  }
  const canUpload =
    Boolean(file && !imageFileError(file)) && phase === "idle" && !receipt;
  return {
    hydrated,
    file,
    previewUrl,
    phase,
    error,
    receipt,
    inputKey,
    completedMedia,
    canUpload,
    busy: phase !== "idle",
    chooseFile,
    upload,
    retryVerification,
    cancelTransfer,
    useAnotherImage,
  };
}
export type ImageUploadController = ReturnType<typeof useImageUpload>;
