"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import { X } from "lucide-react";
import styles from "@/components/ui/Dialog.module.css";
export function ConfirmDialog({open,onOpenChange,title,description,label="Confirm",busy=false,onConfirm}:{open:boolean;onOpenChange:(open:boolean)=>void;title:string;description:string;label?:string;busy?:boolean;onConfirm:()=>void}) {
  const returnFocus=useRef<HTMLElement|null>(null);
  return <Dialog.Root open={open} onOpenChange={value=>{if(!busy)onOpenChange(value);}}><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={styles.content} onOpenAutoFocus={()=>{returnFocus.current=document.activeElement as HTMLElement;}} onCloseAutoFocus={event=>{event.preventDefault();returnFocus.current?.focus();}} onEscapeKeyDown={event=>{if(busy)event.preventDefault();}} onPointerDownOutside={event=>{if(busy)event.preventDefault();}}><Dialog.Title className={styles.title}>{title}</Dialog.Title><Dialog.Description className={styles.description}>{description}</Dialog.Description><div className={styles.actions}><Dialog.Close asChild><button className="button secondary" disabled={busy}>Cancel</button></Dialog.Close><button className="button" disabled={busy} onClick={onConfirm}>{busy?"Working…":label}</button></div><Dialog.Close asChild><button className={styles.close} aria-label="Close confirmation" disabled={busy}><X size={18}/></button></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
