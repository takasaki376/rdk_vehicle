import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
// userのボタンクリックやタイピングをシミュレーションする
import userEvent from "@testing-library/user-event";
// モック　Mock Service Worker
import { rest } from "msw";
import { setupServer } from "msw/node";
// redux のテスト用
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
// テスト対象のスライス、コンポーネント
import authReducer from "../features/authSlice";
import vehicleReducer from "../features/vehicleSlice";
import MainPage from "../components/MainPage";

// =============================
// モックサーバ用のuseHistory
// =============================
// useHistoryのモック
const mockHistoryPush = jest.fn();

// useHistoryをテスト用に上書きする
// この定義があることで、useHistoryが使用されずに、mockHistoryPushへ格納される
jest.mock("react-router-dom", () => ({
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

// =============================
// 疑似的なAPIのエンドポイント
// =============================
const handlers = [
  rest.get("http://localhost:8000/api/profile/", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ id: 1, username: "test user" }));
  }),
  // MainPageから直接実行されないが、子コンポーネントで使用されるため、定義しておく
  rest.get("http://localhost:8000/api/segments/", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json([]));
  }),
  rest.get("http://localhost:8000/api/brands/", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json([]));
  }),
  rest.get("http://localhost:8000/api/vehicles/", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json([]));
  }),
];

// =============================
// テスト用の設定
// =============================
// モックサーバウォーカー（サーバを作っておく）
const server = setupServer(...handlers);
//最初に１回だけ実行される
beforeAll(() => {
  server.listen();
});
// 各テスト毎に実行される。テスト間で不具合が発生しないようにする
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
// 最後に１回実行される
afterAll(() => {
  server.close();
});

// =============================
// テストケース毎の記述
// =============================
describe("MainPage Component Test Cases", () => {
  // テスト用のストア
  let store;
  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
        vehicle: vehicleReducer,
      },
    });
  });
  // **************************************************************
  // テストケース１　コンポーネントがレンタリングされているかを確認する
  it("1 :Should render all the elements correctly", async () => {
    render(
      <Provider store={store}>
        <MainPage />
      </Provider>
    );
    // タイトル名が定義されていること
    expect(screen.getByTestId("span-title")).toBeTruthy();
    // ログアウトボタンが定義されていること
    expect(screen.getByTestId("btn-logout")).toBeTruthy();
  });
  // **************************************************************
  // テストケース２　ログアウトボタン押下でログイン画面に戻る事を確認する
  it("2 :Should route to Auth page when logout button pressed", async () => {
    render(
      <Provider store={store}>
        <MainPage />
      </Provider>
    );
    // ログアウトボタンクリック
    userEvent.click(screen.getByTestId("btn-logout"));
    expect(mockHistoryPush).toBeCalledWith("/");
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
  });
  // **************************************************************
  // テストケース３　ログインユーザ名が表示されている事を確認する
  it("3 :Should render logged in user name", async () => {
    render(
      <Provider store={store}>
        <MainPage />
      </Provider>
    );
    expect(screen.queryByText("test user")).toBeNull();
    expect(await screen.findByText("test user")).toBeInTheDocument();
  });
});
