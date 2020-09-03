(function() {

    setTimeout(prlvego, 300);

    function prlvego() {

        // function sleep(milliseconds) {
        //     let timeStart = new Date().getTime();
        //     while (true) {
        //         let elapsedTime = new Date().getTime() - timeStart;
        //         if (elapsedTime > milliseconds) {
        //             break;
        //         }
        //     }
        // }

        // sleep(3000);

        var DOMAIN_URL = "http://localhost:8000/api/realtime/convergence/default";
        var COLLABORATIVE = true;

        var regex_groups = /https:\/\/prairielearn.engr.illinois.edu\/pl\/course_instance\/(\d+)\/instance_question\/(\d+)/.exec(window.location.href)

        var ciiq = regex_groups[1] + "-" + regex_groups[2]

        var full_name_l = document.getElementById("navbarDropdown").textContent.trim().split(" ")

        var disp_name = full_name_l[0] + " " + full_name_l[full_name_l.length - 1][0] + "." + " " + Math.floor(Math.random() * 100);

        var page_editors = [];

        var ace_editors = document.querySelectorAll(".ace_editor");

        console.log(ace_editors);

        var editor_defaults = {}

        for (var i = 0; i < ace_editors.length; i++) {
            console.log(i);

            let ace_editor_name = ace_editors[i].parentElement.parentElement.id;
            let ace_editor = ace_editors[i];
            console.log(ace_editor_name);
            page_editors.push(
                [
                    ace_editor_name,
                    ace_editor
                ]
            );

            editor_defaults[ace_editor_name] = ace_editor.env.editor.getSession().getValue();
        }

        Convergence.connectAnonymously(DOMAIN_URL, disp_name)
            .then(initApp)
            .catch((error) => {
                console.log("Could not connect: " + error);
            });

        function initApp(domain) {
            console.log("WW");
            console.log(editor_defaults);
            const modelService = domain.models();
            modelService.openAutoCreate({
                    collection: ciiq,
                    id: "only-model",
                    data: editor_defaults
                })
                .then(initModel)
                .catch((error) => {
                    console.log("Could not open model: " + error);
                });
        }

        function initModel(model) {

            for (var i = 0; i < page_editors.length; i++) {
                editor_id = page_editors[i][0];
                const editor = page_editors[i][1].env.editor;
                const editor_model = model.elementAt(editor_id);

                const gutter = page_editors[i][1].parentElement.getElementsByClassName("card-footer")[0]

                editor.getSession().setValue(editor_model.value());

                editor.setReadOnly(false);

                // BIND
                if (i == 0) {
                    const aceBinder = new AceBinder(editor, editor_model, COLLABORATIVE, gutter, editor_id);
                    aceBinder.bind();
                }




            } // for

            // const stringModel = model.elementAt("text");
            // const textArea = document.getElementById("textarea");

            // // Sets the value of the text area and performs a two-way-binding.
            // ConvergenceInputElementBinder.bindTextInput(textArea, stringModel);
        } // func

        // alert('inserted self... giggity');

    }

})();


// document.querySelectorAll(".ace_editor")