let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {

}

var templatefile, modulenode, route, deleteconn, modifyconn;
var modifyattr = false;
var modifyroute = false;
var routings = new Map();
const posbase = 70;
const posoffset = 70;
const curvinessbase = 90;
const curvinessoffset = 30;

function createSystem() {
    var hubpro = templatefile.$edgeAgent["properties.desired"].systemModules.edgeHub;
    var agentpro = templatefile.$edgeAgent["properties.desired"].systemModules.edgeAgent;
    var hubstatus = hubpro.status;
    var hubpolicy = hubpro.restartPolicy;
    $("#hubImg").val(hubpro.settings.image);
    $("#hubCo").val(JSON.stringify(hubpro.settings.createOptions));
    $("#hubStatus").find("option:contains(\"" + hubstatus + "\")").prop("selected", true);
    $("#hubPolicy").find("option:contains(\"" + hubpolicy + "\")").prop("selected", true);
    $("#agentImg").val(agentpro.settings.image);
}

function createUpstream(i, endpointsource, endpointtarget) {
    var $canvas = $("#canvas");
    var $newdiv = $("<div class='module' id= 'IoTHub'></div>");
    $newdiv.text("upstream");
    $newdiv.css({ position: "absolute", top: posbase + i * posoffset, left: posbase, 'background-color': "rgb(40, 104, 187)" });
    $canvas.append($newdiv);
    jsPlumb.addEndpoint('IoTHub', { uuid: "IoTHubports" }, endpointsource);
    jsPlumb.addEndpoint('IoTHub', { uuid: "IoTHubportt" }, endpointtarget);
    var divsWithWindowClass = jsPlumb.getSelector(".module");
    jsPlumb.draggable(divsWithWindowClass);
}

function createModules(key, i, endpointsource, endpointtarget) {
    var $canvas = $("#canvas");
    var $newdiv = $("<div class='module' id=\"" + key + "\"></div>");
    $newdiv.text(key);
    $newdiv.css({ position: "absolute", 'top': posbase + i * posoffset, 'left': posbase + i * posoffset });
    $canvas.append($newdiv);
    $newdiv.bind("dblclick", function() {
        var key = $(this).attr("id");
        var mdltwin = {};
        if (templatefile.hasOwnProperty(key)) {
            mdltwin = templatefile[key]["properties.desired"];
        }
        if (modifyattr) {
            $("#mdyUnsave").data("data-triggermdl", $(this).attr("id"));
            $("#mdyUnsave").modal();
        } else {
            var mdldpl = $("#module-property")[0].style.display;
            var sysdpl = $("#hub-property")[0].style.display;
            if (sysdpl !== "none") {
                $("#module-property")[0].style.display = sysdpl;
                $("#hub-property")[0].style.display = "none";
            } else if ($("#mdlName").val() === key && $("#mdyUnsave").data("data-triggerpage") != "true") {
                $("#hub-property")[0].style.display = mdldpl;
                $("#module-property")[0].style.display = "none";
            }
            $("#mdlName").text(key);
            $("#mdlName").val(key);
            $("#mdlImg").val(modulenode[key].settings.image);
            $("#mdlCo").val(JSON.stringify(modulenode[key].settings.createOptions));
            $("#mdlMt").val(JSON.stringify(mdltwin));
            var mdlstatus = modulenode[key].status;
            $("#mdlStatus").find("option:contains(\"" + mdlstatus + "\")").prop("selected", true);
            var mdlpolicy = modulenode[key].restartPolicy;
            $("#mdlPolicy").find("option:contains(\"" + mdlpolicy + "\")").prop("selected", true);
        }
    });
    jsPlumb.addEndpoint(key, { uuid: key + "ports" }, endpointsource);
    jsPlumb.addEndpoint(key, { uuid: key + "portt" }, endpointtarget);
    var divsWithWindowClass = jsPlumb.getSelector(".module");
    jsPlumb.draggable(divsWithWindowClass);
}

function setRoute(route) {
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
}

function display(endpointsource, endpointtarget) {
    createSystem();
    var i = 1;
    for (var key in modulenode) {
        createModules(key, i, endpointsource, endpointtarget);
        i++;
    }
    createUpstream(i, endpointsource, endpointtarget);
    setRoute(route);
}

$("#deletecon").click(function() {
    routings.delete(deleteconn.id);
    jsPlumb.detach(deleteconn);
})

$("#popsave").click(function() {
    if (modifyroute) {
        modifyroute = false;
        $("#routeattr").data("data-newline", "false");
        if ($("#txt_departmentname_output").val() == "" || $("#txt_departmentname_input").val() == "") {
            deleteconn = modifyconn;
            routings.delete(deleteconn.id);
            jsPlumb.detach(deleteconn);
        } else {
            var connid = modifyconn.id;
            routings.get(connid).spt = $("#txt_departmentname_output").val();
            routings.get(connid).tpt = $("#txt_departmentname_input").val();
            routings.get(connid).cdt = $("#txt_departmentname_cdt").val();
        }
    }
})

$("#popclose").click(function() {
    if (modifyroute) {
        modifyroute = false;
        if ($("#txt_departmentname_output").val() == "" || $("#txt_departmentname_input").val() == "" || $("#routeattr").data("data-newline") == "true") {
            $("#routeattr").data("data-newline", "false");
            deleteconn = modifyconn;
            routings.delete(deleteconn.id);
            jsPlumb.detach(deleteconn);
        }
    }
})

