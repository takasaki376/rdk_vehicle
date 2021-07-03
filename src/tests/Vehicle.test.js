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
import Vehicle from "../components/Vehicle";
import Brand from "../components/Brand";
import Segment from "../components/Segment";

// =============================
// 疑似的なAPIのエンドポイント
// =============================
const handlers = [
  rest.get("http://localhost:8000/api/segments/", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, segment_name: "SUV" },
        { id: 2, segment_name: "EV" },
      ])
    );
  }),
  rest.get("http://localhost:8000/api/brands/", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, brand_name: "Audi" },
        { id: 2, brand_name: "Tesla" },
      ])
    );
  }),
  rest.delete("http://localhost:8000/api/segments/1/", (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.delete("http://localhost:8000/api/segments/2/", (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.delete("http://localhost:8000/api/brands/1/", (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.delete("http://localhost:8000/api/brands/2/", (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.get("http://localhost:8000/api/vehicles/", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 1,
          vehicle_name: "SQ7",
          release_year: 2019,
          price: 300.12,
          segment: 1,
          brand: 1,
          segment_name: "SUV",
          brand_name: "Audi",
        },
        {
          id: 2,
          vehicle_name: "MODEL S",
          release_year: 2020,
          price: 400.12,
          segment: 2,
          brand: 2,
          segment_name: "EV",
          brand_name: "Tesla",
        },
      ])
    );
  }),
  rest.post("http://localhost:8000/api/vehicles/", (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        vehicle_name: "MODEL X",
        release_year: 2019,
        price: 350.12,
        segment: 2,
        brand: 2,
        segment_name: "EV",
        brand_name: "Tesla",
      })
    );
  }),
  rest.put("http://localhost:8000/api/vehicles/1/", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 1,
        vehicle_name: "new SQ7",
        release_year: 2019,
        price: 300.12,
        segment: 1,
        brand: 1,
        segment_name: "SUV",
        brand_name: "Audi",
      })
    );
  }),
  rest.put("http://localhost:8000/api/vehicles/2/", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 2,
        vehicle_name: "new MODEL S",
        release_year: 2020,
        price: 400.12,
        segment: 2,
        brand: 2,
        segment_name: "EV",
        brand_name: "Tesla",
      })
    );
  }),
  rest.delete("http://localhost:8000/api/vehicles/1/", (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.delete("http://localhost:8000/api/vehicles/2/", (req, res, ctx) => {
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
describe("Vehicle Component Test Cases", () => {
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
        <Vehicle />
      </Provider>
    );
    expect(screen.getByTestId("h3-vehicle")).toBeTruthy();
    expect(screen.getByPlaceholderText("new vehicle name")).toBeTruthy();
    expect(screen.getByPlaceholderText("year of release")).toBeTruthy();
    expect(screen.getByPlaceholderText("price")).toBeTruthy();
    expect(screen.getByTestId("select-segment")).toBeTruthy();
    expect(screen.getByTestId("select-brand")).toBeTruthy();
    expect(screen.getByTestId("btn-vehicle-post")).toBeTruthy();
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")[0]).toBeTruthy();
    expect(screen.getAllByRole("listitem")[1]).toBeTruthy();
    expect(screen.getByTestId("delete-veh-1")).toBeTruthy();
    expect(screen.getByTestId("delete-veh-2")).toBeTruthy();
    expect(screen.getByTestId("edit-veh-1")).toBeTruthy();
    expect(screen.getByTestId("edit-veh-2")).toBeTruthy();
  });
  // **************************************************************
  // テストケース２　レンタリング時にデータを取得して、取得結果として２件表示される事を確認する
  it("2 :Should render list of vehicles from REST API", async () => {
    render(
      <Provider store={store}>
        <Vehicle />
      </Provider>
    );
    // データ取得する前は"SQ7"、"MODEL S"が存在しない事を確認する
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
    // vehiclesのデータを取得してレンタリングされるまで待つ
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    // list-2のテキストコンテンツが"EV"となっている事を確認する
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
  });
  // **************************************************************
  // テストケース３　データ取得に失敗した場合にデータが表示されない事を確認する
  it("3 :Should not render list of vehicles from REST API when rejected", async () => {
    server.use(
      rest.get("http://localhost:8000/api/vehicles/", (req, res, ctx) => {
        return res(ctx.status(400));
      })
    );
    render(
      <Provider store={store}>
        <Vehicle />
      </Provider>
    );
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(await screen.findByText("Get error!")).toBeInTheDocument();
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
  });
  it("4 :Should add new vehicle and also to the list", async () => {
    render(
      <Provider store={store}>
        <Brand />
        <Segment />
        <Vehicle />
      </Provider>
    );
    expect(screen.queryByText("MODEL X")).toBeNull();
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    const inputValue = screen.getByPlaceholderText("new vehicle name");
    userEvent.type(inputValue, "MODEL X");
    userEvent.selectOptions(screen.getByTestId("select-segment"), "2");
    userEvent.selectOptions(screen.getByTestId("select-brand"), "2");
    userEvent.click(screen.getByTestId("btn-vehicle-post"));
    expect(await screen.findByText("MODEL X")).toBeInTheDocument();
  });
  it("5 :Should delete segement(id 1) and also from list", async () => {
    render(
      <Provider store={store}>
        <Vehicle />
      </Provider>
    );
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
    userEvent.click(screen.getByTestId("delete-veh-1"));
    expect(await screen.findByText("Deleted in vehicle!")).toBeInTheDocument();
    expect(screen.queryByText("SQ7")).toBeNull();
  });
  it("6 :Should delete segement(id 2) and also from list", async () => {
    render(
      <Provider store={store}>
        <Vehicle />
      </Provider>
    );
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
    userEvent.click(screen.getByTestId("delete-veh-2"));
    expect(await screen.findByText("Deleted in vehicle!")).toBeInTheDocument();
    expect(screen.queryByText("MODEL S")).toBeNull();
  });
  it("7 :Should update segement(id 1) and also in the list", async () => {
    render(
      <Provider store={store}>
        <Vehicle />
      </Provider>
    );
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
    userEvent.click(screen.getByTestId("edit-veh-1"));
    const inputValue = screen.getByPlaceholderText("new vehicle name");
    userEvent.type(inputValue, "new SQ7");
    userEvent.click(screen.getByTestId("btn-vehicle-post"));
    expect(await screen.findByText("Updated in vehicle!")).toBeInTheDocument();
    expect(screen.getByTestId("name-1").textContent).toBe("new SQ7");
  });
  it("8 :Should update segement(id 2) and also in the list", async () => {
    render(
      <Provider store={store}>
        <Vehicle />
      </Provider>
    );
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
    userEvent.click(screen.getByTestId("edit-veh-2"));
    const inputValue = screen.getByPlaceholderText("new vehicle name");
    userEvent.type(inputValue, "new MODEL S");
    userEvent.click(screen.getByTestId("btn-vehicle-post"));
    expect(await screen.findByText("Updated in vehicle!")).toBeInTheDocument();
    expect(screen.getByTestId("name-2").textContent).toBe("new MODEL S");
  });
  it("9 :Should MODEL S(id 2) cascade deleted when EV(id 2) seg deleted", async () => {
    render(
      <Provider store={store}>
        <Segment />
        <Brand />
        <Vehicle />
      </Provider>
    );
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
    userEvent.click(screen.getByTestId("delete-seg-2"));
    expect(await screen.findByText("Deleted in segment!")).toBeInTheDocument();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(screen.getByTestId("name-1").textContent).toBe("SQ7");
  });
  it("10 :Should MODEL S(id 2) cascade deleted when Tesla(id 2) brand deleted", async () => {
    render(
      <Provider store={store}>
        <Segment />
        <Brand />
        <Vehicle />
      </Provider>
    );
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
    userEvent.click(screen.getByTestId("delete-brand-2"));
    expect(await screen.findByText("Deleted in brand!")).toBeInTheDocument();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(screen.getByTestId("name-1").textContent).toBe("SQ7");
  });
  it("11 :Should SQ7(id 1) cascade deleted when SUV(id 1) seg deleted", async () => {
    render(
      <Provider store={store}>
        <Segment />
        <Brand />
        <Vehicle />
      </Provider>
    );
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
    userEvent.click(screen.getByTestId("delete-seg-1"));
    expect(await screen.findByText("Deleted in segment!")).toBeInTheDocument();
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
  });
  it("12 :Should SQ7(id 1) cascade deleted when Audi(id 1) brand deleted", async () => {
    render(
      <Provider store={store}>
        <Segment />
        <Brand />
        <Vehicle />
      </Provider>
    );
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.queryByText("MODEL S")).toBeNull();
    expect(await screen.findByText("SQ7")).toBeInTheDocument();
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
    userEvent.click(screen.getByTestId("delete-brand-1"));
    expect(await screen.findByText("Deleted in brand!")).toBeInTheDocument();
    expect(screen.queryByText("SQ7")).toBeNull();
    expect(screen.getByTestId("name-2").textContent).toBe("MODEL S");
  });
});
