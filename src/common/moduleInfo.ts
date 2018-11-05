export class ModuleInfo {
    public readonly moduleName: string;
    public readonly repositoryName: string;
    public readonly imageName: string;
    public readonly debugImageName: string;
    public readonly moduleTwin: object;
    public readonly createOptions: string;
    public readonly debugCreateOptions: string;

    constructor(moduleName: string, repositoryName: string, imageName: string, moduleTwin: object, createOptions: string,
                debugImageName: string, debugCreateOptions: string) {
        this.moduleName = moduleName;
        this.repositoryName = repositoryName;
        this.imageName = imageName;
        this.moduleTwin = moduleTwin;
        // TODO: Change to json object
        this.createOptions = createOptions ? createOptions : "{}";
        this.debugImageName = debugImageName;
        this.debugCreateOptions = debugCreateOptions ? debugCreateOptions : "{}";
    }
}
