let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {
    
}

const app = new Vue({
    el: '#app',
    data: {
        message: 'Hello Vue!',
        searchInput: '',
        selectedModule: {},
        selectedTag: "",
        moduleName: '',
        modules: [],
        endpoint: document.getElementById('app').getAttribute('data-endpoint'),
        errorMessage: "",
    },
    created: async function () {
        this.modules = await this.getModules();
    },
    methods: {
        getModules: async function () {
            return (await axios.get(`${this.endpoint}/api/v1/modules`)).data;
        },
        getModuleMetadata: async function (module) {
            const data = (await axios.get(module.iotEdgeMetadataUrl)).data;
            let repository = data.containerUri;
            let defaultTag = data.tagsOrDigests[0];
            let splitArr = data.containerUri.split(":");
            if (splitArr.length > 1) {
                const tag = splitArr.pop();
                if (data.tagsOrDigests.includes(tag)) {
                    repository = splitArr.join(":");
                    defaultTag = tag;
                }
                
            }

            data.repository = repository;
            data.defaultTag = defaultTag;

            return data;
        },
        showModule: async function (module) {
            this.errorMessage = "";
            const metadata = await this.getModuleMetadata(module);
            this.selectedModule = Object.assign({}, module);
            this.selectedModule.metadata = metadata;
            this.selectedTag = this.selectedModule.metadata.defaultTag;
        },
        importModule: async function () {
            this.errorMessage = "";
            if (!this.moduleName) {
                this.errorMessage = "Module name could not be empty";
                return;
            }
            const moduleNameValidationStatus = (await axios.get(`${this.endpoint}/api/v1/modules/${this.moduleName}/status`)).data;
            if (moduleNameValidationStatus) {
                this.errorMessage = moduleNameValidationStatus;
                return;
            }
            const environmentVariables = undefined;
            if (this.selectedModule.metadata.environmentVariables) {
                for (const environmentVariable of this.selectedModule.metadata.environmentVariables) {
                    environmentVariables[environmentVariable.name] = {
                        value: environmentVariable.value
                    }
                }
            }
            let twins = undefined;
            if (this.selectedModule.metadata.twins && this.selectedModule.metadata.twins.length > 0) {
                const twinObject = {};
                for (const twin of this.selectedModule.metadata.twins) {
                    twinObject[twin.name] =  twin.value
                }
                twins = {
                    "properties.desired": twinObject
                }
            }
            vscode.postMessage({
                moduleName: this.moduleName,
                imageName: this.selectedModule.metadata.repository + ":" + this.selectedTag,
                createOptions: this.selectedModule.metadata.createOptions, //? JSON.stringify(this.selectedModule.metadata.createOptions) : "",
                routes: this.selectedModule.metadata.routes,
                twins,
                environmentVariables,
            });
        }
    },
    computed: {
        filteredModules: function () {
            return this.modules.filter(module => {
                return module.displayName.toLowerCase().includes(this.searchInput.toLowerCase());
            });
        }
    }
});
