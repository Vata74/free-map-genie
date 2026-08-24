import { createSlice } from "@reduxjs/toolkit";
import { createAppAsyncThunk } from "../../typed";
import { toastr } from "react-redux-toastr";

export interface CloudUser {
  uid: string;
  email: string | null;
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
    toastr.error("Error", "No se pudo crear la cuenta");
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
    toastr.error("Error", "No se pudo iniciar sesión");
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
    toastr.error("Error", "No se pudo iniciar sesión con Google");
    logger.error("Failed to sign in with Google", e);
    return undefined;
  }
});

export const cloudSignOutAsync = createAppAsyncThunk<void, void>(
  "cloud/signOut",
  async (_, { extra: { services } }) => {
    try {
      await services.backend.cloudSignOut();
    } catch (e) {
      toastr.error("Error", "No se pudo cerrar sesión");
      logger.error("Failed to sign out", e);
    }
  }
);

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
      .addCase(cloudSignOutAsync.fulfilled, (state) => {
        state.user = null;
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
