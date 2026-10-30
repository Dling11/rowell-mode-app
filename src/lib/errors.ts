export function errorMessage(error:unknown) {
  if (error && typeof error==="object" && "data" in error) {
    const data=error.data;
    if (data && typeof data==="object" && "error" in data && typeof data.error==="string") return data.error;
  }
  return "That didn’t go through. Please try again.";
}
