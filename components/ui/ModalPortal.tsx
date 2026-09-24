"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders an overlay into document.body so `position: fixed` is always relative
 * to the viewport. Without this, any ancestor with transform / filter /
 * backdrop-filter (hover-lift cards, blurred panels, entrance animations)
 * becomes the containing block and the modal opens off-center on long pages.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    return mounted ? createPortal(children, document.body) : null;
}
