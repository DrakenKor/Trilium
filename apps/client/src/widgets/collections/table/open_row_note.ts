import appContext from "../../../components/app_context.js";
import { getClosestNtxId } from "../../widget_utils.js";

/**
 * Opens a row's note as Notion's OPEN button does: in the pane the table is shown in, or in a new tab
 * with Ctrl/Cmd held or a middle click.
 */
export function openRowNote(e: MouseEvent, noteId: string, element: HTMLElement) {
    const tabManager = appContext.tabManager;
    if (e.ctrlKey || e.metaKey || e.button === 1) {
        void tabManager.openContextWithNote(noteId, {
            hoistedNoteId: tabManager.getActiveContext()?.hoistedNoteId ?? null,
            placement: "afterCurrent"
        });
        return;
    }

    const ntxId = getClosestNtxId(element);
    const noteContext = (ntxId && tabManager.noteContexts.find((nc) => nc.ntxId === ntxId))
        || tabManager.getActiveContext();
    void noteContext?.setNote(noteId);
}
