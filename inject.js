function p(x) {
    console.log(x);
}

(function() {
    "use strict";

    window.PRLVE_DATA = {};

    // https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
    function htmlToElement(html) {
        let template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    window.PRLVE_DATA.info_element = htmlToElement(
        `
        <div class="card mb-4 prlve-info">
            <div class="card-header bg-secondary text-white" style="background-color:#E84A27!important;">PraireLive</div>
            <table class="table table-sm two-column-description-no-header">
                <tbody>
                    <tr>
                        <td style="font-size:0.88rem!important;background-color:#eeeeee!important;">
                            By: Vasista <br> <a href="mailto:vovveti2@illinois.edu">vovveti2@illinois.edu</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size:0.88rem!important;background-color:#eeeeee!important;">
                            Code: <a href="https://prairie.live">https://prairie.live</a>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table class="table table-sm two-column-description-no-header">
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
                            People on this page:
                            <br>
                            <div class="prlve-page-viewers"></div>
                        </td>
                    </tr>
                </tbody>
            </table>

        </div>
        `
    );

    let sidebar_element = document.getElementById("content").getElementsByClassName("row")[0].children[1];
    sidebar_element.insertBefore(window.PRLVE_DATA.info_element, sidebar_element.firstElementChild);

    setTimeout(prlvego, 777);


    function prlvego() {
        console.log("PrairieLive: starting");

        window.PRLVE_DATA.server_url = "https://prairie.live/realtime/convergence/default";
        window.PRLVE_DATA.collaborative = true;

        let regex_groups = /https:\/\/.*?\/pl\/course_instance\/(\d+)\/instance_question\/(\d+)/.exec(window.location.href);

        window.PRLVE_DATA.ciiq = regex_groups[1] + "-" + regex_groups[2];
        window.PRLVE_DATA.course_instance = regex_groups[1];
        window.PRLVE_DATA.instance_question = regex_groups[2];
        window.PRLVE_DATA.user_fullname = document.getElementById("navbarDropdown").textContent.trim();

        let user_fullname_l = window.PRLVE_DATA.user_fullname.split(" ");

        window.PRLVE_DATA.user_display_name = user_fullname_l[0] + " " + user_fullname_l[user_fullname_l.length - 1][0] + "." + " " + Math.floor(Math.random() * 100);

        let ace_editors = document.querySelectorAll(".ace_editor");

        window.PRLVE_DATA.areas = {};

        for (let i = 0; i < ace_editors.length; i++) {

            let ace_editor_id = ace_editors[i].parentElement.parentElement.id;
            let filename = ace_editors[i].parentElement.getElementsByClassName("card-header")[0].textContent.toString();

            window.PRLVE_DATA.areas[filename] = {};
            let area = window.PRLVE_DATA.areas[filename];
            area.uuid = ace_editor_id;
            area.editor_element = ace_editors[i];
            area.editor = area.editor_element.env.editor;
            area.session = area.editor.getSession();
            area.offline_content = area.session.getValue();

        }

        Convergence.connectAnonymously(window.PRLVE_DATA.server_url, window.PRLVE_DATA.user_display_name)
            .then(initApp)
            .catch((error) => {
                console.log("PrairieLive: Could not connect: " + error);
            });

        function initApp(domain) {
            console.log("PrairieLive: Connection Successful");
            window.PRLVE_DATA.domain = domain;
            // const modelService = domain.models();
            window.PRLVE_DATA.domain.models().openAutoCreate({
                    collection: window.PRLVE_DATA.course_instance,
                    id: window.PRLVE_DATA.instance_question,
                    data: Object.keys(window.PRLVE_DATA.areas).reduce(function(obj, filename) {
                        obj[filename] = window.PRLVE_DATA.areas[filename].offline_content;
                        return obj;
                    }, {})
                })
                .then(initModel)
                .catch((error) => {
                    console.log("Could not open model: " + error);
                });
        }

        function initModel(model) {
            console.log("PrairieLive: DB Model Sync Successful");
            window.PRLVE_DATA.model = model;
            model.collaboratorsAsObservable()
                .subscribe((_) => {
                    // console.log(v);
                    window.PRLVE_DATA.info_element.getElementsByClassName("prlve-page-viewers")[0]
                        .innerHTML = model.collaborators()
                            .sort()
                            .map((collaborator) => {
                                // return " - " + collaborator.user.displayName;
                                let displayName = collaborator.user.displayName;
                                let you = displayName == window.PRLVE_DATA.user_display_name? "(you) " : "";
                                return ` - <span class="badge" style="background-color:${displayName.toColor()}!important;color:white!important;">${you}${displayName}</span>`
                            }).join("<br>")
                });

            let u = 0;
            for (const filename in window.PRLVE_DATA.areas) {
                // p(u);
                p("PrairieLive: Enabling syncing for " + filename);
                let area = window.PRLVE_DATA.areas[filename];
                area.model = window.PRLVE_DATA.model.elementAt(filename);
                // p("s1");
                area.session.setValue(area.model.value());
                area.editor.setReadOnly(false);
                // p("s2");
                area.radarViewElement = area.editor_element.parentElement.getElementsByClassName("card-footer")[0];
                area.aceBinder = new AceBinder(area.editor, area.model, window.PRLVE_DATA.collaborative, area.radarViewElement);
                area.aceBinder.bind();
                // p("s3");
                // Add Button
                area.restore_button_element = htmlToElement(
                    '<button type="button" class="btn btn-outline-secondary btn-sm prlve-restore-offline-version" tabindex="-1">PrairieLive: Restore to PrairieLearn\'s version</button>'
                );

                let button_row = area.editor_element.parentElement.getElementsByClassName("card-footer")[0].getElementsByClassName("ml-auto")[0];
                button_row.insertBefore(area.restore_button_element, button_row.firstElementChild);

                area.restore_button_element.addEventListener('click', (event) => {
                    area.editor.getSession().setValue(area.offline_content);
                });

            } // end for

            let connection_element = window.PRLVE_DATA.info_element.getElementsByClassName("prlve-connection-status")[0].firstElementChild;
            connection_element.className = "badge badge-success";
            connection_element.textContent = "Yes!";

        } // end function initModel

    }

})();