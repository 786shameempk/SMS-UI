---
id: transport-buses-tracking
title: Add buses and drivers, and choose how buses are tracked
module: transport
kind: task
access: public
route: transport.home
summary: Register buses and drivers, then choose whether parents see a demo, the driver's phone or a hardware GPS tracker.
order: 10
status: reviewed
related: [transport-driver-trip]
tasks:
  - id: add-bus
    label: Add a bus
    phrases: [add a bus, new bus, register a bus, add school bus]
    route: transport.home
  - id: add-driver
    label: Add a driver
    phrases: [add a driver, new driver, register driver profile]
    route: transport.home
  - id: set-tracking-source
    label: Choose how buses are tracked
    phrases: [bus tracking setup, set up bus tracking, track school bus, gps tracking, choose tracking source]
    route: transport.home
keywords: [bus, driver, gps, tracking, license, capacity, route, device id]
---

Use this to set up the fleet. You need the transport permission that lets you manage transport; without it, the page tells you to ask an administrator for **Manage transport** or **Drive a bus trip**.

## Add a bus

1. Open **Transport** from the menu. The page is headed **Transport management**.
2. Open the **Buses** tab and select **New bus**.
3. Enter the **Registration number**, **Model**, **Seating capacity** and **Manufacture year**. A **GPS device ID** is optional.
4. Set the **Status**: Active, Maintenance or Inactive.
5. Select **Add bus** ("Bus added").

The checks are "Registration number is required", "Model is required" and "Must seat at least one".

## Add a driver

1. Add the person in **Staff Management** with the designation "Driver". The driver form lists only eligible staff and says so when there are none.
2. Open the **Drivers** tab and select **New driver**.
3. Choose the **Staff member**, and enter the **License number**, **License expiry** and **Experience (years)**.
4. Set the **Status**: Active, On leave or Inactive, and select **Add driver**.

## Choose how parents see the bus

1. Open the **Tracking setup** tab. It asks **How should parents see the bus?**
2. Choose one of the three options:
   - **Demo (simulated)**: no real GPS; buses move along their route when staff simulate a GPS ping. Use it for demos and training.
   - **Driver's phone**: the driver shares their phone's location during a trip. See [Share a bus's location from a driver's phone](help:transport-driver-trip).
   - **Hardware GPS tracker per bus**: a device in each bus sends its location. Enter the device ID against each bus.
3. Select **Save**. The current choice is marked **Current**, and "Tracking source saved" appears.

[Open Transport](route:transport.home)
