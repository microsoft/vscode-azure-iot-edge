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
        endpoint: document.getElementById('app').getAttribute('data-endpoint').includes("{{") ? "http://localhost:50227" : document.getElementById('app').getAttribute('data-endpoint'),
        errorMessage: "",
    },
    created: async function () {
        this.modules = await this.getModules();
        console.log(this.modules )
    },
    methods: {
        getModules: async function () {
            return (await axios.get(`${this.endpoint}/api/v1/modules`)).data;
        },
        getModuleMetadata: async function (module) {
            let data = (await axios.get(module.iotEdgeMetadataUrl)).data;
            let repository;
            let defaultTag;
            let splitArr = data.containerUri.split(":");
            if (splitArr.length > 1) {
                defaultTag = splitArr.pop();
                repository = splitArr.join(":");
            }
            else {
                repository = data.containerUri;
                defaultTag = data.tagsOrDigests[0];
            }

            data.repository = repository;
            data.defaultTag = defaultTag;

            return data;
        },
        showModule: async function (module) {
            // this.selectedModule.id = '';
            this.errorMessage = "";
            const metadata = await this.getModuleMetadata(module);
            this.selectedModule = Object.assign({}, module);
            this.selectedModule.metadata = metadata;
            this.selectedTag = this.selectedModule.metadata.tagsOrDigests[0];
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
            const environmentVariables = {};
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
                imageName: this.selectedModule.metadata.containerUri + ":" + this.selectedTag,
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

async function getData(type, data) {

    data.type = type;
    // vscode.postMessage(data);
    return new Promise((resolve) => {
        window.addEventListener('message', event => {

            const message = event.data; // The JSON data our extension sent

            resolve(event);
        });
    })
}

async function f2() {
    let data = await getData('aa', {
        'aa': 1
    });
    console.log(111)
    console.log(data);
    let data2 = await getData('bb', {
        'vv': 1
    });
    console.log(data2);
    console.log(222)
}
f2();