$("#pagesave").click(function() {
    if (modifyattr) {
        $("#mdyUnsave").data("data-triggerpage", "true");
        var sysdpl = $("#hub-property")[0].style.display;
        if (sysdpl != "none") {
            $("#mdyUnsave").modal();
        } else {
            var triggermdl = $("#mdlName").val();
            $("#mdyUnsave").data("data-triggermdl", $("#" + triggermdl).attr("id"));
            $("#mdyUnsave").modal();
        }
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
})

$("#syssave").click(function() {
    templatefile.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.image = $('#hubImg').val();
    templatefile.$edgeAgent["properties.desired"].systemModules.edgeHub.status = $("#hubStatus").val();
    templatefile.$edgeAgent["properties.desired"].systemModules.edgeHub.restartPolicy = $("#hubPolicy").val();
    templatefile.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.createOptions = JSON.parse($('#hubCo').val());
    templatefile.$edgeAgent["properties.desired"].systemModules.edgeAgent.settings.image = $('#agentImg').val();
    modifyattr = false;

})

$("#mdlsave").click(function() {
    var key = $("#mdlName").text();
    modulenode[key].restartPolicy = $("#mdlPolicy").val();
    modulenode[key].settings.createOptions = JSON.parse($("#mdlCo").val());
    modulenode[key].settings.image = $("#mdlImg").val();
    modulenode[key].status = $("#mdlStatus").val();
    if (templatefile.hasOwnProperty(key)) {
        templatefile[key]["properties.desired"] = JSON.parse($("#mdlMt").val());
    } else if ($("#mdlMt").val() != "") {
        var mdltwin = { "properties.desired": {} };
        mdltwin["properties.desired"] = JSON.parse($("#mdlMt").val());
        templatefile[key] = mdltwin;
    }
    modifyattr = false;
})

$("#mdysave").click(function() {
    modifyattr = false;
    var mdldpl = $("#module-property")[0].style.display;
    var sysdpl = $("#hub-property")[0].style.display;
    if (sysdpl != "none") {
        $("#syssave").click();
        $("#" + $("#mdyUnsave").data("data-triggermdl")).dblclick();
    } else if ($("#mdyUnsave").data("data-triggermdl") === $("#mdlName").text()) {
        $("#mdlsave").click();
        if ($("#mdyUnsave").data("data-triggerpage") != "true") {
            $("#hub-property")[0].style.display = mdldpl;
            $("#module-property")[0].style.display = "none";
        }
    } else {
        $("#mdlsave").click();
        $("#" + $("#mdyUnsave").data("data-triggermdl")).dblclick();
    }
    if ($("#mdyUnsave").data("data-triggerpage") === "true") {
        $("#mdyUnsave").data("data-triggerpage", "false");
        $("#pagesave").click();
    }
})

$("#mdydel").click(function() {
    modifyattr = false;
    var mdldpl = $("#module-property")[0].style.display;
    var sysdpl = $("#hub-property")[0].style.display;
    if (sysdpl != "none") {
        createSystem();
        $("#" + $("#mdyUnsave").data("data-triggermdl")).dblclick();
    } else if ($("#mdyUnsave").data("data-triggermdl") === $("#mdlName").text()) {
        $("#" + $("#mdyUnsave").data("data-triggermdl")).dblclick();
        if ($("#mdyUnsave").data("data-triggerpage") != "true") {
            createSystem();
            $("#hub-property")[0].style.display = mdldpl;
            $("#module-property")[0].style.display = "none";
        }
    } else {
        $("#" + $("#mdlName").val()).dblclick();
        $("#" + $("#mdyUnsave").data("data-triggermdl")).dblclick();
    }
    if ($("#mdyUnsave").data("data-triggerpage") === "true") {
        $("#mdyUnsave").data("data-triggerpage", "false");
        $("#pagesave").click();
    }
})

$(".custom-select").change(function() {
    modifyattr = true;
})

$(".form-control").on("input", function() {
    var triggerelement = $(this).attr("id");
    if (triggerelement.startsWith("txt")) {
        modifyroute = true;
    } else {
        modifyattr = true;
    }
})

jsPlumb.ready(function() {
    // $('.custom-select').select2();
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

    jsPlumb.importDefaults({
        ConnectionOverlays: [
            ["Arrow", { width: 8, length: 8, location: 1, id: "arrow", foldback: 0.623 }]
        ]
    });
    $('#routeattr').on('show.bs.modal', function() {
        if (modifyconn.targetId == "IoTHub") {
            $('#txt_departmentname_input').attr("placeholder", "$upstream");
        } else {
            $('#txt_departmentname_input').attr("placeholder", "");
        }
        if (modifyconn.sourceId == "IoTHub") {
            $('#txt_departmentname_output').attr("placeholder", "$upstream");
        } else {
            $('#txt_departmentname_output').attr("placeholder", "");
        }
    })
    jsPlumb.bind("click", function(conn) {
        modifyconn = conn;
        var outputPort = routings.get(conn.id).spt;
        var inputPort = routings.get(conn.id).tpt;
        var condition = routings.get(conn.id).cdt;
        $('#txt_departmentname_output').val(outputPort);
        $('#txt_departmentname_input').val(inputPort);
        $('#txt_departmentname_cdt').val(condition);
        $('#routeattr').modal();
    });
    jsPlumb.bind("contextmenu", function(conn) {
        deleteconn = conn;
        $('#routedelete').modal();
    });
    jsPlumb.bind("beforeDrop", function(connInfo) {
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
            $("#routeattr").data("data-newline", "true");
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
            $('#txt_departmentname_output').val("");
            $('#txt_departmentname_input').val("");
            $('#txt_departmentname_cdt').val("");
            $('#routeattr').modal();
            return true;
        }
    });
    vscode.postMessage({ text: "start" })
    window.addEventListener('message', event => {
        templatefile = event.data;
        modulenode = templatefile.$edgeAgent["properties.desired"].modules;
        route = templatefile.$edgeHub["properties.desired"].routes;
        display(endpointsource, endpointtarget);
    })
});