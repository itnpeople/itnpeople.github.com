---
title:  Kubernetes Monitoring
date:   2022/03/18 9:42
categories: "tip"
tags: ["kubernetes","metrics","monitoring", "promethus"]
keywords: ["kubernetes","metrics","monitoring","promethus"]
description: Development Tips - Kubernetes Monitoring
---

# {{ page.title }}

**Table of Contents**

* [Metrics](#metrics)
* [Promethus](#promethus)


## Metrics

### 단위
* Ki 1024
* Mi 1024x1024
* Gi 1024x1024x1024
* Ti 1024x1024x1024x1024
* Pi 1024x1024x1024x1024x1024
* M 1000x1000
* 예
  * 32M = 32,000,000
  * 32Mi = 33,554,432

#### CPU
* 0.1 = 100m
* 1 = 1,000m

#### client-go

* node.Status.Allocatable.Cpu().Value() - core 단위
* node.Status.Allocatable.Cpu().MilliValue() - m 단위
* node.Status.Allocatable.Memory().Value() - byte 단위

### Metrics-Server

* kubectl

```
$ kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes/vm-live-01 | jq
$ kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/default/pods/busybox | jq

$ kubectl top po details-v1-79f774bdb9-l4l79  -n bookinfo --containers
```

### Node Exporter

* run docker-compose

```
$ docker-compose -f node-exporter.yaml up -d
$ docker-compose -f node-exporter.yaml down
```
```
version: "3.8"

services:
  node_exporter:
    image: quay.io/prometheus/node-exporter:latest
    ports:
      - 9100:9100
    container_name: node_exporter
    command: --path.procfs /host/proc --path.sysfs /host/sys
    pid: host
    restart: unless-stopped
    volumes:
      - /proc:/host/proc
      - /sys:/host/sys
      - /:/rootfs
```

* run docker

```
docker run --rm -d --name node-exporter \
  -p 9100:9100 \
  --pid="host" \
  -v "/proc:/host/proc" \
  -v "/sys:/host/sys" \
  -v "/:/rootfs" \
  quay.io/prometheus/node-exporter:latest \
  --path.procfs /host/proc --path.sysfs /host/sys
```

## Promethus

### Configuration
* https://prometheus.io/docs/prometheus/latest/configuration/configuration/

#### Reload configuration

```
$ kubectl port-forward svc/prometheus 9090
$ curl -X POST http://localhost:9090/-/reload
```

### Admin API Enable
* https://prometheus.io/docs/prometheus/latest/querying/api/
* Default로 disabled 되어 있으므로 Admin API 를 사용하기 위해서는 prometheus deployment args 에 `--web.enable-admin-api` 옵션 추가

```
....

  containers:
  - args:
    - --storage.tsdb.retention.time=15d
    - --config.file=/etc/config/prometheus.yml
    - --storage.tsdb.path=/data
    - --web.console.libraries=/etc/prometheus/console_libraries
    - --web.console.templates=/etc/prometheus/consoles
    - --web.enable-lifecycle
    - --web.enable-admin-api
    image: prom/prometheus:v2.19.0
....
```

####  Clean-up metrics data

* 아래 Admin-API를 요청하면 데이터 삭제
  * `POST /api/v1/admin/tsdb/clean_tombstones`
  * `PUT /api/v1/admin/tsdb/clean_tombstones` 
* HTTP response status code 가 204로 리턴되면 성공
* 실행 예

```
$ curl -XPOST http://localhost:9090/api/v1/admin/tsdb/clean_tombstones
```