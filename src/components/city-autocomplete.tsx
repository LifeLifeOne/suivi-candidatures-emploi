"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, MapPin } from "lucide-react";
import type { CitySuggestion } from "@/lib/cities";

type InitialCity = Pick<CitySuggestion, "name" | "code" | "latitude" | "longitude">;

type Props = {
  initialCity?: InitialCity;
  error?: string;
};

export function CityAutocomplete({ initialCity, error }: Props) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialCity?.name ?? "");
  const [selected, setSelected] = useState<InitialCity | undefined>(initialCity);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    const normalized = query.trim();
    if (selected?.name === normalized || normalized.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setFetchError("");
      try {
        const response = await fetch(`/api/communes?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("City search failed");
        const result = (await response.json()) as CitySuggestion[];
        setSuggestions(result);
        setActiveIndex(result.length ? 0 : -1);
        setOpen(true);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setFetchError("Recherche indisponible. Réessayez dans un instant.");
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selected?.name]);

  function choose(city: CitySuggestion) {
    setQuery(city.name);
    setSelected(city);
    setSuggestions([]);
    setOpen(false);
    setFetchError("");
  }

  return (
    <div
      className="form-field city-field"
      ref={wrapperRef}
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label htmlFor="city-input">Ville</label>
      <div className="city-input-wrap">
        <MapPin size={16} aria-hidden="true" />
        <input
          id="city-input"
          value={query}
          maxLength={160}
          placeholder="Ex. Nantes"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          onFocus={() => setOpen(suggestions.length > 0)}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setSelected(undefined);
            setFetchError("");
            if (value.trim().length < 2) {
              setSuggestions([]);
              setLoading(false);
              setOpen(false);
            } else {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (!open || !suggestions.length) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              choose(suggestions[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {loading ? <LoaderCircle className="city-spinner" size={16} aria-label="Recherche en cours" /> : null}
      </div>
      <input type="hidden" name="location" value={selected?.name ?? query.trim()} />
      <input type="hidden" name="cityCode" value={selected?.code ?? ""} />
      <input type="hidden" name="latitude" value={selected?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={selected?.longitude ?? ""} />
      {open && suggestions.length > 0 ? (
        <div className="city-suggestions" id={listId} role="listbox">
          {suggestions.map((city, index) => (
            <button
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              id={`${listId}-${index}`}
              key={city.code}
              className={index === activeIndex ? "active" : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(city)}
            >
              <strong>{city.name}</strong>
              <span>{city.postalCodes.join(", ")} · {city.departmentCode}</span>
            </button>
          ))}
        </div>
      ) : null}
      {fetchError ? <span className="field-error">{fetchError}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
