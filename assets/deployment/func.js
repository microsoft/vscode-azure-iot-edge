function createSystem() {
    var hubPro = message.$edgeAgent["properties.desired"].systemModules.edgeHub;
    var agentPro = message.$edgeAgent["properties.desired"].systemModules.edgeAgent;
    var hubstatus = hubPro.status;
    var hubpolicy = hubPro.restartPolicy;
    $("#hubImg").val(hubPro.settings.image);
    $("#hubCo").val(JSON.stringify(hubPro.settings.createOptions));
    $("#hubStatus").find("option:contains(\"" + hubstatus + "\")").prop("selected", true);
    $("#hubPolicy").find("option:contains(\"" + hubpolicy + "\")").prop("selected", true);
    $("#agentImg").val(agentPro.settings.image);
}

function createUpstream(i, connection, connectionnew) {
    var $canvas = $("#canvas");
    var $newdiv = $("<div class='module' id= 'IoTHub'></div>");
    $newdiv.text("upstream");
    $newdiv.css({ position: "absolute", top: 70 + i * 70, left: 70 + i * 30, 'background-color': "rgb(40, 104, 187)" });
    $canvas.append($newdiv);
    jsPlumb.addEndpoint('IoTHub', { uuid: "IoTHubports" }, connection);
    jsPlumb.addEndpoint('IoTHub', { uuid: "IoTHubportt" }, connectionnew);
    var divsWithWindowClass = jsPlumb.getSelector(".module");
    jsPlumb.draggable(divsWithWindowClass);
}

function createModules(key, i, connection, connectionnew) {
    var $canvas = $("#canvas");
    var $newdiv = $("<div class='module' id=\"" + key + "\"></div>");
    $newdiv.text(key);
    $newdiv.css({ position: "absolute", 'top': 70 + i * 70, 'left': 70 + i * 30 });
    $canvas.append($newdiv);
    $newdiv.bind("dblclick", function() {
        var key = $(this).attr("id");
        var mdltwin = {};
        if (message.hasOwnProperty(key)) {
            mdltwin = message[key]["properties.desired"];
        }
        if (modifyflag) {
            $("#mdyUnsave").data("data-triggermdl", $(this).attr("id"));
            $("#mdyUnsave").modal();
        } else {
            var mdldpl = $("#module-property")[0].style.display;
            var sysdpl = $("#hub-property")[0].style.display;
            if (sysdpl !== "none") {
                $("#module-property")[0].style.display = sysdpl;
                $("#hub-property")[0].style.display = "none";
            } else if ($("#mdlName").val() === key) {
                $("#hub-property")[0].style.display = mdldpl;
                $("#module-property")[0].style.display = "none";
            }
            $("#mdlName").text(key);
            $("#mdlName").val(key);
            $("#mdlImg").val(moduleNode[key].settings.image);
            $("#mdlCo").val(JSON.stringify(moduleNode[key].settings.createOptions));
            $("#mdlMt").val(JSON.stringify(mdltwin));
            var mdlstatus = moduleNode[key].status;
            $("#mdlStatus").find("option:contains(\"" + mdlstatus + "\")").prop("selected", true);
            var mdlpolicy = moduleNode[key].restartPolicy;
            $("#mdlPolicy").find("option:contains(\"" + mdlpolicy + "\")").prop("selected", true);
        }
    });
    jsPlumb.addEndpoint(key, { uuid: key + "ports" }, connection);
    jsPlumb.addEndpoint(key, { uuid: key + "portt" }, connectionnew);
    var divsWithWindowClass = jsPlumb.getSelector(".module");
    jsPlumb.draggable(divsWithWindowClass);
}

function setRoute(route, connection) {
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
        var conn = jsPlumb.connect({
            uuids: [oMdlName + "ports", iMdlName + "portt", ],
            connection,
            overlays: [
                ["Arrow", { width: 8, length: 8, location: 1, id: "arrow", foldback: 0.623 }]
            ]
        });
        conn.id = oMdlName + "To" + iMdlName;
        var rjson = { "smdl": oMdlName, "spt": oMdlPort, "tmdl": iMdlName, "tpt": iMdlPort, "cdt": cdt };
        routings.set(conn.id, rjson);
    }
}

function display(connection, connectionnew) {
    createSystem();
    var i = 1;
    for (var key in moduleNode) {
        createModules(key, i, connection, connectionnew);
        i++;
    }
    createUpstream(i, connection, connectionnew);
    setRoute(route, connection);
}

$("#deletecon").click(function() {
    routings.delete(deleteconn.id);
    jsPlumb.detach(deleteconn);
})

$("#popsave").click(function() {
    if (modifyflag) {
        var connid = modifyconn;
        routings.get(connid).spt = $("#txt_departmentname_output").val();
        routings.get(connid).tpt = $("#txt_departmentname_input").val();
        routings.get(connid).cdt = $("#txt_departmentname_cdt").val();
        modifyflag = false;
    }
})

$("#popclose").click(function() {
    if (modifyflag) {
        modifyflag = false;
    }
})

$("#pagesave").click(function() {
    if (modifyflag) {
        var triggermdl = $("#mdlName").val();
        $("#" + triggermdl).dblclick();
        $("#module-property")[0].style.display = $("#hub-property")[0].style.display;
        $("#hub-property")[0].style.display = "none";
    }
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
    message.$edgeHub["properties.desired"].routes = route;
    vscode.postMessage({ text: message })
})

