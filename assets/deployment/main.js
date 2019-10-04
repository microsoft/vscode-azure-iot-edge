let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {

}

var templatefile, modulenode, route, deleteconn, modifyconn;
var modifymdl = false;
var modifysys = false;
var modifyroute = false;
var routings = new Map();
const posbase = 70;
const posoffset = 70;
const curvinessbase = 90;
const curvinessoffset = 30;
var exampleDropOptions = {
    hoverClass: "dropHover",
};
var connectorPaintStyle = {
    lineWidth: 2,
    strokeStyle: "#61B7CF",
};
var connectorHoverStyle = {
    lineWidth: 3,
    strokeStyle: "#216477",
};
var endpointHoverStyle = {
    strokeStyle: "#216477"
};
var endpointsource = {
    anchor: "LeftMiddle",
    endpoint: ["Dot", { radius: 3 }],
    paintStyle: { fillStyle: "#316b31" },
    isSource: true,
    deleteEndpointsOnDetach: false,
    maxConnections: -1,
    connectorStyle: connectorPaintStyle,
    hoverPaintStyle: endpointHoverStyle,
    connectorHoverStyle: connectorHoverStyle,
    dropOptions: exampleDropOptions,
    ConnectionOverlays: [
        ["Arrow", { width: 8, length: 8, location: 1, id: "arrow", foldback: 0.623 }]
    ]
};
var endpointtarget = {
    anchor: "Right",
    endpoint: ["Dot", { radius: 3 }],
    paintStyle: { fillStyle: "#316b31" },
    isTarget: true,
    deleteEndpointsOnDetach: false,
    maxConnections: -1,
    connectorStyle: connectorPaintStyle,
    hoverPaintStyle: endpointHoverStyle,
    connectorHoverStyle: connectorHoverStyle,
    dropOptions: exampleDropOptions,
    ConnectionOverlays: [
        ["Arrow", { width: 8, length: 8, location: 1, id: "arrow", foldback: 0.623 }]
    ]
};
var modulebox = Vue.extend({
    template: "<div class='module' @dblclick='handleClick' :ref='mdl' :id='id' :style='stylebject'>{{mdl}}</div>",
    data: function () {
        return {
            mdl: "",
            i: 0,
            id: "",
            stylebject: {
                position: 'absolute',
                top: '',
                left: ''
            }
        }
    },
    mounted: function () {
        this.stylebject.top = (posbase + this.i * posoffset) + 'px';
        this.stylebject.left = (posbase + this.i * posoffset) + 'px';
    },
    methods: {
        handleClick() {
            var key = this.id;
            app.triggermdl = this.id;
            var mdltwin = {};
            if (templatefile.hasOwnProperty(key)) {
                mdltwin = templatefile[key]["properties.desired"];
            }
            if (modifymdl) {
                app.$refs.mdyUnsave.show();
            } else {
                if (app.mdlname === key && app.triggerpage != true) {
                    app.displaymdl = false;
                    app.mdlname = '';
                } else {
                    app.displaymdl = true;
                    app.mdlname = key;
                    app.mdlimg = modulenode[key].settings.image;
                    app.mdlco = JSON.stringify(modulenode[key].settings.createOptions);
                    app.mdlmt = JSON.stringify(mdltwin);
                    app.mdlstatus = modulenode[key].status;
                    app.mdlpolicy = modulenode[key].restartPolicy;
                }
            }
        }
    }
})
var upstreambox = Vue.extend({
    template: "<div class='module' :ref='mdl' :id='id' :style='stylebject'>{{mdl}}</div>",
    data: function () {
        return {
            mdl: "",
            i: 0,
            id: "",
            stylebject: {
                position: 'absolute',
                top: '',
                left: '',
                'background-color': 'rgb(40, 104, 187)'
            }
        }
    },
    mounted: function () {
        this.stylebject.top = (posbase + this.i * posoffset) + 'px';
        this.stylebject.left = posbase + 'px';
    }
})
Vue.component('modulebox', modulebox)
Vue.component('upstreambox', upstreambox)

