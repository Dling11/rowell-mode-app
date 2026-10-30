import { configureStore } from "@reduxjs/toolkit";
import { adminApi } from "@/store/api";
import uploadsReducer from "@/features/uploads/model/upload-slice";
export const makeStore=()=>configureStore({
  reducer:{[adminApi.reducerPath]:adminApi.reducer,uploads:uploadsReducer},
  middleware:getDefaultMiddleware=>getDefaultMiddleware().concat(adminApi.middleware),
  devTools:process.env.NODE_ENV!=="production",
});
export type AppStore=ReturnType<typeof makeStore>;
export type RootState=ReturnType<AppStore["getState"]>;
export type AppDispatch=AppStore["dispatch"];
