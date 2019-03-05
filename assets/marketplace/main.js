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
        endpoint: document.getElementById('app').getAttribute('data-endpoint').includes("{{") ? "http://localhost:59372" : document.getElementById('app').getAttribute('data-endpoint'),
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
            return (await axios.get(module.iotEdgeMetadataUrl)).data;
        },
        showModule: async function (module) {
            // this.selectedModule.id = '';
            this.errorMessage = "";
            const metadata = await this.getModuleMetadata(module);
            this.selectedModule = Object.assign({}, module);
            this.selectedModule.metadata = metadata;
            this.selectedTag = this.selectedModule.metadata.tagsOrDigests[0];
        },
        importModule: function () {
            this.errorMessage = "";
            if (!this.moduleName) {
                this.errorMessage = "Module name could not be empty";
                return;
            }
            vscode.postMessage({
                moduleName: this.moduleName,
                imageName: this.selectedModule.metadata.containerUri + ":" + this.selectedTag,
                createOptions: this.selectedModule.metadata.createOptions ? JSON.stringify(this.selectedModule.metadata.createOptions) : "",
                routes: this.selectedModule.metadata.routes,
                twins: this.selectedModule.metadata.twins,
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