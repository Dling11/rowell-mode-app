import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
type UploadStatus = {
  id: string;
  name: string;
  status: "uploading" | "verifying" | "complete" | "error";
};
const uploadsSlice = createSlice({
  name: "uploads",
  initialState: [] as UploadStatus[],
  reducers: {
    setUpload: (state, action: PayloadAction<UploadStatus>) => {
      const index = state.findIndex((u) => u.id === action.payload.id);
      if (index >= 0) state[index] = action.payload;
      else {
        if (state.length >= 10) state.shift();
        state.push(action.payload);
      }
    },
    clearUploads: () => [],
  },
});
export const { setUpload, clearUploads } = uploadsSlice.actions;
export default uploadsSlice.reducer;
