import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const apiUrl = "http://localhost:8000/";

export const fetchAsyncLogin = createAsyncThunk("login/post", async (auth) => {
  const res = await axios.post(`${apiUrl}api/auth/`, auth, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  // .catch((error) => {
  //   throw error;
  // })
  return res.data;
});

export const fetchAsyncRegister = createAsyncThunk(
  "register/post",
  async (auth) => {
    const res = await axios.post(`${apiUrl}api/create/`, auth, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  }
);

export const fetchAsyncGetProfile = createAsyncThunk(
  "profile/get",
  async () => {
    const res = await axios.get(`${apiUrl}api/profile/`, {
      headers: {
        Authorization: `token ${localStorage.token}`,
      },
    });
    return res.data;
  }
);

export const authSlice = createSlice({
  name: "auth",
  initialState: {
    profile: {
      id: 0,
      username: "",
    },
    error: { name: "", message: "", code: "", stack: "" },
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchAsyncLogin.fulfilled, (state, action) => {
      localStorage.setItem("token", action.payload.token);
    });
    // ログインの異常終了
    builder.addCase(fetchAsyncLogin.rejected, (state, action) => {
      return {
        ...state,
        error: action.error,
      };
    });

    builder.addCase(fetchAsyncGetProfile.fulfilled, (state, action) => {
      return {
        ...state,
        profile: action.payload,
      };
    });
  },
});

export const selectProfile = (state) => state.auth.profile;
export const selectError = (state) => state.auth.error;

export default authSlice.reducer;
