"use client";

import { useEffect } from "react";

/**
 * Upgrades every native <select> in the app (without touching the React tree):
 * clicking one opens a floating, searchable list whose options are sorted A-Z.
 * Placeholder / "All" options (empty value or value "all") stay pinned on top.
 *
 * Opt-outs: add `data-native-select` to keep the browser dropdown, or
 * `data-no-sort` to keep the original option order (search still works).
 */

type Item = { value: string; label: string; disabled: boolean; group: string; pinned: boolean };

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function isPinned(value: string, label: string) {
  const v = value.trim().toLowerCase();
  return v === "" || v === "all" || /^(all|select|choose|--)/i.test(label.trim());
}

function readItems(select: HTMLSelectElement): Item[] {
  const items: Item[] = [];
  const push = (o: HTMLOptionElement, group: string) =>
    items.push({
      value: o.value,
      label: o.textContent?.trim() || o.value,
      disabled: o.disabled,
      group,
      pinned: isPinned(o.value, o.textContent || ""),
    });
  Array.from(select.children).forEach((child) => {
    if (child instanceof HTMLOptGroupElement) {
      Array.from(child.children).forEach((o) => push(o as HTMLOptionElement, child.label));
    } else if (child instanceof HTMLOptionElement) {
      push(child, "");
    }
  });
  if (!select.hasAttribute("data-no-sort")) {
    const order = new Map(items.map((it, i) => [it, i]));
    items.sort((a, b) => {
      if (a.group !== b.group) return (order.get(a)! - order.get(b)!);
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.pinned && b.pinned) return order.get(a)! - order.get(b)!;
      return collator.compare(a.label, b.label);
    });
  }
  return items;
}

function setNativeValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter ? setter.call(select, value) : (select.value = value);
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

export function SearchableSelectEnhancer() {
  useEffect(() => {
    let popup: HTMLDivElement | null = null;
    let cleanup: (() => void) | null = null;

    const close = () => {
      cleanup?.();
      cleanup = null;
      popup?.remove();
      popup = null;
    };

    const open = (select: HTMLSelectElement) => {
      close();
      const items = readItems(select);
      const rect = select.getBoundingClientRect();

      popup = document.createElement("div");
      popup.setAttribute("data-select-popup", "");
      Object.assign(popup.style, {
        position: "fixed",
        zIndex: "2147483647",
        minWidth: `${Math.max(rect.width, 180)}px`,
        maxWidth: "min(420px, 95vw)",
        background: "#fff",
        color: "#111827",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        boxShadow: "0 10px 30px rgba(0,0,0,.18)",
        font: "14px/1.4 system-ui, sans-serif",
        overflow: "hidden",
      } as CSSStyleDeclaration);

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Search...";
      input.autocomplete = "off";
      Object.assign(input.style, {
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 10px",
        border: "0",
        borderBottom: "1px solid #e5e7eb",
        outline: "none",
        font: "inherit",
        background: "#fff",
        color: "inherit",
      } as CSSStyleDeclaration);

      const list = document.createElement("div");
      Object.assign(list.style, { maxHeight: "260px", overflowY: "auto" } as CSSStyleDeclaration);

      popup.append(input, list);
      document.body.appendChild(popup);

      let active = 0;
      let visible: Item[] = [];

      const render = () => {
        const q = input.value.trim().toLowerCase();
        visible = items.filter((it) => !q || it.label.toLowerCase().includes(q));
        if (active >= visible.length) active = Math.max(0, visible.length - 1);
        list.textContent = "";
        if (!visible.length) {
          const empty = document.createElement("div");
          empty.textContent = "No results";
          Object.assign(empty.style, { padding: "10px", color: "#6b7280" } as CSSStyleDeclaration);
          list.appendChild(empty);
          return;
        }
        let lastGroup = "";
        visible.forEach((it, i) => {
          if (it.group && it.group !== lastGroup) {
            const g = document.createElement("div");
            g.textContent = it.group;
            Object.assign(g.style, {
              padding: "6px 10px 2px",
              fontSize: "11px",
              fontWeight: "600",
              color: "#6b7280",
              textTransform: "uppercase",
            } as CSSStyleDeclaration);
            list.appendChild(g);
          }
          lastGroup = it.group;
          const row = document.createElement("div");
          row.textContent = it.label;
          row.setAttribute("data-idx", String(i));
          const selected = it.value === select.value;
          Object.assign(row.style, {
            padding: "7px 10px",
            cursor: it.disabled ? "not-allowed" : "pointer",
            opacity: it.disabled ? "0.45" : "1",
            fontWeight: selected ? "600" : "400",
            background: i === active ? "#eef2ff" : selected ? "#f3f4f6" : "transparent",
          } as CSSStyleDeclaration);
          row.addEventListener("mouseenter", () => {
            active = i;
            Array.from(list.querySelectorAll<HTMLElement>("[data-idx]")).forEach((el) => {
              el.style.background = Number(el.dataset.idx) === active ? "#eef2ff" : "transparent";
            });
          });
          row.addEventListener("mousedown", (e) => {
            e.preventDefault();
            choose(it);
          });
          list.appendChild(row);
        });
        list.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
      };

      const choose = (it: Item) => {
        if (it.disabled) return;
        if (it.value !== select.value) setNativeValue(select, it.value);
        close();
        select.focus();
      };

      // Position below the select, or above when there is no room.
      const below = window.innerHeight - rect.bottom;
      const popupHeight = Math.min(310, popup.offsetHeight || 310);
      const top = below < popupHeight + 8 && rect.top > below ? rect.top - popupHeight - 4 : rect.bottom + 4;
      popup.style.top = `${Math.max(4, top)}px`;
      popup.style.left = `${Math.min(rect.left, window.innerWidth - popup.offsetWidth - 8)}px`;

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          select.focus();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          active = Math.min(visible.length - 1, active + 1);
          render();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          active = Math.max(0, active - 1);
          render();
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (visible[active]) choose(visible[active]);
        }
      };
      const onOutside = (e: Event) => {
        if (popup && !popup.contains(e.target as Node)) close();
      };
      const onScroll = (e: Event) => {
        if (popup && !popup.contains(e.target as Node)) close();
      };

      input.addEventListener("input", () => {
        active = 0;
        render();
      });
      input.addEventListener("keydown", onKey);
      document.addEventListener("mousedown", onOutside, true);
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", close);

      cleanup = () => {
        document.removeEventListener("mousedown", onOutside, true);
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", close);
      };

      const sel = items.findIndex((it) => it.value === select.value);
      active = sel >= 0 ? sel : 0;
      render();
      input.focus();
    };

    const eligible = (t: EventTarget | null): HTMLSelectElement | null => {
      const el = (t as HTMLElement | null)?.closest?.("select") as HTMLSelectElement | null;
      if (!el || el.multiple || el.size > 1 || el.disabled) return null;
      if (el.hasAttribute("data-native-select")) return null;
      return el;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const el = eligible(e.target);
      if (!el) return;
      e.preventDefault(); // suppress the native dropdown
      el.focus();
      open(el);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const el = eligible(e.target);
      if (!el || (e.target as HTMLElement).closest("[data-select-popup]")) return;
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        open(el);
      }
    };

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      close();
    };
  }, []);

  return null;
}
