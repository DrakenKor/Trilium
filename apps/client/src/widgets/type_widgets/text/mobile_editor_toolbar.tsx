import "./mobile_editor_toolbar.css";

import type { CKTextEditor, ClassicEditor } from "@triliumnext/ckeditor5";
import { MutableRef, useCallback, useEffect, useRef, useState } from "preact/hooks";

import { isIOS } from "../../../services/utils";
import { useIsNoteReadOnly, useNoteContext, useNoteProperty, useTriliumEvent } from "../../react/hooks";

interface MobileEditorToolbarProps {
    inPopupEditor?: boolean;
}

/**
 * Handles the editing toolbar for CKEditor in mobile mode. The toolbar acts as a floating bar, with two different mechanism:
 *
 * - On iOS, because it does not respect the viewport meta value `interactive-widget=resizes-content`, we need to listen to window resizes and scroll and reposition the toolbar using absolute positioning.
 * - On Android, the viewport change makes the keyboard resize the content area, all we have to do is to hide the tab bar and global menu (handled in the global style).
 */
export default function MobileEditorToolbar({ inPopupEditor }: MobileEditorToolbarProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { note, noteContext, ntxId } = useNoteContext();
    const noteType = useNoteProperty(note, "type");
    const { isReadOnly } = useIsNoteReadOnly(note, noteContext);
    const shouldDisplay = noteType === "text" && isReadOnly === false;
    const [ dropdownActive, setDropdownActive ] = useState(false);

    usePositioningOniOS(!inPopupEditor, containerRef);

    // Attach the toolbar from the CKEditor.
    useTriliumEvent("textEditorRefreshed", ({ ntxId: eventNtxId, editor }) => {
        if (eventNtxId !== ntxId || !containerRef.current) return;
        const toolbar = editor.ui.view.toolbar?.element;

        if (!inPopupEditor) {
            repositionDropdowns(editor);
        }

        if (toolbar) {
            containerRef.current.replaceChildren(toolbar);
        } else {
            containerRef.current.replaceChildren();
        }
    });

    // Observe when a dropdown is expanded to apply a style that allows the dropdown to be visible, since we can't have the element both visible and the toolbar scrollable.
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new MutationObserver(e => {
            setDropdownActive(e.map((e) => (e.target as any).ariaExpanded === "true").reduce((acc, e) => acc && e));
        });

        observer.observe(containerRef.current, {
            attributeFilter: ["aria-expanded"],
            subtree: true
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className={`classic-toolbar-outer-container ${!shouldDisplay ? "hidden-ext" : "visible"} ${isIOS() ? "ios" : ""}`}>
            <div ref={containerRef} className={`classic-toolbar-widget ${dropdownActive ? "dropdown-active" : ""}`} />
        </div>
    );
}

/**
 * How far the toolbar must be lifted above the bottom of its container so it sits on top of the
 * keyboard: the part of the container that lies below the visual viewport. Both edges are in
 * layout-viewport coordinates, which is what `getBoundingClientRect()` and
 * `visualViewport.offsetTop` report on iOS.
 */
export function getObscuredHeight(containerBottom: number, viewport: { height: number; offsetTop: number }) {
    return Math.max(0, Math.round(containerBottom - viewport.height - viewport.offsetTop));
}

function usePositioningOniOS(enabled: boolean, wrapperRef: MutableRef<HTMLDivElement | null>) {
    // Fallback path for plain mobile Safari (no Capacitor): the WKWebView
    // isn't resized when the keyboard opens, so visualViewport.height
    // shrinks while window.innerHeight stays the same. Push the toolbar
    // up by the difference. Under Capacitor `resize: native` both values
    // shrink together, so `obscured` is 0 and we leave CSS in charge.
    //
    // Safari also pans the visual viewport while the keyboard is up (to
    // reveal the caret, or when the user scrolls), which changes
    // `offsetTop` and fires `scroll` but not `resize`, so both are
    // listened to. The container's own bottom is used rather than
    // `innerHeight` so a page that Safari has scrolled is accounted for.
    const adjustPosition = useCallback(() => {
        if (!wrapperRef.current) return;
        const viewport = window.visualViewport;
        if (!viewport) return;

        const containerBottom = wrapperRef.current.parentElement?.getBoundingClientRect().bottom ?? window.innerHeight;
        const obscured = getObscuredHeight(containerBottom, viewport);

        if (obscured <= 1) {
            wrapperRef.current.style.removeProperty("bottom");
        } else {
            wrapperRef.current.style.bottom = `${obscured}px`;
        }
    }, [ wrapperRef ]);

    useEffect(() => {
        if (!isIOS() || !enabled) return;
        let pending: number | null = null;
        const schedule = () => {
            if (pending !== null) return;
            pending = requestAnimationFrame(() => {
                pending = null;
                adjustPosition();
            });
        };

        // Run once in case the keyboard is already up when mounting
        // (e.g. returning from a dialog).
        adjustPosition();
        window.visualViewport?.addEventListener("resize", schedule);
        window.visualViewport?.addEventListener("scroll", schedule);
        return () => {
            window.visualViewport?.removeEventListener("resize", schedule);
            window.visualViewport?.removeEventListener("scroll", schedule);
            if (pending !== null) cancelAnimationFrame(pending);
        };
    }, [ enabled, adjustPosition ]);
}

/**
 * Reposition all dropdowns to point upwards instead of downwards.
 * See https://ckeditor.com/docs/ckeditor5/latest/examples/framework/bottom-toolbar-editor.html for more info.
 * @param editor
 */
function repositionDropdowns(editor: CKTextEditor) {
    const toolbarView = (editor as ClassicEditor).ui.view.toolbar;
    for (const item of toolbarView.items) {
        if (!("panelView" in item)) continue;

        item.on("change:isOpen", () => {
            if (!("isOpen" in item) || !item.isOpen) return;

            // @ts-ignore
            item.panelView.position = item.panelView.position.replace("s", "n");
        });
    }
}
