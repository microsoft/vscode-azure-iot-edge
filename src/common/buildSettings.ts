export class BuildSettings {
    public readonly options?: string[];
    public readonly contextPath: string;
    public readonly dockerFile: string;

    constructor(dockerFile: string, contextPath: string, options?: string[]) {
        this.dockerFile = dockerFile;
        this.contextPath = contextPath;
        this.options = options;
    }
}
