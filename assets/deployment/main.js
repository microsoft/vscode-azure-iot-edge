let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {

}

var templateFile, moduleNode, route, deleteConnection, modifyConnection;
var modifyModule = false;
var modifySystem = false;
var modifyRoute = false;
var beforeDropOpen = false;
var connectionDrapStop = false;
var routings = new Map();
const postionBaseTop = 100;
const positionBaseLeft = 330;
const positionOffset = 70;
const curvinessBase = 90;
const curvinessOffset = 30;
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
var connectionOverlays = ["Arrow", { width: 8, length: 8, location: 1, id: "arrow", foldback: 0.623 }]

var endpointSource = {
    anchor: "Left",
    endpoint: ["Dot", { radius: 3 }],
    paintStyle: { fillStyle: "#316b31" },
    isSource: true,
    deleteEndpointsOnDetach: false,
    maxConnections: -1,
    connectorStyle: connectorPaintStyle,
    hoverPaintStyle: endpointHoverStyle,
    connectorHoverStyle: connectorHoverStyle,
    dropOptions: exampleDropOptions,
};
var endpointTarget = {
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
};
var moduleBox = Vue.extend({
    template: "<div class='module' @dblclick='handleClick' :ref='module' :id='id' :style='styleObject'>\
                    <a class='sourcearea'></a>\
                    <p class='textarea'>{{module}}</p>\
                    <span class='targetarea'></span>\
                </div>",
    data: function() {
        return {
            module: "",
            id: "",
            styleObject: {
                position: 'absolute',
                top: '',
                left: ''
            }
        }
    },
    methods: {
        handleClick() {
            var key = this.id;
            app.triggerModule = this.id;
            var moduleTwin = {};
            if (templateFile.hasOwnProperty(key)) {
                moduleTwin = templateFile[key]["properties.desired"];
            }
            if (modifyModule) {
                app.$refs.modifyUnsave.show();
            } else {
                if (app.moduleName === key && app.triggerPageSave != true) {
                    app.displayModule = false;
                    app.moduleName = '';
                } else {
                    app.displayModule = true;
                    app.moduleName = key;
                    app.moduleImage = moduleNode[key].settings.image;
                    app.moduleCreateOptions = JSON.stringify(moduleNode[key].settings.createOptions);
                    app.moduleModuleTwin = JSON.stringify(moduleTwin);
                    app.moduleStatus = moduleNode[key].status;
                    app.modulePolicy = moduleNode[key].restartPolicy;
                }
            }
        }
    }
})
var upstreamBox = Vue.extend({
    template: "<div class='module' :ref='module' :id='id' :style='styleObject'>\
                    <a class='sourcearea'></a>\
                    <p class='textarea'>{{module}}</p>\
                    <span class='targetarea'></span>\
                </div>",
    data: function() {
        return {
            module: "",
            id: "",
            styleObject: {
                position: 'absolute',
                top: '',
                left: '',
                'background-color': 'rgb(40, 104, 187)'
            }
        }
    }
})
Vue.component('moduleBox', moduleBox)
Vue.component('upstreamBox', upstreamBox)

