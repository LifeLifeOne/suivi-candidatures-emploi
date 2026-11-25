"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { TagView } from "@/lib/application-view";
import { cleanTagName, MAX_TAG_LENGTH, MAX_TAGS_PER_APPLICATION, normalizeTagName } from "@/lib/tags";
import { TagBadge } from "@/components/tag-badge";

type Props = {
  availableTags: TagView[];
  defaultTags?: TagView[];
  error?: string;
};

export function TagInput({ availableTags, defaultTags = [], error }: Props) {
  const [selected, setSelected] = useState(() => defaultTags.map((tag) => tag.name));
  const [draft, setDraft] = useState("");
  const normalizedSelected = useMemo(
    () => new Set(selected.map(normalizeTagName)),
    [selected],
  );
  const suggestions = availableTags.filter(
    (tag) =>
      !normalizedSelected.has(normalizeTagName(tag.name)) &&
      (!draft.trim() || normalizeTagName(tag.name).includes(normalizeTagName(draft))),
  );

  function addTag(rawName: string) {
    const name = cleanTagName(rawName);
    if (
      !name ||
      name.length > MAX_TAG_LENGTH ||
      selected.length >= MAX_TAGS_PER_APPLICATION ||
      normalizedSelected.has(normalizeTagName(name))
    ) {
      setDraft("");
      return;
    }
    setSelected((current) => [...current, name]);
    setDraft("");
  }

  function removeTag(name: string) {
    setSelected((current) => current.filter((tag) => tag !== name));
  }

  return (
    <div className="form-field form-field-wide">
      <label htmlFor="tag-input">Tags <b>*</b></label>
      <div className="tag-input-shell">
        <div className="tag-editor">
          {selected.map((tag) => (
            <TagBadge chip name={tag} key={normalizeTagName(tag)}>
              <button type="button" onClick={() => removeTag(tag)} aria-label={`Retirer le tag ${tag}`}>
                <X size={13} />
              </button>
              <input type="hidden" name="tags" value={tag} />
            </TagBadge>
          ))}
          <input
            id="tag-input"
            name="tagDraft"
            value={draft}
            maxLength={MAX_TAG_LENGTH}
            placeholder={selected.length ? "Ajouter un tag…" : "Ex. DevOps, Drupal, IA"}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(draft);
              } else if (event.key === "Backspace" && !draft && selected.length) {
                removeTag(selected[selected.length - 1]);
              }
            }}
          />
          {draft.trim() ? (
            <button type="button" className="tag-add-button" onClick={() => addTag(draft)} aria-label="Ajouter le tag">
              <Plus size={15} />
            </button>
          ) : null}
        </div>
        {suggestions.length > 0 && draft.trim() ? (
          <div className="tag-suggestions" aria-label="Tags existants">
            {suggestions.slice(0, 6).map((tag) => (
              <button type="button" key={tag.id} onClick={() => addTag(tag.name)}><TagBadge name={tag.name} /></button>
            ))}
          </div>
        ) : null}
      </div>
      <span className="field-help">Entrée ou virgule pour ajouter un tag.</span>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
