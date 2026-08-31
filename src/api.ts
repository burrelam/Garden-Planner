import type { GardenState, PlantRecord, SourceRecord } from "./shared/model";

// Keeping fetch calls here gives every page the same error behavior and makes API changes easy to find.

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const payload =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);
  if (!response.ok)
    throw new ApiError(
      (payload as { error?: string })?.error ?? "Request failed",
      response.status,
      payload,
    );
  return payload as T;
}

export const api = {
  session: () => request<{ authenticated: true }>("/api/session"),
  login: (passphrase: string) =>
    request<{ authenticated: true }>("/api/session", {
      method: "POST",
      body: JSON.stringify({ passphrase }),
    }),
  logout: () => request("/api/session", { method: "DELETE" }),
  meta: () => request<{ environment: string; revision: string }>("/api/meta"),
  garden: () => request<GardenState>("/api/garden"),
  saveGarden: (state: GardenState) =>
    request<GardenState>("/api/garden", {
      method: "PUT",
      headers: { "If-Match": String(state.revision) },
      body: JSON.stringify(state),
    }),
  catalog: () => request<PlantRecord[]>("/api/catalog"),
  plant: (id: string) =>
    request<PlantRecord>(`/api/catalog/${encodeURIComponent(id)}`),
  sources: () => request<SourceRecord[]>("/api/sources"),
  hardinessZone: (zip: string) =>
    request<{ zone: string }>(`/api/hardiness-zone/${encodeURIComponent(zip)}`),
  history: () =>
    request<
      Array<{ id: string; revision: number; reason: string; createdAt: string }>
    >("/api/history"),
  restore: (id: string) =>
    request<GardenState>(`/api/history/${encodeURIComponent(id)}/restore`, {
      method: "POST",
    }),
  previewImport: (data: unknown) =>
    request<{
      plants: number;
      beds: number;
      customPlants: string[];
      varieties: number;
    }>("/api/import/preview", { method: "POST", body: JSON.stringify(data) }),
  importGarden: (
    data: unknown,
    settings: Pick<
      GardenState["garden"],
      "zip" | "hardinessZone" | "lastFrost" | "firstFrost"
    >,
  ) =>
    request<GardenState>("/api/import", {
      method: "POST",
      body: JSON.stringify({ data, settings }),
    }),
};
