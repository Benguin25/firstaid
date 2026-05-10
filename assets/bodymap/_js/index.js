$(document).ready(function () {
    const image = $('img[usemap="#image-map"]');
    let selectedItems = [];
    const selectionsDiv = $('#selections');

    const bodyPartNames = {
        '1': 'Maxillofacial', '2': 'Head', '3': 'Neck',
        '20': 'Right Shoulder', '26': 'Left Shoulder', '4': 'Chest',
        '10': 'Abdominal', '9': 'Pelvis', '14': 'Left Hip', '15': 'Right Hip',
        '27': 'Left Femur/Thigh', '21': 'Right Femur/Thigh',
        '39': 'Left Knee', '33': 'Right Knee',
        '34': 'Right Tib/Fib', '38': 'Left Tib/Fib',
        '42': 'Left Ankle', '35': 'Right Ankle',
        '36': 'Right Foot', '37': 'Left Foot',
        '32': 'Right Humerus', '22': 'Right Elbow', '23': 'Right Forearm',
        '24': 'Right Wrist', '25': 'Right Hand',
        '30': 'Left Hand', '31': 'Left Wrist', '28': 'Left Forearm',
        '29': 'Left Elbow', '40': 'Left Humerus',
        '19': 'Skull/Brain', '41': 'Spine', '16': 'Buttocks', '5': 'Back',
        '17': 'Right Shoulder (Back)', '18': 'Left Shoulder (Back)',
        '11': 'Right Arm', '8': 'Left Arm', '7': 'Right Leg', '12': 'Left Leg'
    };

    // ── React Native bridge ──────────────────────────────────────────────────
    // Posts current selections to the RN WebView message handler.
    function postToRN(type) {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: type, selections: [...selectedItems] })
            );
        }
    }

    // Called by React Native's injectJavaScript when the user taps Continue.
    window.confirmSelections = function () {
        postToRN('BODY_SELECTIONS'); // send final list
        postToRN('CONFIRM');         // signal navigation
    };
    // ────────────────────────────────────────────────────────────────────────

    function updateSelectionsDisplay() {
        if (selectedItems.length > 0) {
            const names = selectedItems.map(k => bodyPartNames[k] || k.replace(/_/g, ' '));
            selectionsDiv.html(
                '<b>Selected:</b><br><ul>' +
                names.map(n => '<li>' + n + '</li>').join('') +
                '</ul>'
            );
        } else {
            selectionsDiv.html('<b>Tap a body part to select it</b>');
        }
    }

    updateSelectionsDisplay();

    // Reset button (visible in standalone browser, hidden inside the app by StepLayout)
    const resetButton = $('<button id="reset-btn">Reset</button>');
    selectionsDiv.after(resetButton);
    resetButton.on('click', function () {
        selectedItems = [];
        image.mapster('deselect');
        updateSelectionsDisplay();
        postToRN('BODY_SELECTIONS'); // keep RN in sync after reset
    });

    // ImageMapster
    image.mapster({
        fillOpacity: 0.4,
        fillColor: 'd42e16',
        strokeColor: '3320FF',
        strokeOpacity: 0.8,
        strokeWidth: 4,
        stroke: true,
        isSelectable: true,
        singleSelect: false,
        mapKey: 'name',
        listKey: 'key',
        highlight: true,
        render_highlight: {
            fillColor: 'FFFF00',
            fillOpacity: 0.5,
            strokeColor: '000000',
            strokeOpacity: 0.9,
            strokeWidth: 5,
        },
        render_select: {
            fillColor: '00AAFF',
            fillOpacity: 0.6,
            strokeColor: '0000AA',
            strokeOpacity: 0.9,
            strokeWidth: 5,
        },
        onClick: function (e) {
            const key = e.key;
            const index = selectedItems.indexOf(key);
            if (index >= 0) {
                selectedItems.splice(index, 1);
            } else {
                selectedItems.push(key);
            }
            updateSelectionsDisplay();
            postToRN('BODY_SELECTIONS'); // live update on every tap
        },
        showToolTip: true,
        toolTipClose: ['tooltip-click', 'area-click'],
        onMouseover: function (e) {
            const name = bodyPartNames[e.key] || e.key.replace(/_/g, ' ');
            image.mapster('tooltip', '<b>' + name + '</b>');
        },
        areas: [],
    });

    image.on('mapster:mouseover', function () {
        $(this).css('cursor', 'pointer');
    }).on('mapster:mouseout', function () {
        $(this).css('cursor', 'default');
    });

    $(document).on('keydown', function (e) {
        if (e.key === 'r' && e.ctrlKey) {
            e.preventDefault();
            resetButton.click();
        }
    });

    const instructions = $('<div style="margin-top:10px;font-size:12px;color:#666;">Hover to highlight · tap to select · Ctrl+R to reset</div>');
    resetButton.after(instructions);
});