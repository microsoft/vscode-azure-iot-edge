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
        modules: [{
                title: 'Foo',
                description: "aaa"
            },
            {
                title: 'Bar',
                description: "aaa"
            }
        ]
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
    let data = await getData("aa", {
        "aa": 1
    });
    console.log(111)
    console.log(data);
    let data2 = await getData("bb", {
        "vv": 1
    });
    console.log(data2);
    console.log(222)
}
f2();
