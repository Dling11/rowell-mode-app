const key = "rowell-mode:owner-notice";
export function queueSignInNotice() {
  try { window.sessionStorage.setItem(key, "signed-in"); } catch { /* The welcome entrance remains the sign-in confirmation. */ }
}
export function queueSignOutNotice() {
  try { window.sessionStorage.setItem(key, "signed-out"); } catch { /* The fresh login page still confirms that the workspace was closed. */ }
}
export function consumeOwnerNotice() {
  try {
    const value = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    return value === "signed-in" || value === "signed-out" ? value : null;
  } catch { return null; }
}
