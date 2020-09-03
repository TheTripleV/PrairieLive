// MODIFIED

//https: //gist.github.com/0x263b/2bdd90886c2036a1ad5bcf06d6e6fb37
String.prototype.toColor = function() {
    var colors = ["#e51c23", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#5677fc", "#03a9f4", "#00bcd4", "#009688", "#259b24", "#8bc34a", "#afb42b", "#ff9800", "#ff5722", "#795548", "#607d8b"]

    var hash = 0;
    if (this.length === 0) return hash;
    for (var i = 0; i < this.length; i++) {
        hash = this.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    hash = ((hash % colors.length) + colors.length) % colors.length;
    return colors[hash];
}

// const this.cursorKey = "cursor";
// const this.selectionKey = "selection";
// const this.viewKey = "view";

class AceBinder {

    constructor(editor, model, collaborative, radarViewElement, editor_id) {
        this._editor = editor;
        this._radarViewElement = radarViewElement;
        this._model = model;
        this._editor_id = editor_id;

        this.cursorKey = "cursor-"; // + this.editor_id;
        this.selectionKey = "selection-"; // + this.editor_id;
        this.viewKey = "view-"; // + this.editor_id;

        this._session = editor.getSession();
        this._document = this._session.getDocument();

        this._cursorManager = null;
        this._cursorReference = null;

        this._selectionManager = null;
        this._selectionReference = null;

        this._radarView = null;
        this._viewReference = null;

        this._suppressEvents = false;

        this._collaborative = collaborative || false;
    }

    bind() {
        this._bindModel();
        if (this._collaborative) {
            this._bindRadarView();
            this._bindCursor();
            this._bindSelection();
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Selection Binding
    /////////////////////////////////////////////////////////////////////////////

    _bindModel() {
        const doc = this._editor.getSession().getDocument();

        this._model.on("insert", (e) => {
            this._suppressEvents = true;
            const pos = doc.indexToPosition(e.index, 0);

            if (!this._collaborative) {
                this._editor.scrollToLine(pos.row, true, false);
            }

            doc.insert(pos, e.value);
            this._suppressEvents = false;
        });

        this._model.on("remove", (e) => {
            const start = doc.indexToPosition(e.index, 0);
            const end = doc.indexToPosition(e.index + e.value.length, 0);
            this._suppressEvents = true;

            if (!this._collaborative) {
                this._editor.scrollToLine(start.row, true, false);
            }

            doc.remove(new ace.Range(start.row, start.column, end.row, end.column));
            this._suppressEvents = false;
        });

        this._model.on("value", function(e) {
            this._suppressEvents = true;
            doc.setValue(e.value);
            this._suppressEvents = false;
        });

        this._editor.on('change', (delta) => {
            if (this._suppressEvents) {
                return;
            }

            const pos = doc.positionToIndex(delta.start, 0);
            switch (delta.action) {
                case "insert":
                    this._model.insert(pos, delta.lines.join("\n"));
                    break;
                case "remove":
                    this._model.remove(pos, delta.lines.join("\n").length);
                    break;
                default:
                    throw new Error("unknown action: " + delta.action);
            }
        });
    }

    /////////////////////////////////////////////////////////////////////////////
    // Cursor Binding
    /////////////////////////////////////////////////////////////////////////////
    _bindCursor() {
        this._cursorManager = new AceMultiCursorManager(this._editor.getSession());
        this._cursorReference = this._model.indexReference(this.cursorKey);

        const references = this._model.references({ key: this.cursorKey });
        console.log(references);
        references.forEach((reference) => {
            if (!reference.isLocal()) {
                this._addCursor(reference);
            }
        });

        this._setLocalCursor();
        this._cursorReference.share();

        this._session.selection.on('changeCursor', () => this._setLocalCursor());

        this._model.on("reference", (e) => {
            if (e.reference.key() === this.cursorKey) {
                this._addCursor(e.reference);
            }
        });
    }

    _setLocalCursor() {
        const position = this._editor.getCursorPosition();
        const index = this._document.positionToIndex(position, 0);
        this._cursorReference.set(index);
    }

    _addCursor(reference) {
        // const color = colorAssigner.getColorAsHex(reference.sessionId());
        const color = reference.user().displayName.toColor();
        const remoteCursorIndex = reference.value();
        this._cursorManager.addCursor(reference.sessionId(), reference.user().displayName, color, remoteCursorIndex);

        reference.on("cleared", () => this._cursorManager.clearCursor(reference.sessionId()));
        reference.on("disposed", () => this._cursorManager.removeCursor(reference.sessionId()));
        reference.on("set", () => {
            const cursorIndex = reference.value();
            const cursorRow = this._document.indexToPosition(cursorIndex, 0).row;
            this._cursorManager.setCursor(reference.sessionId(), cursorIndex);
            if (this._radarView.hasView(reference.sessionId())) {
                this._radarView.setCursorRow(reference.sessionId(), cursorRow);
            }
        });
    }

    /////////////////////////////////////////////////////////////////////////////
    // Selection Binding
    /////////////////////////////////////////////////////////////////////////////

    _bindSelection() {
        this._selectionManager = new AceMultiSelectionManager(this._editor.getSession());

        this._selectionReference = this._model.rangeReference(this.selectionKey);
        this._setLocalSelection();
        this._selectionReference.share();

        this._session.selection.on('changeSelection', () => this._setLocalSelection());

        const references = this._model.references({ key: this.selectionKey });
        references.forEach((reference) => {
            if (!reference.isLocal()) {
                this._addSelection(reference);
            }
        });

        this._model.on("reference", (e) => {
            if (e.reference.key() === this.selectionKey) {
                this._addSelection(e.reference);
            }
        });
    }

    _setLocalSelection() {
        if (!this._editor.selection.isEmpty()) {
            const aceRanges = this._editor.selection.getAllRanges();
            const indexRanges = aceRanges.map((aceRagne) => {
                const start = this._document.positionToIndex(aceRagne.start, 0);
                const end = this._document.positionToIndex(aceRagne.end, 0);
                return { start: start, end: end };
            });

            this._selectionReference.set(indexRanges);
        } else if (this._selectionReference.isSet()) {
            this._selectionReference.clear();
        }
    }

    _addSelection(reference) {
        // fixme we need the client to handle multi ranges
        // const color = colorAssigner.getColorAsHex(reference.sessionId());
        const color = reference.user().displayName.toColor();

        const remoteSelection = reference.values().map(range => this._toAceRange(range));
        this._selectionManager.addSelection(reference.sessionId(), reference.user().displayName, color, remoteSelection);

        reference.on("cleared", () => this._selectionManager.clearSelection(reference.sessionId()));
        reference.on("disposed", () => this._selectionManager.removeSelection(reference.sessionId()));
        reference.on("set", () => {
            this._selectionManager.setSelection(
                reference.sessionId(), reference.values().map(range => this._toAceRange(range)));
        });
    }

    // todo consider moving this into the ace range utils.
    _toAceRange(range) {
        if (typeof range !== 'object') {
            return null;
        }

        let start = range.start;
        let end = range.end;

        if (start > end) {
            let temp = start;
            start = end;
            end = temp;
        }

        const rangeAnchor = this._document.indexToPosition(start, 0);
        const rangeLead = this._document.indexToPosition(end, 0);
        return new ace.Range(rangeAnchor.row, rangeAnchor.column, rangeLead.row, rangeLead.column);
    }

    /////////////////////////////////////////////////////////////////////////////
    // Radar View Binding
    /////////////////////////////////////////////////////////////////////////////
    _bindRadarView() {
        this._radarView = new AceRadarView(this._radarViewElement, this._editor);
        this._viewReference = this._model.rangeReference(this.viewKey);

        const references = this._model.references({ key: this.viewKey });
        references.forEach((reference) => {
            if (!reference.isLocal()) {
                this._addView(reference);
            }
        });

        this._session.on('changeScrollTop', () => {
            setTimeout(() => this._setLocalView(), 0);
        });

        this._model.on("reference", (e) => {
            if (e.reference.key() === this.viewKey) {
                this._addView(e.reference);
            }
        });

        setTimeout(() => {
            this._setLocalView();
            this._viewReference.share();
        }, 0);
    }

    _setLocalView() {
        const viewportIndices = AceViewportUtil.getVisibleIndexRange(this._editor);
        this._viewReference.set({ start: viewportIndices.start, end: viewportIndices.end });
    }

    _addView(reference) {
        // const color = colorAssigner.getColorAsHex(reference.sessionId());
        const color = reference.user().displayName.toColor();


        // fixme need the cursor
        let cursorRow = null;
        let viewRows = null;

        if (reference.isSet()) {
            const remoteViewIndices = reference.value();
            viewRows = AceViewportUtil.indicesToRows(this._editor, remoteViewIndices.start, remoteViewIndices.end);
        }

        this._radarView.addView(reference.sessionId(), reference.user().displayName, color, viewRows, cursorRow);

        // fixme need to implement this on the ace collab side
        reference.on("cleared", () => this._radarView.clearView(reference.sessionId()));
        reference.on("disposed", () => this._radarView.removeView(reference.sessionId()));
        reference.on("set", () => {
            const v = reference.value();
            const rows = AceViewportUtil.indicesToRows(this._editor, v.start, v.end);
            this._radarView.setViewRows(reference.sessionId(), rows);
        });
    }
}