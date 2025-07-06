# Deployment View – System Deployment Overview

This document describes how the system is deployed using Docker containers, and how components communicate within the deployment environment.

## Deployment Description

- The application is containerized using Docker Compose.
- It includes the following containers:
  - **nginx**: Serves static frontend files and acts as a reverse proxy to the backend.
  - **backend**: FastAPI server with business logic, exposed behind nginx.
  - **db**: PostgreSQL database container used to store user data, history, and notifications.

## Network and Communication

- All containers are connected to the same internal Docker network.
- Nginx forwards incoming HTTP requests from clients to the backend.
- The backend communicates with the PostgreSQL database to read/write data.

## Diagram

See the deployment diagram below:
![static-view.png](https://img.plantuml.biz/plantuml/png/bLDDQnin4BtlhtZub83Tz5ZsKEBO11TQr-ccv51wa7UdQv5ToT7CnZ6b_xqZxGSKqa9XFwHvJpDwcgTh5XEaQvjCh3I4DHqRVsx92TRMrC6qELO78tilACuirE9Ywx7pGVWoovol2BErBnyfOEDPPZ2S1lYP0Vhyy4sbsCZPafnyUCnHzaaNZdHDv2Osq6TSUIV6EWevN6tTIqgRHWCN-BPDqmVQew3mJE7x03WlX63hWmm1u0ifpeHTy2_dAReiIpgARlV-VdSLFmK2FNN4mXFdreUJ2HLF2CHZRrIBgt1nQrYMkm-N0pt6OlKq_PMzhcTOd1IDYIPDGq8iZyV6baQiT_-G5PcSj2DqpbbNmpgsMh0SwqtSZN5LGrgoOuqpe_6rBUSmdHoqsqEnUUfBZ_sFg4_dukuZraRCtZ0bRUsPdvf9MJL0cFNKTs_U9jRwvk_oTjepgvPJBxBuO6fIDmLqAZdbcwDL8HhcrxSQNzrmsVYkmknhN7OJ_4d_gVIgiPfwX9TLQnskz08yVpvo8gHGblKyB1Rl1mVcoJ5ggkG8lGGf6l6ndtyoHXDfVx9if4HwVqJvT6wuwoXObPFrkucST9To5CKc-PKLlDRrySR-1W00)
