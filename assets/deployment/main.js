let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {

}

const app = new Vue({
    el: '#app',
    data: {
        outputname: "",
        inputname: "",
        cdt: "",
        triggermdl: "",
        triggerpage: "",
        display: true,
        hubimg: "",
        hubstatus: "",
        hubpolicy: "",
        hubco: "",
        agengimg: "",
        mdlname: "",
        mdlimg: "",
        mdlstatus: "",
        mdlpolicy: "",
        mdlco: "",
        mdltw: ""
    },
    methods: {
        pagesave: function() {

        },
        popsave: function() {

        },
        popclose: function() {

        },
        deletecon: function() {

        },
        nodeletecon: function() {

        },
        mdysave: function() {

        },
        mdydel: function() {

        },
        syssave: function() {

        },
        mdlsave: function() {

        }
    }
})