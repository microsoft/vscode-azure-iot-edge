(function () {
  let vscode = null;
  class LogicalDevice {
    constructor(deviceId, platform, deviceName) {
      this.deviceId = deviceId;
      this.deviceName = deviceName;
      this.platform = platform;
    }

    static fromObject(obj, allDevices) {
      if (!obj.deviceId) {
        throw Error(`The device id missing`);
      }
      if (!obj.platform) {
        throw Error(`The platform missing`);
      }
      let name = allDevices.find(d => d.id === obj.deviceId).name;
      return new this(obj.deviceId, obj.platform, name);
    }

    equals(b) {
      return this.deviceId === b.deviceId && this.platform === b.platform;
    }

    toString() {
      return `${this.deviceName} (${this.platform})`;
    }
  }

  function addToArrayWithoutDup(logicalDevice, list) {
    if (!list.find(device => device.equals(logicalDevice))) {
      list.push(logicalDevice);
    }
  }

  Vue.component('v-select', VueSelect.VueSelect);

  new Vue({
    el: '#example',
    data: {
      version: '',
      publishDate: '',
      featuredExample: null,
      examples: [],
      blogs: [],
      boardId: '',
      logicalDevices: [],
      selectedLogicalDevice: null,
    },
    created: function () {
      const query = this.parseQuery(location.href);
      const url = query.url ||
        'https://raw.githubusercontent.com/Azure-Samples/vscode-azure-iot-edge-sample-gallery/master/sample-gallery.json';
      this.boardId = query.board || '';
      window.addEventListener('resize', () => {
        this.adjustFilterWidth();
      });
      this.httpRequest(url, function (data) {
        let examples = [];
        let allPlatforms = [];
        let allDevices = [];
        try {
          if (data) {
            data = JSON.parse(data);
            examples = data.samples;
            allPlatforms = data.platforms;
            allDevices = data.devices;
          }
        } catch (error) {
          // ignore
        }

        for (let i = 0; i < examples.length; i++) {
          for (let j = 0; j < examples[i].supportDevices.length; j++) {
            let device = examples[i].supportDevices[j];
            if (!device.deviceId || !device.platform) {
              throw Error(`Missing property deviceId or platform for sample ${examples[i].name}`);
            }
            if (!allDevices.find(d => d.id === device.deviceId)) {
              throw Error(`The device id ${device.deviceId} is not in the list ${JSON.stringify(allDevices)}`);
            }
            if (!allPlatforms.includes(device.platform)) {
              throw Error(`The platform ${device.platform} is not in the list ${JSON.stringify(allPlatforms)}`);
            }
            let logicalDevice = LogicalDevice.fromObject(device, allDevices);
            addToArrayWithoutDup(logicalDevice, this.logicalDevices);
            examples[i].supportDevices[j] = logicalDevice;
          }
          if (examples[i].featured && !this.featuredExample) {
            this.featuredExample = examples.splice(i, 1)[0];
            i--;
          }
        }
        this.examples = examples;

        this.$nextTick(function () {
          this.adjustFilterWidth();
        })
      }.bind(this));
    },
    methods: {
      getProjectName: function (example) {
        if (example.project_name) {
          return example.project_name;
        }

        if (example.name) {
          let project_name = example.name.replace(/[^a-z0-9]/ig, '_').toLowerCase();
          return project_name;
        }

        return 'example_' + new Date().getTime();
      },
      openSample: function (sample, url, boardId, event) {
        let platform = null;
        // If user has a device filter, then it will set the platform as the first device filter match the sample
        // else it will set the platform as the first support devices platform in the sample
        if (this.selectedLogicalDevice) {
          let supportedPlatforms = sample.supportDevices.map(device => device.platform);
          if (supportedPlatforms.includes(this.selectedLogicalDevice.value.platform)) {
            platform = this.selectedLogicalDevice.value.platform;
          }
        }

        if (platform === null) {
          platform = sample.supportDevices[0].platform;
        }

        let name = this.getProjectName(sample);
        if (!vscode) vscode = acquireVsCodeApi();
        vscode.postMessage({
          command: 'openSample',
          name,
          url,
          platform,
        });

        // release the focus. Or when press enter in "set sample name", the enter event will be passed to the webview and trigger the focused element again
        document.activeElement.blur();
      },
      openLink: function (url) {
        if (!url) {
          return;
        }
        if (!vscode) vscode = acquireVsCodeApi();
        vscode.postMessage({
          command: 'openLink',
          url,
        });
      },
      adjustFilterWidth: function () {
        // Code that will run only after the
        // entire view has been re-rendered
        let num = Math.floor(this.$refs.elist.$el.offsetWidth / (320 + 20));
        console.log(this)
        this.$refs.filter.$el.style.width = `${num * (320 + 20) - 20}px`;
      },
      httpRequest: function (url, callback) {
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              if (callback) {
                callback(xhr.responseText);
              }
            } else {
              if (callback) {
                callback(null);
              }
            }
          }
        }
        xhr.open('GET', url, true);
        xhr.send();
      },
      parseQuery: function (url) {
        if (url.indexOf('?') < 0) {
          return {};
        }
        const query = url.split('?')[1].split('&');
        let res = {};
        query.forEach(q => {
          const item = q.split('=');
          res[item[0]] = item[1] ? decodeURIComponent(item[1]) : undefined;
        });

        return res;
      }
    },
    computed: {
      logicalDeviceOptions: {
        get: function () {
          return this.logicalDevices.map(d => ({
            label: d.toString(),
            value: d,
          }));
        }
      },
      selectedExamples: {
        get: function () {
          if (!this.selectedLogicalDevice) return this.examples;
          return this.examples.filter(e => {
            for (let device of e.supportDevices) {
              if (device.equals(this.selectedLogicalDevice.value)) return true;
            }
            return false;
          })
        }
      }
    }
  });
})();
