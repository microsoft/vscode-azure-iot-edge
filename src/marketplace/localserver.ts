import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as request from "request-promise";
import * as vscode from "vscode";
import { Utility } from "../common/utility";

export class LocalServer {
    private app: express.Express;
    private server: http.Server;
    private serverPort = 0;
    private router: express.Router;
    private context: vscode.ExtensionContext;
    private _modules: string[];

    constructor(context: vscode.ExtensionContext) {
        this.initRouter();
        this.initApp();
        this.server = http.createServer(this.app);
        this.context = context;
    }

    set modules(modules: string[]) {
        this._modules = modules;
    }

    public startServer(): void {
        const port = this.server.listen(0).address().port;
        this.serverPort = port;
        // tslint:disable-next-line:no-console
        console.log("serverPort:" + this.serverPort);
    }

    public stopServer(): void {
        this.server.close(null);
    }

    public getServerUri(): string {
        return `http://localhost:${this.serverPort}`;
    }

    private initRouter() {
        this.router = express.Router();
        this.router.get("/api/v1/modules", async (req, res, next) => await this.getModules(req, res, next));
        this.router.get("/api/v1/modules/:module/status", async (req, res, next) => await this.validateModuleName(req, res, next));
    }

    private initApp() {
        this.app = express();
        this.app.all("*", (req, res, next) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            next();
        });
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: true}));
        this.app.use("/", this.router);
        this.app.use("*", (req, res) => {
            res.status(404).json({ error: "I don\'t have that" });
        });
        this.app.use("*", (err, req, res, next) => {
            if (err) {
              res.status(500).json({error: err.toString()});
            } else {
              res.status(404).json({error: "I don\'t have that"});
            }
        });
    }

    private async validateModuleName(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const moduleName = req.params.module;
            const errorMessage = await Utility.validateInputName(moduleName) || Utility.validateModuleExistence(moduleName, this._modules) || "";
            return res.status(200).send(errorMessage);
        } catch (err) {
            next(err);
        }
    }

    private async getModules(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            let apiUrl = "https://catalogapi.azure.com/offers/?api-version=2018-08-01-beta&$filter=categoryIds/any(c:%20c%20eq%20%27microsoft-iot-edge-module%27)";
            let items = [];
            const result = [];
            while (apiUrl != null) {
                const modulesList = JSON.parse(await request.get(apiUrl));
                apiUrl = modulesList.nextPageLink;
                items = items.concat(modulesList.items);
            }

            items.forEach((item) => {
                if (item.id !== "microsoft.stream-analytics-on-iot-edge") {
                    if (item.plans && item.plans[0] && item.plans[0].artifacts) {
                        const metaData = item.plans[0].artifacts.find((artifact) => artifact.name === "iot-edge-metadata.json");
                        if (metaData !== null) {
                            item.iotEdgeMetadataUrl = metaData.uri;
                        } else {
                            item.iotEdgeMetadataUrl = null;
                        }
                    }

                    const iconFileUris = item.iconFileUris;
                    if (iconFileUris && iconFileUris.small) {
                        item.icon = iconFileUris.small;
                    } else {
                        item.icon = null;
                    }

                    if (item.iotEdgeMetadataUrl) {
                        result.push(item);
                    }
                }
            });

            return res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }
}
