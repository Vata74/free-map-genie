import { createSlice } from "@reduxjs/toolkit";
import { createAppAsyncThunk } from "../../typed";
import { toastr } from "react-redux-toastr";

export interface CloudUser {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
}

export interface CloudState {
  configured: boolean;
  loading: boolean;
  user: CloudUser | null;
}

const initialState: CloudState = {
  configured: false,
  loading: true,
  user: null,
};

export const fetchCloudStatusAsync = createAppAsyncThunk<
  { configured: boolean; user: CloudUser | null },
  void
>("cloud/fetchStatus", async (_, { extra: { services } }) => {
  try {
    const configured = await services.backend.cloudIsConfigured();
    if (!configured) return { configured, user: null };

    const user = await services.backend.cloudGetUser();
    return { configured, user };
  } catch (e) {
    logger.error("Failed to fetch cloud sync status", e);
    return { configured: false, user: null };
  }
});

export const cloudSignUpAsync = createAppAsyncThunk<
  CloudUser | undefined,
  { email: string; password: string }
>("cloud/signUp", async ({ email, password }, { extra: { services } }) => {
  try {
    return await services.backend.cloudSignUp(email, password);
  } catch (e) {
    toastr.error("Error", "Failed to create account");
    logger.error("Failed to sign up", e);
    return undefined;
  }
});

export const cloudSignInAsync = createAppAsyncThunk<
  CloudUser | undefined,
  { email: string; password: string }
>("cloud/signIn", async ({ email, password }, { extra: { services } }) => {
  try {
    return await services.backend.cloudSignIn(email, password);
  } catch (e) {
    toastr.error("Error", "Failed to sign in");
    logger.error("Failed to sign in", e);
    return undefined;
  }
});

export const cloudSignInWithGoogleAsync = createAppAsyncThunk<
  CloudUser | undefined,
  void
>("cloud/signInWithGoogle", async (_, { extra: { services } }) => {
  try {
    return await services.backend.cloudSignInWithGoogle();
  } catch (e) {
    toastr.error("Error", "Failed to sign in with Google");
    logger.error("Failed to sign in with Google", e);
    return undefined;
  }
});

export const cloudSignOutAsync = createAppAsyncThunk<
  CloudUser | undefined,
  void
>("cloud/signOut", async (_, { extra: { services } }) => {
  try {
    return (await services.backend.cloudSignOut()) ?? undefined;
  } catch (e) {
    toastr.error("Error", "Failed to sign out");
    logger.error("Failed to sign out", e);
    return undefined;
  }
});

export const cloudSlice = createSlice({
  name: "cloud",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCloudStatusAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCloudStatusAsync.fulfilled, (state, action) => {
        state.configured = action.payload.configured;
        state.user = action.payload.user;
        state.loading = false;
      })
      .addCase(cloudSignUpAsync.fulfilled, (state, action) => {
        if (action.payload) state.user = action.payload;
      })
      .addCase(cloudSignInAsync.fulfilled, (state, action) => {
        if (action.payload) state.user = action.payload;
      })
      .addCase(cloudSignInWithGoogleAsync.fulfilled, (state, action) => {
        if (action.payload) state.user = action.payload;
      })
      .addCase(cloudSignOutAsync.fulfilled, (state, action) => {
        state.user = action.payload ?? null;
      });
  },
  selectors: {
    selectCloudConfigured: (state) => state.configured,
    selectCloudLoading: (state) => state.loading,
    selectCloudUser: (state) => state.user,
  },
});

export const {} = cloudSlice.actions;

export const { selectCloudConfigured, selectCloudLoading, selectCloudUser } =
  cloudSlice.selectors;

export default cloudSlice.reducer;