$("#syssave").click(function() {
    message.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.image = $('#hubImg').val();
    message.$edgeAgent["properties.desired"].systemModules.edgeHub.status = $("#hubStatus").val();
    message.$edgeAgent["properties.desired"].systemModules.edgeHub.restartPolicy = $("#hubPolicy").val();
    message.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.createOptions = JSON.parse($('#hubCo').val());
    message.$edgeAgent["properties.desired"].systemModules.edgeAgent.settings.image = $('#agentImg').val();
    modifyflag = false;

})

$("#mdlsave").click(function() {
    var key = $("#mdlName").text();
    moduleNode[key].restartPolicy = $("#mdlPolicy").val();
    moduleNode[key].settings.createOptions = JSON.parse($("#mdlCo").val());
    moduleNode[key].settings.image = $("#mdlImg").val();
    moduleNode[key].status = $("#mdlStatus").val();
    if (message.hasOwnProperty(key)) {
        message[key]["properties.desired"] = JSON.parse($("#mdlMt").val());
    } else if ($("#mdlMt").val() != "") {
        var mdltwin = { "properties.desired": {} };
        mdltwin["properties.desired"] = JSON.parse($("#mdlMt").val());
        message[key] = mdltwin;
    }
    modifyflag = false;
})

$("#mdysave").click(function() {
    var mdldpl = $("#module-property")[0].style.display;
    var sysdpl = $("#hub-property")[0].style.display;
    if (sysdpl != "none") {
        $("#syssave").click();
        $("#" + $("#mdyUnsave").data("data-triggermdl")).dblclick();
    } else if ($("#mdyUnsave").data("data-triggermdl") === $("#mdlName").text()) {
        $("#mdlsave").click();
        $("#hub-property")[0].style.display = mdldpl;
        $("#module-property")[0].style.display = "none";
    } else {
        $("#mdlsave").click();
        $("#" + $("#mdyUnsave").data("data-triggermdl")).dblclick();
    }
})

$("#mdydel").click(function() {
    modifyflag = false;
    var mdldpl = $("#module-property")[0].style.display;
    var sysdpl = $("#hub-property")[0].style.display;
    if (sysdpl != "none") {
        createSystem();
        $("#" + $("#mdyUnsave").data("data-triggermdl")).dblclick();
    } else if ($("#mdyUnsave").data("data-triggermdl") === $("#mdlName").text()) {
        $("#" + $("#mdyUnsave").data("data-triggermdl")).dblclick();
        createSystem();
        $("#hub-property")[0].style.display = mdldpl;
        $("#module-property")[0].style.display = "none";
    } else {
        $("#" + $("#mdlName").val()).dblclick();
        $("#" + $("#mdyUnsave").data("data-triggermdl")).dblclick();
    }
})

$(".custom-select").change(function() {
    modifyflag = true;
})

$(".form-control").on("input", function() {
    modifyflag = true;
})

jsPlumb.ready(function() {
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

    var connection = {
        anchor: "LeftMiddle",
        endpoint: ["Dot", { radius: 3 }],
        paintStyle: { fillStyle: "#316b31" },
        isSource: true,
        scope: "green dot",
        connectorStyle: connectorPaintStyle,
        hoverPaintStyle: endpointHoverStyle,
        connectorHoverStyle: connectorHoverStyle,
        connector: ["Bezier", { curviness: 63 }],
        dropOptions: exampleDropOptions,
        deleteEndpointsOnDetach: false,
        maxConnections: -1,
        ConnectionOverlays: [
            ["Arrow", { width: 8, length: 8, location: 1, id: "arrow", foldback: 0.623 }]
        ]
    };
    var connectionnew = {
        anchor: "Right",
        endpoint: ["Dot", { radius: 3 }],
        paintStyle: { fillStyle: "#316b31" },
        scope: "green dot",
        connectorStyle: connectorPaintStyle,
        hoverPaintStyle: endpointHoverStyle,
        connectorHoverStyle: connectorHoverStyle,
        connector: ["Bezier", { curviness: 63 }],
        isTarget: true,
        dropOptions: exampleDropOptions,
        deleteEndpointsOnDetach: false,
        maxConnections: -1,
        ConnectionOverlays: [
            ["Arrow", { width: 8, length: 8, location: 1, id: "arrow", foldback: 0.623 }]
        ]
    };
    jsPlumb.importDefaults({
        ConnectionOverlays: [
            ["Arrow", { width: 8, length: 8, location: 1, id: "arrow", foldback: 0.623 }]
        ]
    });
    jsPlumb.bind("click", function(conn) {
        modifyconn = conn.id;
        var outputPort = routings.get(conn.id).spt;
        var inputPort = routings.get(conn.id).tpt;
        var condition = routings.get(conn.id).cdt;
        $('#txt_departmentname_output').val(outputPort);
        $('#txt_departmentname_input').val(inputPort);
        $('#txt_departmentname_cdt').val(condition);
        $('#exampleModal').modal();
    });
    jsPlumb.bind("contextmenu", function(conn) {
        deleteconn = conn;
        $('#delpop').modal();
    });
    jsPlumb.bind("beforeDrop", function(connInfo) {
        if (connInfo.sourceId === connInfo.targetId) {
            return false
        } else {
            var outputmdl = connInfo.sourceId;
            var inputmdl = connInfo.targetId;
            connInfo.connection.id = outputmdl + "To" + inputmdl;
            modifyconn = connInfo.connection.id;
            var rjson = { "smdl": outputmdl, "spt": "", "tmdl": inputmdl, "tpt": "", "cdt": "" };
            routings.set(connInfo.connection.id, rjson);
            $('#txt_departmentname_output').val("");
            $('#txt_departmentname_input').val("");
            $('#txt_departmentname_cdt').val("");
            $('#exampleModal').modal();
            return true;
        }
    });

    display(connection, connectionnew);

});