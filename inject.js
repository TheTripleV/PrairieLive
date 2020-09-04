var PRLVE_DATA = {};

function p(x) {
    console.log(x);
}

(function() {

    // https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
    function htmlToElement(html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    PRLVE_DATA.info_element = htmlToElement(
        `
        <div class="card mb-4 prlve-info">
            <div class="card-header bg-secondary text-white" style="background-color:#E84A27!important;">PraireLive Status</div>
            <table class="table table-sm two-column-description-no-header" style="border-color:#E84A27!important;">
            <tbody>
                <tr>
                    <td>Connection:</td>
                    <td>
                        <div class="prlve-connection-status">
                            <span class="badge badge-danger">
                                NO!
                            </span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <b>Note</b>: You must click <br> save for Prairielearn <br> to save your code.
                    </td>
                </tr>
            </tbody>
          </table>
        </div>
        `
    );

    let sidebar_element = document.getElementById("content").getElementsByClassName("row")[0].children[1];
    sidebar_element.insertBefore(PRLVE_DATA.info_element, sidebar_element.firstElementChild);

    setTimeout(prlvego, 777);


    function prlvego() {
        console.log("PRLVE: go");

        PRLVE_DATA.server_url = "https://prairie.live/realtime/convergence/default";
        PRLVE_DATA.collaborative = true;

        var regex_groups = /https:\/\/prairielearn.engr.illinois.edu\/pl\/course_instance\/(\d+)\/instance_question\/(\d+)/.exec(window.location.href);

        PRLVE_DATA.ciiq = regex_groups[1] + "-" + regex_groups[2];
        PRLVE_DATA.course_instance = regex_groups[1];
        PRLVE_DATA.instance_question = regex_groups[2];
        PRLVE_DATA.user_fullname = document.getElementById("navbarDropdown").textContent.trim();

        user_fullname_l = PRLVE_DATA.user_fullname.split(" ");

        PRLVE_DATA.user_display_name = user_fullname_l[0] + " " + user_fullname_l[user_fullname_l.length - 1][0] + "." + " " + Math.floor(Math.random() * 100);

        var ace_editors = document.querySelectorAll(".ace_editor");

        PRLVE_DATA.areas = {};

        for (var i = 0; i < ace_editors.length; i++) {

            let ace_editor_id = ace_editors[i].parentElement.parentElement.id;
            PRLVE_DATA.areas[ace_editor_id] = {};
            let area = PRLVE_DATA.areas[ace_editor_id];
            area.editor_element = ace_editors[i];
            area.filename = area.editor_element.parentElement.getElementsByClassName("card-header")[0].textContent;
            area.editor = area.editor_element.env.editor;
            area.session = area.editor.getSession();
            area.offline_content = area.session.getValue();

        }

        Convergence.connectAnonymously(PRLVE_DATA.server_url, PRLVE_DATA.user_display_name)
            .then(initApp)
            .catch((error) => {
                console.log("Could not connect: " + error);
            });

        function initApp(domain) {
            console.log("PRLVE: initApp");
            PRLVE_DATA.domain = domain;
            // const modelService = domain.models();
            PRLVE_DATA.domain.models().openAutoCreate({
                    collection: PRLVE_DATA.course_instance,
                    id: PRLVE_DATA.instance_question,
                    data: Object.keys(PRLVE_DATA.areas).reduce(function(obj, ace_editor_id) {
                        obj[ace_editor_id] = PRLVE_DATA.areas[ace_editor_id].offline_content;
                        return obj;
                    }, {})
                })
                .then(initModel)
                .catch((error) => {
                    console.log("Could not open model: " + error);
                });
        }

        function initModel(model) {
            console.log("PRLVE: initModel");
            PRLVE_DATA.model = model;

            var u = 0;
            for (const ace_editor_id in PRLVE_DATA.areas) {
                p(u);
                p(ace_editor_id);
                let area = PRLVE_DATA.areas[ace_editor_id];
                area.model = PRLVE_DATA.model.elementAt(ace_editor_id);
                p("s1");
                area.session.setValue(area.model.value());
                area.editor.setReadOnly(false);
                p("s2");
                area.radarViewElement = area.editor_element.parentElement.getElementsByClassName("card-footer")[0];
                area.aceBinder = new AceBinder(area.editor, area.model, PRLVE_DATA.collaborative, area.radarViewElement, ace_editor_id);
                area.aceBinder.bind();
                p("s3");
                // Add Button
                area.restore_button_element = htmlToElement(
                    '<button type="button" class="btn btn-outline-secondary btn-sm prlve-restore-offline-version" tabindex="-1">PLive: Restore offline version</button>'
                );

                let button_row = area.editor_element.parentElement.getElementsByClassName("card-footer")[0].getElementsByClassName("ml-auto")[0];
                button_row.insertBefore(area.restore_button_element, button_row.firstElementChild);

                area.restore_button_element.addEventListener('click', (event) => {
                    area.editor.getSession().setValue(area.offline_content);
                });

            } // end for

            let connection_element = PRLVE_DATA.info_element.getElementsByClassName("prlve-connection-status")[0].firstElementChild;
            connection_element.className = "badge badge-success";
            connection_element.textContent = "Yes!";

        } // end function initModel



    }

})();