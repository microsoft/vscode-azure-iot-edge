Vue.component('button-counter', {
    data: function () {
        return {
            count: 0
        };
    },
    template: '<button v-on:click="count++">You clicked me {{ count }} times.</button>'
});

var app = new Vue({
    el: '#app',
    data: {
        message: 'Hello Vue!',
        module: {},
        moduleName: '',
        modules: [{
                id: '1',
                title: 'Temp Sensor',
                description: 'For horizontal centering, you could either add text-align: center to .... '
            },
            {
                id: '222',
                title: 'SQL Server',
                description: 'For horizontal centering, you could either add text-align: center to .... '
            }
        ],
        port: document.getElementById('app').getAttribute('data-port')
    },
    created: function () {
        // `this` points to the vm instance
        console.log('a is: ' + this.port)
    },
    methods: {
        showModule: function (id) {
            this.module = {
                id,
                name: 'MySQL',
                description: 'For horizontal centering, you could either add text-align: center to .... '
            };
        },
        importModule: function () {
            alert(this.moduleName)
        }
    }
});

const vscode = acquireVsCodeApi();

async function getData(type, data) {

    data.type = type;
    vscode.postMessage(data);
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