# Graphic UI for Azure IoT Edge deployment
*This extension provides a graphic UI to help configure properties of IoT Edge instead of editting deployment.template.json.*
## Features
The graphic UI provides property bars to support filling or selection operations and a drag-and-drop canvas to display routing message in network topologies.
### Start up
Right click on deployment.template.json and select “Modify IoT Edge Deployment Manifest”, then UI will be opened.
### System properties
System properties include edgeAgent and edgeHub json values in the deployment file. Click on the button "Edit System Properties" in Navigation Bar will trigger the display of system.
- "Done" button saves all the modifications.
- "Cancel" button will discard all the modifications from last saving operation.
### Module properties
Module properties include all the module json values in the deployment file. Double click on each module in the middle canvas will trigger the display of module properties.
### Routing properties
Routing properties between modules are shown as network topologies. The arrow on each line presents the routing direction.
- Click on each line will show detailed routing information which supports editting.
- Right click can delete the selected routing.
- Drag a line from a module to anther will establish a new routing.
- Redrag an existing line will delete a current routing and establish a new one.
If the necessary information is not filled out, then the routing will be deleted.
### Save
Click on the button "Save" in Navigation Bar will write modifications back to deployment.template.json file.
## TODO
- Add and delete modules
- Check consistency before write back
- Zoom in/out
- Distinguish connections at the endpoint