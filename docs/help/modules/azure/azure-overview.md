---
id: azure-overview
title: Azure Infrastructure dashboard
module: azure
kind: overview
access: platform
route: azure.overview
summary: A read-only view of the platform's Azure cost, compute, databases, storage, containers, monitoring and alerts.
order: 10
status: reviewed
tasks:
  - id: open-azure-dashboard
    label: Open the Azure dashboard
    phrases: [azure dashboard, azure cost, azure alerts, cloud cost, infrastructure monitoring]
    route: azure.overview
keywords: [azure, cost, compute, databases, storage, containers, monitoring, alerts, budget]
---

This screen is for the platform administrator only. It reads information from the Azure subscription. Everything is read-only: nothing here can start, stop, resize or delete a resource. Readings are cached on the server, so figures can be a few minutes old (cost about 30 minutes, resources 15, metrics and health 5).

## What the pages show

- **Overview** summarises daily cost month to date, **Compute**, **SQL**, **Storage** and **Container registry**, each with a **Details** link.
- **Cost** shows **Daily cost** and **Where the money goes**: the current month against the previous month, from Azure Cost Management.
- **Resources** lists the subscription's resources, with a detail page for each.
- **Compute**, **Databases**, **Storage** and **Containers** list virtual machines, SQL servers and databases, storage and container registries.
- **Monitoring** shows **Metrics** for a chosen resource and **Resource health**.
- **Alerts** are generated from live Azure readings: CPU and storage above 70% and 90%, stopped VMs, unhealthy resources and the monitoring budget.
- **Settings** shows the subscription (name, state, main region, subscription and tenant IDs, number of resources), how the dashboard connects, and the access it needs. Nothing here can be changed.
- The **Monitoring budget** card on the **Overview** and **Cost** pages, shown when a monthly budget is set, is your own limit for alerts, not an Azure billing budget. It warns at 75% and is critical at 90%.

If Azure cannot be reached, the page shows "Azure dashboard unavailable" with a **Try again** button.

[Open the Azure dashboard](route:azure.overview)
