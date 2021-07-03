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
import vehicleReducer from "../features/vehicleSlice";
import Brand from "../components/Brand";

// =============================
// 疑似的なAPIのエンドポイント
// =============================
const handlers = [
  rest.get("http://localhost:8000/api/brands/", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, brand_name: "Toyota" },
        { id: 2, brand_name: "Tesla" },
      ])
    );
  }),
  rest.post("http://localhost:8000/api/brands/", (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ id: 3, brand_name: "Audi" }));
  }),
  rest.put("http://localhost:8000/api/brands/1/", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ id: 1, brand_name: "new Toyota" }));
  }),
  rest.put("http://localhost:8000/api/brands/2/", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ id: 2, brand_name: "new Tesla" }));
  }),
  rest.delete("http://localhost:8000/api/brands/1/", (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.delete("http://localhost:8000/api/brands/2/", (req, res, ctx) => {
    return res(ctx.status(200));
  }),
];

// =============================
// テスト用サーバの設定
// =============================
// モックサービスウォーカー（サーバを作っておく）
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
describe("Brand Component Test Cases", () => {
  // テスト用のストア
  let store;
  beforeEach(() => {
    store = configureStore({
      reducer: {
        vehicle: vehicleReducer,
      },
    });
  });
  // **************************************************************
  // テストケース１　コンポーネントがレンタリングされているかを確認する
  it("1 :Should render all the elements correctly", async () => {
    render(
      <Provider store={store}>
        <Brand />
      </Provider>
    );
    expect(screen.getByTestId("h3-brand")).toBeTruthy();
    // ブランド名入力テキストボックス
    expect(screen.getByRole("textbox")).toBeTruthy();
    // 編集ボタン
    expect(screen.getByTestId("btn-post")).toBeTruthy();
    // Brandのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("Toyota")).toBeInTheDocument();
    // レンタリング後にlistitemの１件目が存在している事を確認する
    expect(screen.getAllByRole("listitem")[0]).toBeTruthy();
    // レンタリング後にlistitemの２件目が存在している事を確認する
    expect(screen.getAllByRole("listitem")[1]).toBeTruthy();
    // レンタリング後に１件目のデータに対して削除ボタンが存在している事を確認する
    expect(screen.getByTestId("delete-brand-1")).toBeTruthy();
    // レンタリング後に２件目のデータに対して削除ボタンが存在している事を確認する
    expect(screen.getByTestId("delete-brand-2")).toBeTruthy();
    // レンタリング後に１件目のデータに対して更新ボタンが存在している事を確認する
    expect(screen.getByTestId("edit-brand-1")).toBeTruthy();
    // レンタリング後に２件目のデータに対して更新ボタンが存在している事を確認する
    expect(screen.getByTestId("edit-brand-2")).toBeTruthy();
  });
  // **************************************************************
  // テストケース２　レンタリング時にデータを取得して、取得結果として２件表示される事を確認する
  it("2 :Should render list of segments from REST API", async () => {
    render(
      <Provider store={store}>
        <Brand />
      </Provider>
    );
    // データ取得する前は"Toyota"、"Tesla"が存在しない事を確認する
    expect(screen.queryByText("Toyota")).toBeNull();
    expect(screen.queryByText("Tesla")).toBeNull();
    // Brandのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("Toyota")).toBeInTheDocument();
    // list-2のテキストコンテンツが"Tesla"となっている事を確認する
    expect(screen.getByTestId("list-2").textContent).toBe("Tesla");
  });
  // **************************************************************
  // テストケース３　データ取得に失敗した場合にデータが表示されない事を確認する
  it("3 :Should not render list of brands from REST API when rejected", async () => {
    server.use(
      rest.get("http://localhost:8000/api/brands/", (req, res, ctx) => {
        return res(ctx.status(400));
      })
    );
    render(
      <Provider store={store}>
        <Brand />
      </Provider>
    );
    // データ取得する前は"Toyota"、"Tesla"が存在しない事を確認する
    expect(screen.queryByText("Toyota")).toBeNull();
    expect(screen.queryByText("Tesla")).toBeNull();
    // Brandのデータを取得した結果、エラーメッセージが表示されるのを待つ
    expect(await screen.findByText("Get error!")).toBeInTheDocument();
    // データ取得処理後も"Toyota"、"Tesla"が存在しない事を確認する
    expect(screen.queryByText("Toyota")).toBeNull();
    expect(screen.queryByText("Tesla")).toBeNull();
  });
  // **************************************************************
  // テストケース４　ブランドの新規作成をテストする
  it("4 :Should add new segment and also to the list", async () => {
    render(
      <Provider store={store}>
        <Brand />
      </Provider>
    );
    // Audiが存在しない事を確認する
    expect(screen.queryByText("Audi")).toBeNull();
    // 入力用のテキストボックスを取得する
    const inputValue = screen.getByPlaceholderText("new brand name");
    // テキストボックスに"Audi"を入力する（登録ボタンが使用可能になる）
    userEvent.type(inputValue, "Audi");
    // 新規登録ボタンをクリックする
    userEvent.click(screen.getByTestId("btn-post"));
    // "Audi"が表示される。
    expect(await screen.findByText("Audi")).toBeInTheDocument();
  });
  // **************************************************************
  // テストケース５　登録データの１件目（トヨタ）に対して削除をテストする
  it("5 :Should delete segement(id 1) and also from list", async () => {
    render(
      <Provider store={store}>
        <Brand />
      </Provider>
    );
    // データ取得する前は"Toyota"、"Tesla"が存在しない事を確認する
    expect(screen.queryByText("Toyota")).toBeNull();
    expect(screen.queryByText("Tesla")).toBeNull();
    // Brandのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("Toyota")).toBeInTheDocument();
    // list-2のテキストコンテンツが"Tesla"となっている事を確認する
    expect(screen.getByTestId("list-2").textContent).toBe("Tesla");
    // １行目の削除ボタンをクリックする
    userEvent.click(screen.getByTestId("delete-brand-1"));
    // 削除した事がメッセージ表示されるまで待つ
    expect(await screen.findByText("Deleted in brand!")).toBeInTheDocument();
    // トヨタが無くなっている事を確認する
    expect(screen.queryByText("Toyota")).toBeNull();
  });
  // **************************************************************
  // テストケース６　登録データの２件目（テスラ）に対して削除をテストする
  it("6 :Should delete segement(id 2) and also from list", async () => {
    render(
      <Provider store={store}>
        <Brand />
      </Provider>
    );
    // データ取得する前は"Toyota"、"Tesla"が存在しない事を確認する
    expect(screen.queryByText("Toyota")).toBeNull();
    expect(screen.queryByText("Tesla")).toBeNull();
    // Brandのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("Toyota")).toBeInTheDocument();
    // list-2のテキストコンテンツが"Tesla"となっている事を確認する
    expect(screen.getByTestId("list-2").textContent).toBe("Tesla");
    // ２行目の削除ボタンをクリックする
    userEvent.click(screen.getByTestId("delete-brand-2"));
    // 削除した事がメッセージ表示されるまで待つ
    expect(await screen.findByText("Deleted in brand!")).toBeInTheDocument();
    // テスラが無くなっている事を確認する
    expect(screen.queryByText("Tesla")).toBeNull();
  });
  // **************************************************************
  // テストケース７　トヨタの内容を更新する
  it("7 :Should update segement(id 1) and also in the list", async () => {
    render(
      <Provider store={store}>
        <Brand />
      </Provider>
    );
    // データ取得する前は"Toyota"、"Tesla"が存在しない事を確認する
    expect(screen.queryByText("Toyota")).toBeNull();
    expect(screen.queryByText("Tesla")).toBeNull();
    // Brandのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("Toyota")).toBeInTheDocument();
    // list-2のテキストコンテンツが"Tesla"となっている事を確認する
    expect(screen.getByTestId("list-2").textContent).toBe("Tesla");
    // １行目の編集ボタンをクリックする
    userEvent.click(screen.getByTestId("edit-brand-1"));
    // 入力テキストボックスを取得する
    //  ---------------------------------------------------------
    //  --- screen.getByPlaceholderText("+++")
    //  --- Placeholder +++ と定義されているテキストボックスを取得する
    //  ---------------------------------------------------------
    const inputValue = screen.getByPlaceholderText("new brand name");
    // 名称修正
    userEvent.type(inputValue, "new Toyota");
    // 更新ボタン押下
    userEvent.click(screen.getByTestId("btn-post"));
    // 更新した事がメッセージ表示されるまで待つ
    expect(await screen.findByText("Updated in brand!")).toBeInTheDocument();
    // １件目の名称が変わった事を確認する。
    expect(screen.getByTestId("list-1").textContent).toBe("new Toyota");
  });
  // **************************************************************
  // テストケース８　テスラの内容を更新する
  it("8 :Should update segement(id 2) and also in the list", async () => {
    render(
      <Provider store={store}>
        <Brand />
      </Provider>
    );
    // データ取得する前は"Toyota"、"Tesla"が存在しない事を確認する
    expect(screen.queryByText("Toyota")).toBeNull();
    expect(screen.queryByText("Tesla")).toBeNull();
    // Brandのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("Toyota")).toBeInTheDocument();
    expect(screen.getByTestId("list-2").textContent).toBe("Tesla");
    // １行目の編集ボタンをクリックする
    userEvent.click(screen.getByTestId("edit-brand-2"));
    // 入力テキストボックスを取得する
    const inputValue = screen.getByPlaceholderText("new brand name");
    // 名称修正
    userEvent.type(inputValue, "new Teslta");
    // 更新ボタン押下
    userEvent.click(screen.getByTestId("btn-post"));
    // 更新した事がメッセージ表示されるまで待つ
    expect(await screen.findByText("Updated in brand!")).toBeInTheDocument();
    // ２件目の名称が変わった事を確認する。
    expect(screen.getByTestId("list-2").textContent).toBe("new Tesla");
  });
});