const app = new Vue({
    el: '#app',
    data: {
        outputName: "",
        inputName: "",
        condition: "",
        triggerModule: "",
        triggerPageSave: false,
        displayModule: true,
        displaySystem: false,
        hubImage: "",
        hubStatus: "",
        hubPolicy: "",
        hubCreateOptions: "",
        agentImage: "",
        moduleName: "",
        moduleImage: "",
        moduleStatus: "",
        modulePolicy: "",
        moduleCreateOptions: "",
        moduleModuleTwin: "",
        newRoute: false,
        policyList: ['always', 'never', 'on-failure', 'on-unhealthy'],
        statusList: ['running', 'stopped'],
        jsPlumb: null,
    },
    mounted: function() {
        this.jspready();
        vscode.postMessage({ text: "start" })
        window.addEventListener('message', event => {
            templateFile = event.data;
            moduleNode = templateFile.$edgeAgent["properties.desired"].modules;
            route = templateFile.$edgeHub["properties.desired"].routes;
            this.display();
        })
    },
    methods: {
        display: function() {
            this.createSystem();
            var i = 1;
            for (var key in moduleNode) {
                this.createModules(key, i);
                if (i === 1) {
                    this.triggerModule = key;
                    this.reloadModule();
                    this.triggerModule = '';
                    this.moduleName = key;
                }
                i++;
            }
            this.createUpstream(i);
            this.setRoute();
        },
        jspready: function() {
            jsPlumb.ready(function() {
                jsPlumb.importDefaults({
                    ConnectionOverlays: [
                        connectionOverlays
                    ]
                });
                jsPlumb.bind("click", function(connectionInformation) {
                    modifyConnection = connectionInformation;
                    var outputPort = routings.get(connectionInformation.id).sourcePort;
                    var inputPort = routings.get(connectionInformation.id).targetPort;
                    var condition = routings.get(connectionInformation.id).condition;
                    app.outputName = outputPort;
                    app.inputName = inputPort;
                    app.condition = condition;
                    app.$refs.routeInformation.show();
                });
                jsPlumb.bind("contextmenu", function(connectionInformation) {
                    deleteConnection = connectionInformation;
                    app.$refs.routeDelete.show()
                });
                jsPlumb.bind("beforeDrop", function(connectionInformation) {
                    beforeDropOpen = true;
                    if (connectionInformation.sourceId === connectionInformation.targetId) {
                        return false;
                    } else {
                        modifyRoute = true;
                        app.newRoute = true;
                        var outputModule = connectionInformation.sourceId;
                        var inputModule = connectionInformation.targetId;
                        var curve = curvinessBase;
                        if (isNaN(connectionInformation.connection.id)) {
                            var currentConnection = jsPlumb.getConnections({ source: connectionInformation.sourceId, target: connectionInformation.targetId });
                            var curveArray = new Array();
                            currentConnection.forEach(function(item, index, array) {
                                curveArray.push(routings.get(item.id).cur);
                            });
                            curveArray.sort(function(a, b) {
                                return a - b
                            });
                            for (var i = 0; i < curveArray.length; i++) {
                                if (curve === curveArray[i]) {
                                    curve += curvinessOffset;
                                } else {
                                    break;
                                }
                            };
                            var connectorStyle = ["Bezier", { curviness: curve }];
                            connectionInformation.connection.setConnector(connectorStyle);
                            connectionInformation.connection.addOverlay(connectionOverlays);
                            if (routings.size === 0) {
                                connectionInformation.connection.id = 1;
                            } else {
                                connectionInformation.connection.id = [...routings][routings.size - 1][0] + 1;
                            }
                        } else {
                            var currentConnection = jsPlumb.getConnections({ source: connectionInformation.sourceId, target: connectionInformation.targetId });
                            if (currentConnection.length != 1) {
                                curve = curvinessBase + curvinessOffset * (currentConnection.length - 1);
                            }
                            var connectorStyle = ["Bezier", { curviness: curve }];
                            connectionInformation.connection.setConnector(connectorStyle);
                            connectionInformation.connection.addOverlay(connectionOverlays);
                        }
                        modifyConnection = connectionInformation.connection;
                        var routingJson = { "sourceModule": outputModule, "sourcePort": "", "targetModule": inputModule, "targetPort": "", "condition": "", "cur": curve };
                        routings.set(connectionInformation.connection.id, routingJson);
                        app.routeInformationshow();
                        return true;
                    }
                });
                jsPlumb.bind("connectionDragStop", function(connectionInformation) {
                    if (!isNaN(connectionInformation.id) && !beforeDropOpen) {
                        connectionDrapStop = true;
                        deleteConnection = connectionInformation;
                        app.$refs.routeDelete.show();
                    }
                    beforeDropOpen = false;
                });
            })
        },
        createSystem: function() {
            var hubProperty = templateFile.$edgeAgent["properties.desired"].systemModules.edgeHub;
            var agentProperty = templateFile.$edgeAgent["properties.desired"].systemModules.edgeAgent;
            var hubStatus = hubProperty.status;
            var hubPolicy = hubProperty.restartPolicy;
            this.hubImage = hubProperty.settings.image;
            this.hubCreateOptions = JSON.stringify(hubProperty.settings.createOptions);
            this.hubStatus = hubStatus;
            this.hubPolicy = hubPolicy;
            this.agentImage = agentProperty.settings.image;
        },
        createModules: function(key, i) {
            var userModule = new moduleBox();
            userModule.$data.module = key;
            userModule.$data.id = key;
            userModule.$data.styleObject.top = (postionBaseTop + i * positionOffset) + 'px';
            userModule.$data.styleObject.left = (positionBaseLeft + i * positionOffset) + 'px';
            userModule.$mount()
            this.$refs.canvas.appendChild(userModule.$el);
            var divsWithWindowClass = jsPlumb.getSelector(".module");
            jsPlumb.draggable(divsWithWindowClass, {
                containment: $("#canvas")
            });
            jsPlumb.makeSource(key, {
                filter: "a",
                uniqueEndpoint: true,
            }, endpointSource);
            jsPlumb.makeTarget(key, {
                filter: "span",
                uniqueEndpoint: true,
            }, endpointTarget);
            jsPlumb.addEndpoint(key, endpointSource);
            jsPlumb.addEndpoint(key, endpointTarget);
        },
        createUpstream: function(i) {
            var upstreamModule = new upstreamBox();
            upstreamModule.$data.module = "upstream";
            upstreamModule.$data.id = "IoTHub";
            upstreamModule.$data.styleObject.top = (postionBaseTop + i * positionOffset) + 'px';
            upstreamModule.$data.styleObject.left = positionBaseLeft + 'px';
            upstreamModule.$mount();
            this.$refs.canvas.appendChild(upstreamModule.$el);
            var divsWithWindowClass = jsPlumb.getSelector(".module");
            jsPlumb.draggable(divsWithWindowClass, {
                containment: $("#canvas")
            });
            jsPlumb.makeTarget('IoTHub', {
                filter: "span",
                uniqueEndpoint: true,
            }, endpointTarget);
            jsPlumb.addEndpoint('IoTHub', endpointTarget);
        },
        setRoute: function() {
            for (var key in route) {
                var inputModuleName, inputModulePort, outputModuleName, outputModulePort, condition = "";
                var routeMessage = JSON.stringify(route[key]);
                var start = routeMessage.indexOf("modules") + 8;
                var end = routeMessage.indexOf("outputs", start) - 1;
                outputModuleName = routeMessage.slice(start, end);
                start = end + 9;
                end = routeMessage.indexOf(" ", start);
                outputModulePort = routeMessage.slice(start, end);
                if (routeMessage.endsWith("upstream\"")) {
                    inputModuleName = "IoTHub";
                    inputModulePort = "$upstream";
                } else {
                    start = routeMessage.lastIndexOf("modules") + 8;
                    end = routeMessage.lastIndexOf("inputs") - 1;
                    inputModuleName = routeMessage.slice(start, end);
                    start = end + 8;
                    end = routeMessage.indexOf("\"", start) - 1;
                    inputModulePort = routeMessage.slice(start, end);
                }
                if (routeMessage.indexOf("WHERE") != -1) {
                    condition = routeMessage.slice(routeMessage.indexOf("WHERE") + 6, routeMessage.indexOf("INTO") - 1);
                }
                var currentConnection = jsPlumb.getConnections({ source: outputModuleName, target: inputModuleName });
                var curve = curvinessBase;
                if (currentConnection.length != 0) {
                    curve = curvinessBase + curvinessOffset * currentConnection.length;
                }
                var connectorline = ["Bezier", { curviness: curve }];
                var connection = jsPlumb.connect({
                    source: outputModuleName,
                    target: inputModuleName,
                    connector: connectorline
                });
                if (routings.size === 0) {
                    connection.id = 1;
                } else {
                    connection.id = [...routings][routings.size - 1][0] + 1;
                }
                var routingJson = { "sourceModule": outputModuleName, "sourcePort": outputModulePort, "targetModule": inputModuleName, "targetPort": inputModulePort, "condition": condition, "cur": curve };
                routings.set(connection.id, routingJson);
            }
        },
        reloadModule: function() {
            var key = this.triggerModule;
            var moduleTwin = {};
            if (templateFile.hasOwnProperty(key)) {
                moduleTwin = templateFile[key]["properties.desired"];
            }
            this.moduleName = key;
            this.moduleImage = moduleNode[key].settings.image;
            this.moduleCreateOptions = JSON.stringify(moduleNode[key].settings.createOptions);
            this.moduleModuleTwin = JSON.stringify(moduleTwin);
            this.moduleStatus = moduleNode[key].status;
            this.modulePolicy = moduleNode[key].restartPolicy;
        },
        routeInformationshow: function() {
            if (modifyConnection.sourceId === 'IoTHub') {
                app.outputName = "$upstream";
                app.inputName = "";
                app.condition = "";
            } else if (modifyConnection.targetId === 'IoTHub') {
                app.outputName = "";
                app.inputName = "$upstream";
                app.condition = "";
            } else {
                app.outputName = "";
                app.inputName = "";
                app.condition = "";
            }
            app.$refs.routeInformation.show();
        },
        pageSave: function() {
            if (modifyModule || modifySystem) {
                this.triggerPageSave = true;
                this.triggerModule = this.moduleName;
                this.$refs.modifyUnsave.show();
            } else {
                route = {};
                routings.forEach(function(value, key, map) {
                    var source, target, condition;
                    source = "FROM /messages/modules/" + value.sourceModule + "/outputs/" + value.sourcePort;
                    if (value.targetModule === "IoTHub") {
                        target = " INTO $upstream";
                    } else {
                        target = " INTO BrokeredEndpoint(\"/modules/" + value.targetModule + "/inputs/" + value.targetPort + "\")";
                    }
                    if (value.condition !== "") {
                        condition = " WHERE " + value.condition;
                    } else {
                        condition = '';
                    }
                    route[key] = source + condition + target;
                });
                var routeNameSet = new Set();
                for (var key of routings.keys()) {
                    var routeNameKey = routings.get(key).sourceModule + "To" + routings.get(key).targetModule;
                    if (routeNameSet.has(routeNameKey)) {
                        var routeNameNum = 2;
                        while (routeNameSet.has(routeNameKey + routeNameNum)) {
                            routeNameNum++;
                        }
                        routeNameSet.add(routeNameKey + routeNameNum);
                        routeNameKey = routeNameKey + routeNameNum;
                    } else {
                        routeNameSet.add(routeNameKey);
                    }
                    delete Object.assign(route, {
                        [routeNameKey]: route[key]
                    })[key];
                }
                templateFile.$edgeHub["properties.desired"].routes = route;
                vscode.postMessage({ text: templateFile })
            }
        },
        popSave: function() {
            this.newRoute = false;
            if (this.outputName == "" || this.inputName == "") {
                deleteConnection = modifyConnection;
                routings.delete(deleteConnection.id);
                jsPlumb.detach(deleteConnection);
            } else {
                var connid = modifyConnection.id;
                routings.get(connid).sourcePort = this.outputName;
                routings.get(connid).targetPort = this.inputName;
                routings.get(connid).condition = this.condition;
            }
        },
        popClose: function() {
            if (this.outputName == "" || this.inputName == "" || this.newRoute == true) {
                this.newRoute = false;
                deleteConnection = modifyConnection;
                routings.delete(deleteConnection.id);
                jsPlumb.detach(deleteConnection);
            }
        },
        deleteRouting: function() {
            routings.delete(deleteConnection.id);
            if (connectionDrapStop) {
                connectionDrapStop = false;
            } else {
                jsPlumb.detach(deleteConnection);
            }
        },
        canceloDeleteRouting: function() {
            if (connectionDrapStop) {
                var sourceModule = deleteConnection.sourceId;
                var targetModule = deleteConnection.targetId;
                var curve = routings.get(deleteConnection.id).cur;
                var connectorLine = ["Bezier", { curviness: curve }];
                var connection = jsPlumb.connect({
                    source: sourceModule,
                    target: targetModule,
                    connector: connectorLine
                });
                connection.id = deleteConnection.id;
                connectionDrapStop = false;
            }
        },
        modifySave: function() {
            this.moduleSave();
            if (!this.triggerPageSave) {
                if (this.triggerModule === this.moduleName) {
                    this.displayModule = false;
                    this.moduleName = '';
                } else {
                    this.reloadModule();
                }
            } else {
                this.triggerPageSave = false;
                modifySystem = false;
                this.systemSave();
                this.pageSave();
            }
        },
        modifyCancel: function() {
            modifyModule = false;
            if (!this.triggerPageSave) {
                if (this.triggerModule === this.moduleName) {
                    this.reloadModule();
                    this.displayModule = false;
                    this.moduleName = '';
                } else {
                    var targetModule = this.triggerModule;
                    this.triggerModule = this.moduleName;
                    this.reloadModule();
                    this.triggerModule = targetModule;
                    this.reloadModule();
                }
            } else {
                this.reloadModule();
                this.triggerPageSave = false;
                modifySystem = false;
                this.createSystem();
                this.pageSave();
            }
        },
        systemSave: function() {
            templateFile.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.image = $('#hubImage').val();
            templateFile.$edgeAgent["properties.desired"].systemModules.edgeHub.status = $("#hubStatus").val();
            templateFile.$edgeAgent["properties.desired"].systemModules.edgeHub.restartPolicy = $("#hubPolicy").val();
            templateFile.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.createOptions = JSON.parse($('#hubCreateOptions').val());
            templateFile.$edgeAgent["properties.desired"].systemModules.edgeAgent.settings.image = $('#agentImage').val();
            modifySystem = false;
        },
        systemDiscard: function() {
            this.createSystem();
            modifySystem = false;
        },
        moduleSave: function() {
            var key = this.moduleName;
            moduleNode[key].restartPolicy = this.modulePolicy;
            moduleNode[key].settings.createOptions = JSON.parse(this.moduleCreateOptions);
            moduleNode[key].settings.image = this.moduleImage;
            moduleNode[key].status = this.moduleStatus;
            if (templateFile.hasOwnProperty(key)) {
                templateFile[key]["properties.desired"] = JSON.parse(this.moduleModuleTwin);
            } else if (this.moduleModuleTwin != "") {
                var moduleTwin = { "properties.desired": {} };
                moduleTwin["properties.desired"] = JSON.parse(this.moduleModuleTwin);
                templateFile[key] = moduleTwin;
            }
            modifyModule = false;
        },
        moduleDiscard: function() {
            this.reloadModule();
            modifyModule = false;
        },
        moduleChange: function() {
            modifyModule = true;
            console.log(modifyModule);
        },
        systemChange: function() {
            modifySystem = true;
        }
    }
})