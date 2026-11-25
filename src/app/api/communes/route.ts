import { NextRequest, NextResponse } from "next/server";
import type { CitySuggestion } from "@/lib/cities";

type GeoFeature = {
  geometry?: { type?: unknown; coordinates?: unknown };
  properties?: {
    name?: unknown;
    citycode?: unknown;
    depcode?: unknown;
    postcode?: unknown;
    type?: unknown;
  };
};

function toSuggestion(value: GeoFeature): CitySuggestion | undefined {
  const coordinates = value.geometry?.coordinates;
  const properties = value.properties;
  if (
    properties?.type !== "municipality" ||
    typeof properties.name !== "string" ||
    typeof properties.citycode !== "string" ||
    typeof properties.depcode !== "string" ||
    typeof properties.postcode !== "string" ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    typeof coordinates[0] !== "number" ||
    typeof coordinates[1] !== "number"
  ) {
    return undefined;
  }

  return {
    name: properties.name,
    code: properties.citycode,
    departmentCode: properties.depcode,
    postalCodes: [properties.postcode],
    latitude: coordinates[1],
    longitude: coordinates[0],
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ error: "Saisissez au moins deux caractères." }, { status: 400 });
  }

  const params = new URLSearchParams({
    q: query,
    limit: "8",
    type: "municipality",
  });

  try {
    const response = await fetch(`https://data.geopf.fr/geocodage/search?${params}`, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`Geo API returned ${response.status}`);

    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("features" in payload) ||
      !Array.isArray(payload.features)
    ) {
      throw new Error("Unexpected Geo API payload");
    }
    const suggestions = payload.features
      .map((item) => toSuggestion(item as GeoFeature))
      .filter((item): item is CitySuggestion => item !== undefined);

    return NextResponse.json(suggestions, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(
      { error: "Le service de recherche des villes est temporairement indisponible." },
      { status: 502 },
    );
  }
}
