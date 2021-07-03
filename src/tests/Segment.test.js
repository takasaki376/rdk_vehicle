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
import Segment from "../components/Segment";

// =============================
// 疑似的なAPIのエンドポイント
// =============================
const handlers = [
  rest.get("http://localhost:8000/api/segments/", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, segment_name: "K-CAR" },
        { id: 2, segment_name: "EV" },
      ])
    );
  }),
  rest.post("http://localhost:8000/api/segments/", (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ id: 3, segment_name: "Large SUV" }));
  }),
  rest.put("http://localhost:8000/api/segments/1/", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ id: 1, segment_name: "new K-CAR" }));
  }),
  rest.put("http://localhost:8000/api/segments/2/", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ id: 2, segment_name: "new EV" }));
  }),
  rest.delete("http://localhost:8000/api/segments/1/", (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.delete("http://localhost:8000/api/segments/2/", (req, res, ctx) => {
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
describe("Segment Component Test Cases", () => {
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
        <Segment />
      </Provider>
    );
    expect(screen.getByTestId("h3-segment")).toBeTruthy();
    // セグメント名入力テキストボックス
    expect(screen.getByRole("textbox")).toBeTruthy();
    // 編集ボタン
    expect(screen.getByTestId("btn-post")).toBeTruthy();
    // Brandのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("K-CAR")).toBeInTheDocument();
    // レンタリング後にlistitemの１件目が存在している事を確認する
    expect(screen.getAllByRole("listitem")[0]).toBeTruthy();
    // レンタリング後にlistitemの２件目が存在している事を確認する
    expect(screen.getAllByRole("listitem")[1]).toBeTruthy();
    // レンタリング後に１件目のデータに対して削除ボタンが存在している事を確認する
    expect(screen.getByTestId("delete-seg-1")).toBeTruthy();
    // レンタリング後に２件目のデータに対して削除ボタンが存在している事を確認する
    expect(screen.getByTestId("delete-seg-2")).toBeTruthy();
    // レンタリング後に１件目のデータに対して更新ボタンが存在している事を確認する
    expect(screen.getByTestId("edit-seg-1")).toBeTruthy();
    // レンタリング後に２件目のデータに対して更新ボタンが存在している事を確認する
    expect(screen.getByTestId("edit-seg-2")).toBeTruthy();
  });
  // **************************************************************
  // テストケース２　レンタリング時にデータを取得して、取得結果として２件表示される事を確認する
  it("2 :Should render list of segments from REST API", async () => {
    render(
      <Provider store={store}>
        <Segment />
      </Provider>
    );
    // データ取得する前は"K-CAR"、"EV"が存在しない事を確認する
    expect(screen.queryByText("K-CAR")).toBeNull();
    expect(screen.queryByText("EV")).toBeNull();
    // segmentsのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("K-CAR")).toBeInTheDocument();
    // list-2のテキストコンテンツが"EV"となっている事を確認する
    expect(screen.getByTestId("list-2").textContent).toBe("EV");
  });
  // **************************************************************
  // テストケース３　データ取得に失敗した場合にデータが表示されない事を確認する
  it("3 :Should not render list of segments from REST API when rejected", async () => {
    server.use(
      rest.get("http://localhost:8000/api/segments/", (req, res, ctx) => {
        return res(ctx.status(400));
      })
    );
    render(
      <Provider store={store}>
        <Segment />
      </Provider>
    );
    // データ取得する前は"K-CAR"、"EV"が存在しない事を確認する
    expect(screen.queryByText("K-CAR")).toBeNull();
    expect(screen.queryByText("EV")).toBeNull();
    // Segmentsのデータを取得した結果、エラーメッセージが表示されるのを待つ
    expect(await screen.findByText("Get error!")).toBeInTheDocument();
    expect(screen.queryByText("K-CAR")).toBeNull();
    // データ取得処理後も"K-CAR"、"EV"が存在しない事を確認する
    expect(screen.queryByText("EV")).toBeNull();
  });
  // **************************************************************
  // テストケース４　セグメントの新規作成をテストする
  it("4 :Should add new segment and also to the list", async () => {
    render(
      <Provider store={store}>
        <Segment />
      </Provider>
    );
    // Large SUVが存在しない事を確認する
    expect(screen.queryByText("Large SUV")).toBeNull();
    // 入力用のテキストボックスを取得する
    const inputValue = screen.getByPlaceholderText("new segment name");
    // テキストボックスに"Large SUV"を入力する（登録ボタンが使用可能になる）
    userEvent.type(inputValue, "Large SUV");
    // 新規登録ボタンをクリックする
    userEvent.click(screen.getByTestId("btn-post"));
    // "Large SUV"が表示される。
    expect(await screen.findByText("Large SUV")).toBeInTheDocument();
  });
  // **************************************************************
  // テストケース５　登録データの１件目（K-CAR）に対して削除をテストする
  it("5 :Should delete segement(id 1) and also from list", async () => {
    render(
      <Provider store={store}>
        <Segment />
      </Provider>
    );
    // データ取得する前は"K-CAR"、"EV"が存在しない事を確認する
    expect(screen.queryByText("K-CAR")).toBeNull();
    expect(screen.queryByText("EV")).toBeNull();
    // segmentsのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("K-CAR")).toBeInTheDocument();
    // list-2のテキストコンテンツが"EV"となっている事を確認する
    expect(screen.getByTestId("list-2").textContent).toBe("EV");
    // １行目の削除ボタンをクリックする
    userEvent.click(screen.getByTestId("delete-seg-1"));
    // 削除した事がメッセージ表示されるまで待つ
    expect(await screen.findByText("Deleted in segment!")).toBeInTheDocument();
    // K-CARが無くなっている事を確認する
    expect(screen.queryByText("K-CAR")).toBeNull();
  });
  // **************************************************************
  // テストケース６　登録データの２件目（EV）に対して削除をテストする
  it("6 :Should delete segement(id 2) and also from list", async () => {
    render(
      <Provider store={store}>
        <Segment />
      </Provider>
    );
    // データ取得する前は"K-CAR"、"EV"が存在しない事を確認する
    expect(screen.queryByText("K-CAR")).toBeNull();
    expect(screen.queryByText("EV")).toBeNull();
    // segmentsのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("K-CAR")).toBeInTheDocument();
    // list-2のテキストコンテンツが"EV"となっている事を確認する
    expect(screen.getByTestId("list-2").textContent).toBe("EV");
    // ２行目の削除ボタンをクリックする
    userEvent.click(screen.getByTestId("delete-seg-2"));
    // 削除した事がメッセージ表示されるまで待つ
    expect(await screen.findByText("Deleted in segment!")).toBeInTheDocument();
    // EVが無くなっている事を確認する
    expect(screen.queryByText("EV")).toBeNull();
  });
  // **************************************************************
  // テストケース７　K-KARの内容を更新する
  it("7 :Should update segement(id 1) and also in the list", async () => {
    render(
      <Provider store={store}>
        <Segment />
      </Provider>
    );
    // データ取得する前は"K-CAR"、"EV"が存在しない事を確認する
    expect(screen.queryByText("K-CAR")).toBeNull();
    expect(screen.queryByText("EV")).toBeNull();
    // segmentsのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("K-CAR")).toBeInTheDocument();
    // list-1のテキストコンテンツが"EV"となっている事を確認する
    expect(screen.getByTestId("list-2").textContent).toBe("EV");
    // １行目の編集ボタンをクリックする
    userEvent.click(screen.getByTestId("edit-seg-1"));
    // 入力テキストボックスを取得する
    const inputValue = screen.getByPlaceholderText("new segment name");
    // 名称修正
    userEvent.type(inputValue, "new K-CAR");
    // 更新ボタン押下
    userEvent.click(screen.getByTestId("btn-post"));
    // 更新した事がメッセージ表示されるまで待つ
    expect(await screen.findByText("Updated in segment!")).toBeInTheDocument();
    // １件目の名称が変わった事を確認する。
    expect(screen.getByTestId("list-1").textContent).toBe("new K-CAR");
  });
  // **************************************************************
  // テストケース８　EVの内容を更新する
  it("8 :Should update segement(id 2) and also in the list", async () => {
    render(
      <Provider store={store}>
        <Segment />
      </Provider>
    );
    // データ取得する前は"K-CAR"、"EV"が存在しない事を確認する
    expect(screen.queryByText("K-CAR")).toBeNull();
    expect(screen.queryByText("EV")).toBeNull();
    // segmentsのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("K-CAR")).toBeInTheDocument();
    // list-2のテキストコンテンツが"EV"となっている事を確認する
    expect(screen.getByTestId("list-2").textContent).toBe("EV");
    // ２行目の編集ボタンをクリックする
    userEvent.click(screen.getByTestId("edit-seg-2"));
    // 入力テキストボックスを取得する
    const inputValue = screen.getByPlaceholderText("new segment name");
    // 名称修正
    userEvent.type(inputValue, "new EV");
    // 更新ボタン押下
    userEvent.click(screen.getByTestId("btn-post"));
    // 更新した事がメッセージ表示されるまで待つ
    expect(await screen.findByText("Updated in segment!")).toBeInTheDocument();
    // ２件目の名称が変わった事を確認する。
    expect(screen.getByTestId("list-2").textContent).toBe("new EV");
  });
});
