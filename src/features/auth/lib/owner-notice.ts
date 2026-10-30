const key = "rowell-mode:owner-notice";
export function queueSignInNotice() {
  try { window.sessionStorage.setItem(key, "signed-in"); } catch { /* The welcome entrance remains the sign-in confirmation. */ }
}
export function consumeOwnerNotice() {
  try {
    const value = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    return value === "signed-in" ? value : null;
  } catch { return null; }
}
