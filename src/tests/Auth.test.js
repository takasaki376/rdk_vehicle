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
import Auth from "../components/Auth";

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
  // トークンを取得する（ダミーのトークンを返してくれる）
  rest.post("http://localhost:8000/api/auth/", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ token: "abc123" }));
  }),
  // ユーザを新規作成する（クリエイトが成功した時の201をステータスとして返す）
  rest.post("http://localhost:8000/api/create/", (req, res, ctx) => {
    return res(ctx.status(201));
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
// テストケースのタイトル
describe("Auth Component Test Cases", () => {
  // テスト用のストア
  let store;
  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
  });
  // **************************************************************
  // テストケース1　コンポーネントがレンタリングされているかを確認する
  it("1 :Should render all the elements correctly", async () => {
    //  Authコンポーネントの要素を取得する
    render(
      <Provider store={store}>
        <Auth />
      </Provider>
    );
    // screen.debug：screenに入っている内容を確認できる
    // screen.debug();
    // コンポーネントの表示確認
    // toBeTruthyを指定する事で、ブラウザに文字が表示されている事を確認する。
    //  ---------------------------------------------------------
    //  --- expect(+++).toBeTruthy();
    //  --- ブラウザに +++ コンポーネントが表示されている事でOKとする。
    //  ---------------------------------------------------------
    //  --- screen.getByTestId("+++")
    //  --- ブラウザにdata-testid属性が +++ で定義されたコンポーネントを取得する
    //  ---------------------------------------------------------
    //  --- screen.getByRole("+++")
    //  --- ブラウザに +++ コンポーネントを取得する
    //  ---------------------------------------------------------
    // ユーザ名ラベルが定義されていること
    expect(screen.getByTestId("label-username")).toBeTruthy();
    // パスワードラベルが定義されていること
    expect(screen.getByTestId("label-password")).toBeTruthy();
    // ユーザ名テキストボックスが定義されていること
    expect(screen.getByTestId("input-username")).toBeTruthy();
    // パスワードテキストボックスが定義されていること
    expect(screen.getByTestId("input-password")).toBeTruthy();
    // buttonがひとつの場合は、getByRoleで取得できる。
    expect(screen.getByRole("button")).toBeTruthy();
    // ログインモードの切替ボタンが定義されていること
    expect(screen.getByTestId("toggle-icon")).toBeTruthy();
  });
  // **************************************************************
  // テストケース２　トグルモードの切替
  it("2 :Should change button name by icon click", async () => {
    render(
      <Provider store={store}>
        <Auth />
      </Provider>
    );
    // button の名前が"Login"になっている事を確認する
    //  ---------------------------------------------------------
    //  --- expect(+++).toHaveTextContent("xxx");
    //  --- ブラウザに +++ コンポーネントに表示された内容がxxxである事でOKとする。
    //  ---------------------------------------------------------
    expect(screen.getByRole("button")).toHaveTextContent("Login");
    // トグルアイコンをクリックする
    userEvent.click(screen.getByTestId("toggle-icon"));
    // button の名前が"Register"になっている事を確認する
    expect(screen.getByRole("button")).toHaveTextContent("Register");
  });
  // **************************************************************
  // テストケース３　ログイン認証が正常しているとメインページに遷移している事を確認する
  it("3 :Should route to MainPage when login is successful", async () => {
    render(
      <Provider store={store}>
        <Auth />
      </Provider>
    );
    // ログインボタンをクリックする
    // Authコンポーネント内で、ログインボタンのクリックイベントが実行される。
    userEvent.click(screen.getByText("Login"));
    // ログインが正常終了した場合は、spanタグに"Successfully logged in!"と表示される事を確認する
    //  ---------------------------------------------------------
    //  --- expect(+++).toBeInTheDocument();
    //  --- ブラウザに +++ コンポーネント存在している事でOKとする。
    //  ---------------------------------------------------------
    expect(
      // awaitをつけて、findByTextを使用する事で、ブラウザに文字が表示されるまで待機する
      await screen.findByText("Successfully logged in!")
    ).toBeInTheDocument();
    // /vehicleに遷移しているか確認する
    //  ---------------------------------------------------------
    //  --- expect(+++).toBeCalledWith("xxx");
    //  ---  +++ に xxx が存在している事を確認する。
    //  ---------------------------------------------------------
    expect(mockHistoryPush).toBeCalledWith("/vehicle");
    // 画面遷移が１回だけ発生しているか確認する
    //  ---------------------------------------------------------
    //  --- expect(+++).toHaveBeenCalledTimes(xxx);
    //  --- 画面遷移の回数が xxx 回である事を確認する。
    //  ---------------------------------------------------------
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
  });
  // **************************************************************
  // テストケース４　ログイン認証に失敗している場合に、ページ遷移されない事を確認する
  it("4 :Should not route to MainPage when login is failed", async () => {
    // トークン作成時の結果をエラーになるようにする。
    // itの中に記述すると、このテストケース内だけ結果が変わる。
    server.use(
      rest.post("http://localhost:8000/api/auth/", (req, res, ctx) => {
        return res(ctx.status(400));
      })
    );
    render(
      <Provider store={store}>
        <Auth />
      </Provider>
    );
    // ログインボタンをクリックする
    // Authコンポーネント内で、ログインボタンのクリックイベントが実行される。
    userEvent.click(screen.getByText("Login"));
    // ログインが異常終了した場合は、spanタグに"Login error!"と表示される事を確認する
    expect(await screen.findByText("Login error!")).toBeInTheDocument();
    // mockHistoryPushが呼ばれていない事を確認する
    expect(mockHistoryPush).toHaveBeenCalledTimes(0);
  });
  // **************************************************************
  // テストケース５　ユーザ登録が成功した場合の動作を確認する。
  it("5 :Should output success msg when registration succeeded", async () => {
    render(
      <Provider store={store}>
        <Auth />
      </Provider>
    );
    // トグルモードを切り替える
    userEvent.click(screen.getByTestId("toggle-icon"));
    // ユーザ登録モードに切り替わっているかを確認する
    expect(screen.getByRole("button")).toHaveTextContent("Register");
    // ログインボタンをクリックする
    userEvent.click(screen.getByText("Register"));
    // ログインが正常終了した場合は、spanタグに"Successfully logged in!"と表示される事を確認する
    expect(
      await screen.findByText("Successfully logged in!")
    ).toBeInTheDocument();
    // /vehicleに遷移しているか確認する
    expect(mockHistoryPush).toBeCalledWith("/vehicle");
    // 画面遷移が１回だけ発生しているか確認する
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
  });
  // **************************************************************
  // テストケース６　ユーザ登録が失敗した場合の動作を確認する。
  it("6 :Should output error msg when registration failed", async () => {
    // ユーザ作成時の結果をエラーになるようにする。
    // itの中に記述すると、このテストケース内だけ結果が変わる。
    server.use(
      rest.post("http://localhost:8000/api/create/", (req, res, ctx) => {
        return res(ctx.status(400));
      })
    );
    render(
      <Provider store={store}>
        <Auth />
      </Provider>
    );
    // トグルモードを切り替える
    userEvent.click(screen.getByTestId("toggle-icon"));
    // ユーザ登録モードに切り替わっているかを確認する
    expect(screen.getByRole("button")).toHaveTextContent("Register");
    // ログインボタンをクリックする
    userEvent.click(screen.getByText("Register"));
    // ログインが異常終了した場合は、spanタグに"Registration error!"と表示される事を確認する
    expect(await screen.findByText("Registration error!")).toBeInTheDocument();
    // mockHistoryPushが呼ばれていない事を確認する
    expect(mockHistoryPush).toHaveBeenCalledTimes(0);
  });
  // **************************************************************
  // テストケース７　ユーザ登録が成功したが、トークン作成に失敗した場合の動作を確認する
  it("7 :Should output login error msg when regisration success but login failed", async () => {
    // トークン作成時の結果をエラーになるようにする。
    // itの中に記述すると、このテストケース内だけ結果が変わる。
    server.use(
      rest.post("http://localhost:8000/api/auth/", (req, res, ctx) => {
        return res(ctx.status(400));
      })
    );
    render(
      <Provider store={store}>
        <Auth />
      </Provider>
    );
    // トグルモードを切り替える
    userEvent.click(screen.getByTestId("toggle-icon"));
    // ユーザ登録モードに切り替わっているかを確認する
    expect(screen.getByRole("button")).toHaveTextContent("Register");
    // ログインボタンをクリックする
    userEvent.click(screen.getByText("Register"));
    // ログインが異常終了した場合は、spanタグに"Login error!"と表示される事を確認する
    expect(await screen.findByText("Login error!")).toBeInTheDocument();
    // mockHistoryPushが呼ばれていない事を確認する
    expect(mockHistoryPush).toHaveBeenCalledTimes(0);
  });
});
