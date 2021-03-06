injected_scripts = [
    'convergence/rxjs.umd.min.js',
    'convergence/convergence.global.min.js',
    'convergence/convergence-input-element-bindings.min.js',

    'ace-collab-ext/AceCursorMarker.js',
    'ace-collab-ext/AceMultiCursorManager.js',
    'ace-collab-ext/AceMultiSelectionManager.js',
    'ace-collab-ext/AceRadarView.js',
    'ace-collab-ext/AceRadarViewIndicator.js',
    'ace-collab-ext/AceRangeUtil.js',
    'ace-collab-ext/AceSelectionMarker.js',
    'ace-collab-ext/AceViewportUtil.js',

    'AceBinder.js',

    'inject.js'
];

injected_scripts.forEach(script_uri => {
    // console.log(script_uri);

    if (!("PRLVE_INJECTED_SCRIPTS" in window)) {
        window.PRLVE_INJECTED_SCRIPTS = {};
    }

    if (script_uri in window.PRLVE_INJECTED_SCRIPTS) {
        return;
    }

    window.PRLVE_INJECTED_SCRIPTS[script_uri] = true;

    let s = document.createElement('script');

    s.src = chrome.runtime.getURL(script_uri);
    s.onload = function() {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(s);
});