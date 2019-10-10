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
        //Double click on a module to display properties
        handleClick() {
            var key = this.id;
            app.triggerModule = this.id;
            var moduleTwin = {};
            if (templateFile.hasOwnProperty(key)) {
                moduleTwin = templateFile[key]["properties.desired"];
            }
            //Ask if modifications are not saved.
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
                //Display the first module properties as default
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
                //Click on a line to show routing information
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
                //Right click to pop up a window and ask if users want to delete routings
                jsPlumb.bind("contextmenu", function(connectionInformation) {
                    deleteConnection = connectionInformation;
                    app.$refs.routeDelete.show()
                });
                //Set line properties before dropping
                jsPlumb.bind("beforeDrop", function(connectionInformation) {
                    beforeDropOpen = true;
                    if (connectionInformation.sourceId === connectionInformation.targetId) {
                        return false;
                    } else {
                        modifyRoute = true;
                        app.newRoute = true;
                        var outputModule = connectionInformation.sourceId;
                        var inputModule = connectionInformation.targetId;
                        //Compute the curviness by finding the first unused curviness
                        var curve = curvinessBase;
                        var curveArray = new Array(); //store the sorted curnivess
                        var currentConnection = jsPlumb.getConnections({ source: connectionInformation.sourceId, target: connectionInformation.targetId });
                        currentConnection.forEach(function(item, index, array) {
                            curveArray.push(routings.get(item.id).cur);
                        });
                        curveArray.sort(function(a, b) {
                            return a - b
                        });
                        for (var i = 0; i < curveArray.length; i++) {
                            if (i < curveArray.length - 1 && curveArray[i] === curveArray[i + 1]) {
                                //If the current line is existing but being changed the direction
                                //then its curviness has been stored in the array,
                                //delete it if it's the same with another line.
                                curveArray.splice(i, 1);
                                i--;
                            } else if (curve === curveArray[i]) {
                                curve += curvinessOffset;
                            } else {
                                break;
                            }
                        };
                        var connectorStyle = ["Bezier", { curviness: curve }];
                        connectionInformation.connection.setConnector(connectorStyle);
                        connectionInformation.connection.addOverlay(connectionOverlays);
                        //If it is a new line then set the id
                        if (isNaN(connectionInformation.connection.id)) {
                            if (routings.size === 0) {
                                connectionInformation.connection.id = 1;
                            } else {
                                connectionInformation.connection.id = [...routings][routings.size - 1][0] + 1;
                            }
                        }
                        modifyConnection = connectionInformation.connection;
                        var routingJson = { "sourceModule": outputModule, "sourcePort": "", "targetModule": inputModule, "targetPort": "", "condition": "", "cur": curve };
                        routings.set(connectionInformation.connection.id, routingJson);
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
                        return true;
                    }
                });
                //Stop dragging an existing line
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
        //Read edge properties
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
        //Read module properties and create moduleboxes on the page
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
        //Create an IoTHub modulebox
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
        //Connect lines between modules and store routing information
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
        //Load and display module properties
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
        //Write modifications back to json file
        pageSave: function() {
            //Ask to save unmodified changes
            if (modifyModule || modifySystem) {
                this.triggerPageSave = true;
                this.triggerModule = this.moduleName;
                this.$refs.modifyUnsave.show();
            } else { //Convert routing information to json format
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
        //Save routing information of a line
        popSave: function() {
            this.newRoute = false;
            //Delete a routing if it lacks necessary port names
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
        //Close routing window
        popClose: function() {
            //Delete a routing if it lacks necessary port names
            if (this.outputName == "" || this.inputName == "" || this.newRoute == true) {
                this.newRoute = false;
                deleteConnection = modifyConnection;
                routings.delete(deleteConnection.id);
                jsPlumb.detach(deleteConnection);
            }
        },
        //Delete a line and the routing information
        deleteRouting: function() {
            routings.delete(deleteConnection.id);
            if (connectionDrapStop) {
                connectionDrapStop = false;
            } else {
                jsPlumb.detach(deleteConnection);
            }
        },
        //Recover a line when user stops dragging
        cancelDeleteRouting: function() {
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
        //Save modifications when users close the display of the current module or write back the whole website without saving
        modifySave: function() {
            this.moduleSave();
            //Users close the module display
            if (!this.triggerPageSave) {
                if (this.triggerModule === this.moduleName) { //close property sidebar
                    this.displayModule = false;
                    this.moduleName = '';
                } else { //display another module
                    this.reloadModule();
                }
            } else { //Users trigger the Apply button to write modifications back to json file
                this.triggerPageSave = false;
                modifySystem = false;
                this.systemSave();
                this.pageSave();
            }
        },
        //Discard modifications when users close the display of a module or write back the whole website without saving
        modifyCancel: function() {
            modifyModule = false;
            //Users close the module display
            if (!this.triggerPageSave) {
                if (this.triggerModule === this.moduleName) { //close property sidebar
                    this.reloadModule();
                    this.displayModule = false;
                    this.moduleName = '';
                } else { //display another module
                    var targetModule = this.triggerModule;
                    this.triggerModule = this.moduleName;
                    this.reloadModule();
                    this.triggerModule = targetModule;
                    this.reloadModule();
                }
            } else { //Users trigger the Apply button to write modifications back to json file
                this.reloadModule();
                this.triggerPageSave = false;
                modifySystem = false;
                this.createSystem();
                this.pageSave();
            }
        },
        //Save modifications of edge properties
        systemSave: function() {
            templateFile.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.image = this.hubImage;
            templateFile.$edgeAgent["properties.desired"].systemModules.edgeHub.status = this.hubStatus;
            templateFile.$edgeAgent["properties.desired"].systemModules.edgeHub.restartPolicy = this.hubPolicy;
            templateFile.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.createOptions = JSON.parse(this.hubCreateOptions);
            templateFile.$edgeAgent["properties.desired"].systemModules.edgeAgent.settings.image = this.agentImage;
            modifySystem = false;
        },
        //Discard modifications of edge properties
        systemDiscard: function() {
            this.createSystem();
            modifySystem = false;
        },
        //Save modifications of module properties
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
        //Discard modifications of module properties
        moduleDiscard: function() {
            this.reloadModule();
            modifyModule = false;
        },
        //listen modifications of module properties
        moduleChange: function() {
            modifyModule = true;
        },
        //listen modifications of module properties
        systemChange: function() {
            modifySystem = true;
        }
    }
})