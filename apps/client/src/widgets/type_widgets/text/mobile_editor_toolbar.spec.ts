import { describe, expect, it } from "vitest";

import { getObscuredHeight } from "./mobile_editor_toolbar";

describe("getObscuredHeight", () => {
    it("lifts the toolbar by the part of its container hidden below the visual viewport", () => {
        // No keyboard: the viewport reaches the container's bottom.
        expect(getObscuredHeight(800, { height: 800, offsetTop: 0 })).toBe(0);
        // Keyboard up, page not panned.
        expect(getObscuredHeight(800, { height: 500, offsetTop: 0 })).toBe(300);
        // Safari panned the visual viewport down by 120px to reveal the caret: less of the
        // container is covered, so the toolbar must come down by the same amount.
        expect(getObscuredHeight(800, { height: 500, offsetTop: 120 })).toBe(180);
        // The page itself was scrolled, moving the container up.
        expect(getObscuredHeight(680, { height: 500, offsetTop: 0 })).toBe(180);
        // Never negative.
        expect(getObscuredHeight(400, { height: 500, offsetTop: 0 })).toBe(0);
    });
});
