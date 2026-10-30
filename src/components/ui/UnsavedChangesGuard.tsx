"use client";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
export function UnsavedChangesGuard({dirty}:{dirty:boolean}) {
  const [destination,setDestination]=useState<string|null>(null);
  const [pendingAction,setPendingAction]=useState(false);
  const actionButton=useRef<HTMLButtonElement|null>(null);
  const allowNavigation=useRef(false);
  useEffect(()=>{
    if (!dirty) return;
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(!allowNavigation.current){event.preventDefault();event.returnValue="";}};
    const navigate=(event:MouseEvent)=>{
      if(allowNavigation.current)return;
      const button=(event.target as HTMLElement).closest<HTMLButtonElement>("button[data-leaves-workspace]");
      if(button){event.preventDefault();event.stopPropagation();actionButton.current=button;setPendingAction(true);return;}
      const link=(event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target==="_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();event.stopPropagation();setDestination(link.href);
    };
    window.addEventListener("beforeunload",beforeUnload);
    document.addEventListener("click",navigate,true);
    return ()=>{window.removeEventListener("beforeunload",beforeUnload);document.removeEventListener("click",navigate,true);};
  },[dirty]);
  return <ConfirmDialog open={Boolean(destination)||pendingAction} onOpenChange={open=>{if(!open){setDestination(null);setPendingAction(false);}}} title="Leave unsaved changes?" description="Your latest edits haven’t been saved. Leaving this page will discard them." label="Discard and leave" onConfirm={()=>{allowNavigation.current=true;if(destination)window.location.assign(destination);else actionButton.current?.click();}}/>;
}
