#!/bin/bash
# Remove the problematic setEntityManagers calls
sed -i.bak '227s/setEntityManagers(managers);/\/\/ setEntityManagers(managers);/' src/components/shipments/ShipmentForm.js
sed -i.bak '233s/setEntityManagers(managers);/\/\/ setEntityManagers(managers);/' src/components/shipments/ShipmentForm.js
sed -i.bak '238s/setEntityManagers(\[\]);/\/\/ setEntityManagers(\[\]);/' src/components/shipments/ShipmentForm.js
