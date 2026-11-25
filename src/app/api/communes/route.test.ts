import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/communes/route";

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/communes", () => {
  it("refuse une recherche trop courte sans appeler le service externe", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new NextRequest("http://localhost/api/communes?q=N"));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalise une commune recherchée avec son code postal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [-2.00261, 48.649337] },
        properties: {
          type: "municipality",
          name: "Saint-Malo",
          postcode: "35400",
          citycode: "35288",
          depcode: "35",
        },
      }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new NextRequest("http://localhost/api/communes?q=35400%20Saint-Malo"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        name: "Saint-Malo",
        code: "35288",
        departmentCode: "35",
        postalCodes: ["35400"],
        latitude: 48.649337,
        longitude: -2.00261,
      },
    ]);
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("q=35400+Saint-Malo");
    expect(calledUrl).toContain("type=municipality");
  });

  it("renvoie une erreur contrôlée si le service externe échoue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const response = await GET(new NextRequest("http://localhost/api/communes?q=Nantes"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
  });
});
