"use strict";

/**
 * Implements viewport awareness in the Ace Editor by showing where remote
 * users are scrolled too and where there cursor is in the document, even
 * if the cursor is not in view.
 */
class AceRadarView {
    /**
     * Constructs a new AceRadarView bound to the supplied element and editor.
     *
     * @param element
     *          The HTML Element that the AceRadarView should render to.
     * @param editor
     *          The Ace Editor to listen to events from.
     */
    constructor(element, editor) {
            this._container = null;
            if (typeof element === "string") {
                this._container = document.getElementById(element);
            } else {
                this._container = element;
            }
            this._container.style.position = "relative";
            this._views = {};
            this._editor = editor;
        }
        /**
         * Add a view indicator for a new remote user.
         *
         * @param id
         *          The unique id of the user.
         * @param label
         *          A text label to displAce for the user.
         * @param color
         *          The color to render the indicator with.
         * @param viewRows
         *          The rows the user's viewport spans.
         * @param cursorRow
         *          The row that the user's cursor is on.
         */
    addView(id, label, color, viewRows, cursorRow) {
            const indicator = new AceRadarViewIndicator(label, color, viewRows, cursorRow, this._editor);
            this._container.appendChild(indicator.element());
            indicator.update();
            this._views[id] = indicator;
        }
        /**
         * Determines if the AceRadarView has an indicator for this specified user.
         *
         * @param id
         *          The id of the user to check for.
         * @returns
         *   True if the AceRadarView has an indicator for this user, false otherwise.
         */
    hasView(id) {
            return this._views[id] !== undefined;
        }
        /**
         * Sets the view row span for a particular user.
         *
         * @param id
         *          The id of the user to set the rows for.
         * @param rows
         *          The row range to set.
         */
    setViewRows(id, rows) {
            const indicator = this._views[id];
            indicator.setViewRows(rows);
        }
        /**
         * Sets the cursor row for a particular user.
         *
         * @param id
         *          The id of the user to set the cursor row for.
         * @param row
         *          The row to set.
         */
    setCursorRow(id, row) {
            const indicator = this._views[id];
            indicator.setCursorRow(row);
        }
        /**
         * Clears the view for a particular user, causing their indicator to disapear.
         * @param id
         *   The id of the user to clear.
         */
    clearView(id) {
            const indicator = this._views[id];
            indicator.setCursorRow(null);
            indicator.setViewRows(null);
        }
        /**
         * Removes the view indicator for the specified user.
         * @param id
         *   The id of the user to remove the view indicator for.
         */
    removeView(id) {
        const indicator = this._views[id];
        indicator.dispose();
        delete this._views[id];
    }
}

//# sourceMappingURL=AceRadarView.js.map