import * as bodyParser from "body-parser";
import * as express from "express";
import * as fse from "fs-extra";
import * as http from "http";
import * as path from "path";
import * as request from "request-promise";
import * as url from "url";
import * as vscode from "vscode";

import { Constants } from "../common/constants";

export class LocalServer {
    private app: express.Express;
    private server: http.Server;
    private serverPort = 0;
    private router: express.Router;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.initRouter();
        this.initApp();
        this.server = http.createServer(this.app);
        this.context = context;
    }

    public startServer(): void {
        const port = this.server.listen(0).address().port;
        this.serverPort = port;
        // tslint:disable-next-line:no-console
        console.log(this.serverPort);
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
        this.router.get("/api/v1/modules/:module_id", async (req, res, next) => await this.getModuleMetaData(req, res, next));
        // TODO: remove this router after there is host to store metadata.
        this.router.get("/api/v1/metadata/:json_name", async (req, res, next) => await this.tempFetchMetaData(req, res, next));
    }

    private initApp() {
        this.app = express();
        this.app = express();
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

    private async getModules(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const marketplaceResources = this.context.asAbsolutePath(path.join(Constants.assetsFolder, "marketplace", "resources"));
            const itemJson = path.join(marketplaceResources, "itemlist.json");
            const modules = await fse.readJson(itemJson);
            const moduleList: any[] = modules.items;
            const resModuleList = new Array();
            moduleList.forEach((module) => {
                const uri = this.getMetaUri(module.specialArtifacts);
                const moduleDesc = {
                    name: module.name,
                    id: module.id,
                    iconUri: module.iconUri,
                    metaUri: uri,
                };
                resModuleList.push(moduleDesc);
            });
            return res.status(200).json({items: resModuleList});
        } catch (err) {
            next(err);
        }
    }

    private async getModuleMetaData(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            // tslint:disable-next-line:no-console
            console.log(req.params.module_id);
            const uri = req.query.uri;
            if (!uri) {
                throw Error("Please provide the meta data uri");
            }
            const formatUri = this.formatURL(decodeURIComponent(uri));
            const metaData = await request.get(formatUri);
            return res.status(200).json(JSON.parse(metaData));
        } catch (err) {
            next(err);
        }
    }

    private async tempFetchMetaData(req: express.Request, res: express.Response, next: express.NextFunction): Promise<any> {
        // tslint:disable-next-line:no-console
        console.log(req.params.json_name);
        const filePath = this.context.asAbsolutePath(path.join(Constants.assetsFolder, "marketplace", "resources", "modulemetadatas", req.params.json_name));
        const data = await fse.readJson(filePath);
        return res.status(200).json(data);
    }

    private getMetaUri(artifacts: any[]): string|undefined {
        const element = artifacts.find((value, index) => {
            return "iot-edge-metadata.json" === value.name;
        });
        return this.formatURL(element.uri);
    }

    private formatURL(uri: string): string|undefined {
        if (!uri) {
            return undefined;
        }
        const urlObj: url.Url = url.parse(uri);
        if (urlObj.host === null) {
            urlObj.host = this.getServerUri();
        }
        return url.format(urlObj);
    }
}
