import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import RouteStopsDialog from "./RouteStopsDialog";
import * as transportApi from "../api";
import type { RouteStop, TransportRoute } from "../types";

vi.mock("./StopLocationPicker", () => ({ default: () => <div data-testid="picker" /> }));
vi.mock("../api");

const route = { id: "rt1", name: "Route A" } as TransportRoute;
const stop = (over: Partial<RouteStop> = {}): RouteStop => ({
  id: "s1",
  tenantId: "t",
  branchId: "b",
  routeId: "rt1",
  name: "Mavoor Road",
  sequence: 1,
  arrivalTime: "07:00",
  arrivalRadiusMeters: 10,
  ...over,
});

async function openAddForm(stops: RouteStop[] = []) {
  vi.mocked(transportApi.listStops).mockResolvedValue(stops);
  renderWithProviders(<RouteStopsDialog open onOpenChange={() => undefined} route={route} />);
  await userEvent.click(await screen.findByRole("button", { name: /add stop/i }));
}

describe("RouteStopsDialog map location", () => {
  it("is optional: a stop without coordinates is saved with none", async () => {
    vi.mocked(transportApi.addStop).mockResolvedValue(stop());
    await openAddForm();
    await userEvent.type(screen.getByLabelText(/stop name/i), "Mavoor Road");
    await userEvent.type(screen.getByLabelText(/arrival time/i), "07:00");
    await userEvent.click(screen.getByRole("button", { name: /^add stop$/i }));

    await waitFor(() => expect(transportApi.addStop).toHaveBeenCalled());
    const values = vi.mocked(transportApi.addStop).mock.calls[0][1];
    expect(values.latitude).toBeUndefined();
    expect(values.longitude).toBeUndefined();
  });

  it("sends the coordinates and radius when both are entered", async () => {
    vi.mocked(transportApi.addStop).mockResolvedValue(stop());
    await openAddForm();
    await userEvent.type(screen.getByLabelText(/stop name/i), "Mavoor Road");
    await userEvent.type(screen.getByLabelText(/arrival time/i), "07:00");
    await userEvent.type(screen.getByLabelText(/latitude/i), "11.25");
    await userEvent.type(screen.getByLabelText(/longitude/i), "75.78");
    await userEvent.click(screen.getByRole("button", { name: /^add stop$/i }));

    await waitFor(() => expect(transportApi.addStop).toHaveBeenCalled());
    expect(vi.mocked(transportApi.addStop).mock.calls[0][1]).toMatchObject({ latitude: 11.25, longitude: 75.78, arrivalRadiusMeters: 10 });
  });

  it("asks for both coordinates when only one is entered", async () => {
    await openAddForm();
    await userEvent.type(screen.getByLabelText(/stop name/i), "Mavoor Road");
    await userEvent.type(screen.getByLabelText(/arrival time/i), "07:00");
    await userEvent.type(screen.getByLabelText(/latitude/i), "11.25");
    await userEvent.click(screen.getByRole("button", { name: /^add stop$/i }));

    expect(await screen.findByText(/both latitude and longitude/i)).toBeInTheDocument();
    expect(transportApi.addStop).not.toHaveBeenCalled();
  });

  it("rejects a latitude outside the globe", async () => {
    await openAddForm();
    await userEvent.type(screen.getByLabelText(/stop name/i), "Mavoor Road");
    await userEvent.type(screen.getByLabelText(/arrival time/i), "07:00");
    await userEvent.type(screen.getByLabelText(/latitude/i), "123");
    await userEvent.type(screen.getByLabelText(/longitude/i), "75.78");
    await userEvent.click(screen.getByRole("button", { name: /^add stop$/i }));

    expect(await screen.findByText(/between -90 and 90/i)).toBeInTheDocument();
  });

  it("marks stops that have a map location in the list", async () => {
    vi.mocked(transportApi.listStops).mockResolvedValue([stop({ latitude: 11.25, longitude: 75.78 }), stop({ id: "s2", name: "Other", sequence: 2 })]);
    renderWithProviders(<RouteStopsDialog open onOpenChange={() => undefined} route={route} />);
    expect(await screen.findAllByText("Map location set")).toHaveLength(1);
  });
});
