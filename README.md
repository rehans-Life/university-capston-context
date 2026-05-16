# University-capston-context

### Location Service

#### V1

`generateRoute`: Calculate ETAs for the deliveries through Google API

#### V2

`generateRoute`: Automated Optimized Routing algorithm for drives

### Dashboard API Service

`routing-service`: Confifuring Computing, Analyzing and Approving automated routes for drivers through the dashboard app

### Dashboard App

`Automating Routing`: UI for for Confifuring Computing, Analyzing and Approving automated routes for drivers through the dashboard app

### Driver API

Backend for the driver app 

### Driver APP

#### Mobile App for drivers

#### Views

1. Deliveries: Drivers can form there own route by selecting deliveries on the map
2. DeliveriesV2: Drivers will be shown the automated routes approved by the admin on the dashboard app

### libs

#### Entities:

1. Delivery Entity: Entity for deliveries
2. Subscription Entity: User's subscriptions
3. MapEntity: Creating delivery zones and assigning drivers to different zones creating with in the map
4. Route Plan Entity: Route plan created for the driver in which we store the deliveries assigned to the driver
5. Delivery Estimation Entity: Store user's delivery's ETA's which keeps a history of the eta's generated for a user for there deliveries of past two days. We use this to display the eta's for the user's delivery on the app
6. Routing Config Entity: Automated Routing Configuration entity

#### Providers

1. Google Route Provider: Used for calculating eta's through google routes api
2. Google Time Window Provider: Used for calculating optimized routes based on routing config

## Services

1. Route Plan Service: Used for assigning deliveries to drivers
