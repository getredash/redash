import { configureStore, createSlice } from "@reduxjs/toolkit";

const queryData = {
  Data: [],
};

const querySlice = createSlice({
  name: "queryData",
  initialState: queryData,
  reducers: {
    getQueryData: (state, { payload }) => {
      state.Data = payload.data;
    },
  },
});

const reducer = {
  QueryData: querySlice.reducer,
};

export const { getQueryData: getQueryAction } = querySlice.actions;

export const store = configureStore({ reducer });