const app = new Vue({
    el: '#app',
    data: {
        outputname: "",
        inputname: "",
        cdt: "",
        triggermdl: "",
        triggerpage: false,
        displaymdl: true,
        displaysys: false,
        hubimg: "",
        hubstatus: "",
        hubpolicy: "",
        hubco: "",
        agentimg: "",
        mdlname: "",
        mdlimg: "",
        mdlstatus: "",
        mdlpolicy: "",
        mdlco: "",
        mdlmt: "",
        newline: false,
        policylist: ['always', 'never', 'on-failure', 'on-unhealthy'],
        statuslist: ['running', 'stopped'],
        jsPlumb: null,
    },
    mounted: async function () {
        this.jspready();
        vscode.postMessage({ text: "start" })
        window.addEventListener('message', event => {
            templatefile = event.data;
            modulenode = templatefile.$edgeAgent["properties.desired"].modules;
            route = templatefile.$edgeHub["properties.desired"].routes;
            this.display();
        })
    },
    methods: {
        display: async function () {
            this.createSystem();
            var i = 1;
            for (var key in modulenode) {
                this.createModules(key, i);
                if (i === 1) {
                    this.triggermdl = key;
                    this.reloadModule();
                    this.trigermdl = '';
                    this.mdlname = key;
                }
                i++;
            }
            this.createUpstream(i);
            this.setRoute(route);
        },
        jspclick: function (conn) {
            modifyconn = conn;
            var outputPort = routings.get(conn.id).spt;
            var inputPort = routings.get(conn.id).tpt;
            var condition = routings.get(conn.id).cdt;
            this.outputname = outputPort;
            this.inputname = inputPort;
            this.cdt = condition;
            this.$refs.routeattr.show()
        },
        jspready: async function () {
            jsPlumb.ready(function () {
                jsPlumb.importDefaults({
                    ConnectionOverlays: [
                        ["Arrow", { width: 8, length: 8, location: 1, id: "arrow", foldback: 0.623 }]
                    ]
                });

                jsPlumb.bind("click", function (conn) {
                    modifyconn = conn;
                    var outputPort = routings.get(conn.id).spt;
                    var inputPort = routings.get(conn.id).tpt;
                    var condition = routings.get(conn.id).cdt;
                    app.outputname = outputPort;
                    app.inputname = inputPort;
                    app.cdt = condition;
                    app.$refs.routeattr.show();

                });
                jsPlumb.bind("contextmenu", function (conn) {
                    deleteconn = conn;
                    app.$refs.routedelete.show()
                });
                jsPlumb.bind("beforeDrop", function (connInfo) {
                    if (connInfo.sourceId === connInfo.targetId) {
                        return false
                    } else {
                        var curconnection = jsPlumb.getConnections({ source: connInfo.sourceId, target: connInfo.targetId });
                        if (curconnection.length != 0) {
                            var connectorstyle = ["Bezier", { curviness: curvinessbase + curvinessoffset * curconnection.length }];
                            connInfo.connection.setConnector(connectorstyle);
                        } else {
                            var connectorstyle = ["Bezier", { curviness: curvinessbase }];
                            connInfo.connection.setConnector(connectorstyle);
                        }
                        modifyroute = true;
                        app.newline = true;
                        var outputmdl = connInfo.sourceId;
                        var inputmdl = connInfo.targetId;
                        if (routings.size === 0) {
                            connInfo.connection.id = 1;
                        } else {
                            connInfo.connection.id = [...routings][routings.size - 1][0] + 1;
                        }
                        modifyconn = connInfo.connection;
                        var rjson = { "smdl": outputmdl, "spt": "", "tmdl": inputmdl, "tpt": "", "cdt": "" };
                        routings.set(connInfo.connection.id, rjson);
                        app.outputname = "";
                        app.inputname = "";
                        app.cdt = "";
                        app.$refs.routeattr.show()
                        return true;
                    }
                });
            })
        },
        createSystem: async function () {
            var hubpro = templatefile.$edgeAgent["properties.desired"].systemModules.edgeHub;
            var agentpro = templatefile.$edgeAgent["properties.desired"].systemModules.edgeAgent;
            var hubstatus = hubpro.status;
            var hubpolicy = hubpro.restartPolicy;
            this.hubimg = hubpro.settings.image;
            this.hubco = JSON.stringify(hubpro.settings.createOptions);
            this.hubstatus = hubstatus;
            this.hubpolicy = hubpolicy;
            this.agentimg = agentpro.settings.image;
        },
        createModules: async function (key, i) {
            var upstreammodule = new modulebox();
            upstreammodule.$data.mdl = key;
            upstreammodule.$data.i = i;
            upstreammodule.$data.id = key;
            upstreammodule.$mount()
            this.$refs.canvas.appendChild(upstreammodule.$el)
            jsPlumb.addEndpoint(key, { uuid: key + "ports" }, endpointsource);
            jsPlumb.addEndpoint(key, { uuid: key + "portt" }, endpointtarget);
            var divsWithWindowClass = jsPlumb.getSelector(".module");
            jsPlumb.draggable(divsWithWindowClass);
        },
        createUpstream: async function (i) {
            var upstreammodule = new upstreambox();
            upstreammodule.$data.mdl = "upstream";
            upstreammodule.$data.i = i;
            upstreammodule.$data.id = "IoTHub";
            upstreammodule.$mount()
            this.$refs.canvas.appendChild(upstreammodule.$el)
            jsPlumb.addEndpoint('IoTHub', { uuid: "IoTHubports" }, endpointsource);
            jsPlumb.addEndpoint('IoTHub', { uuid: "IoTHubportt" }, endpointtarget);
            var divsWithWindowClass = jsPlumb.getSelector(".module");
            jsPlumb.draggable(divsWithWindowClass);
        },
        setRoute: async function (route) {
            for (var key in route) {
                var iMdlName, iMdlPort, oMdlName, oMdlPort, cdt = "";
                var routeMsg = JSON.stringify(route[key]);
                var Start = routeMsg.indexOf("modules") + 8;
                var End = routeMsg.indexOf("outputs", Start) - 1;
                oMdlName = routeMsg.slice(Start, End);
                Start = End + 9;
                End = routeMsg.indexOf(" ", Start);
                oMdlPort = routeMsg.slice(Start, End);
                if (routeMsg.endsWith("upstream\"")) {
                    iMdlName = "IoTHub";
                    iMdlPort = "$upstream";
                } else {
                    Start = routeMsg.lastIndexOf("modules") + 8;
                    End = routeMsg.lastIndexOf("inputs") - 1;
                    iMdlName = routeMsg.slice(Start, End);
                    Start = End + 8;
                    End = routeMsg.indexOf("\"", Start) - 1;
                    iMdlPort = routeMsg.slice(Start, End);
                }
                if (routeMsg.indexOf("WHERE") != -1) {
                    cdt = routeMsg.slice(routeMsg.indexOf("WHERE") + 6, routeMsg.indexOf("INTO") - 1);
                }
                var curconnection = jsPlumb.getConnections({ source: oMdlName, target: iMdlName });
                var conn;
                if (curconnection.length === 0) {
                    var connectorline = ["Bezier", { curviness: curvinessbase }];
                    conn = jsPlumb.connect({
                        uuids: [oMdlName + "ports", iMdlName + "portt"],
                        connector: connectorline
                    });
                } else {
                    var connectorline = ["Bezier", { curviness: curvinessbase + curvinessoffset * curconnection.length }];
                    conn = jsPlumb.connect({
                        uuids: [oMdlName + "ports", iMdlName + "portt"],
                        connector: connectorline
                    });
                }
                if (routings.size === 0) {
                    conn.id = 1;
                } else {
                    conn.id = [...routings][routings.size - 1][0] + 1;
                }
                var rjson = { "smdl": oMdlName, "spt": oMdlPort, "tmdl": iMdlName, "tpt": iMdlPort, "cdt": cdt };
                routings.set(conn.id, rjson);
            }
        },
        reloadModule: async function () {
            var key = this.triggermdl;
            var mdltwin = {};
            if (templatefile.hasOwnProperty(key)) {
                mdltwin = templatefile[key]["properties.desired"];
            }
            this.mdlname = key;
            this.mdlimg = modulenode[key].settings.image;
            this.mdlco = JSON.stringify(modulenode[key].settings.createOptions);
            this.mdlmt = JSON.stringify(mdltwin);
            this.mdlstatus = modulenode[key].status;
            this.mdlpolicy = modulenode[key].restartPolicy;
        },
        pagesave: async function () {
            if (modifymdl || modifysys) {
                this.triggerpage = true;
                this.triggermdl = this.mdlname;
                this.$refs.mdyUnsave.show();
            } else {
                route = {};
                function readrouting(value, key, map) {
                    var target;
                    if (value.tmdl === "IoTHub") {
                        target = " INTO $upstream";
                    } else {
                        target = " INTO BrokeredEndpoint(\"/modules/" + value.tmdl + "/inputs/" + value.tpt + "\")";
                    }
                    if (value.cdt !== "") {
                        route[key] = "FROM /messages/modules/" + value.smdl + "/outputs/" + value.spt + " WHERE " + value.cdt + target;
                    } else {
                        route[key] = "FROM /messages/modules/" + value.smdl + "/outputs/" + value.spt + target;
                    }
                }
                routings.forEach(readrouting);
                var routenameset = new Set();
                for (var key of routings.keys()) {
                    var routenamekey = routings.get(key).smdl + "To" + routings.get(key).tmdl;
                    if (routenameset.has(routenamekey)) {
                        var routenamenum = 2;
                        while (routenameset.has(routenamekey + routenamenum)) {
                            routenamenum++;
                        }
                        routenameset.add(routenamekey + routenamenum);
                        routenamekey = routenamekey + routenamenum;
                    } else {
                        routenameset.add(routenamekey);
                    }
                    delete Object.assign(route, {
                        [routenamekey]: route[key]
                    })[key];
                }
                templatefile.$edgeHub["properties.desired"].routes = route;
                vscode.postMessage({ text: templatefile })
            }
        },
        popsave: async function () {
            this.newline = false;
            if (this.outputname == "" || this.inputname == "") {
                deleteconn = modifyconn;
                routings.delete(deleteconn.id);
                jsPlumb.detach(deleteconn);
            } else {
                var connid = modifyconn.id;
                routings.get(connid).spt = this.outputname;
                routings.get(connid).tpt = this.inputname;
                routings.get(connid).cdt = this.cdt;
            }
        },
        popclose: async function () {
            if (this.outputname == "" || this.inputname == "" || this.newline == true) {
                this.newline = false;
                deleteconn = modifyconn;
                routings.delete(deleteconn.id);
                jsPlumb.detach(deleteconn);
            }
        },
        deletecon: async function () {
            routings.delete(deleteconn.id);
            jsPlumb.detach(deleteconn);
        },
        mdysave: async function () {
            await this.mdlsave();
            if (!this.triggerpage) {
                if (this.triggermdl === this.mdlname) {
                    this.displaymdl = false;
                    this.mdlname = '';
                } else {
                    this.reloadModule();
                }
            } else {
                this.triggerpage = false;
                modifysys = false;
                this.syssave();
                this.pagesave();
            }
        },
        mdydel: async function () {
            modifymdl = false;
            if (!this.triggerpage) {
                if (this.triggermdl === this.mdlname) {
                    this.reloadModule();
                    this.displaymdl = false;
                    this.mdlname = '';
                } else {
                    var targetmdl = this.triggermdl;
                    this.triggermdl = this.mdlname;
                    this.reloadModule();
                    this.triggermdl = targetmdl;
                    this.reloadModule();
                }
            } else {
                this.reloadModule();
                this.triggerpage = false;
                modifysys = false;
                this.createSystem();
                this.pagesave();
            }
        },
        syssave: function () {
            templatefile.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.image = $('#hubImg').val();
            templatefile.$edgeAgent["properties.desired"].systemModules.edgeHub.status = $("#hubStatus").val();
            templatefile.$edgeAgent["properties.desired"].systemModules.edgeHub.restartPolicy = $("#hubPolicy").val();
            templatefile.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.createOptions = JSON.parse($('#hubCo').val());
            templatefile.$edgeAgent["properties.desired"].systemModules.edgeAgent.settings.image = $('#agentImg').val();
            modifysys = false;
        },
        sysdiscard: function () {
            this.createSystem();
            modifysys = false;
        },
        mdlsave: function () {
            var key = this.mdlname;
            modulenode[key].restartPolicy = this.mdlpolicy;
            modulenode[key].settings.createOptions = JSON.parse(this.mdlco);
            modulenode[key].settings.image = this.mdlimg;
            modulenode[key].status = this.mdlstatus;
            if (templatefile.hasOwnProperty(key)) {
                templatefile[key]["properties.desired"] = JSON.parse(this.mdlmt);
            } else if (this.mdlmt != "") {
                var mdltwin = { "properties.desired": {} };
                mdltwin["properties.desired"] = JSON.parse(this.mdlmt);
                templatefile[key] = mdltwin;
            }
            modifymdl = false;
        },
        mdldiscard: function () {
            this.reloadModule();
            modifymdl = false;
        },
        mdlchange: async function () {
            modifymdl = true;
        },
        syschange: async function () {
            modifysys = true;
        }
    }
})