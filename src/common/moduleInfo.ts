export class ModuleInfo {
    public readonly moduleName: string;
    public readonly repositoryName: string;
    public readonly imageName: string;
    public readonly debugImageName: string;
    public readonly moduleTwin: object;
    public readonly createOptions: string;
    public readonly debugCreateOptions: string;
    public readonly routes: any[];
    public readonly environmentVariables: any;
    public readonly isPublic: boolean;

    constructor(moduleName: string, repositoryName: string, imageName: string, moduleTwin: object, createOptions: any,
                debugImageName: string, debugCreateOptions: any, routes: any[] = [], environmentVariables: any = null, isPublic = false) {
        this.moduleName = moduleName;
        this.repositoryName = repositoryName;
        this.imageName = imageName;
        this.moduleTwin = moduleTwin;
        this.createOptions = createOptions ? createOptions : {};
        this.debugImageName = debugImageName;
        this.debugCreateOptions = debugCreateOptions ? debugCreateOptions : {};
        this.routes = routes;
        this.environmentVariables = environmentVariables;
        this.isPublic = isPublic;
    }
}
