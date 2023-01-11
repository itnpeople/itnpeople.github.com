---
title:  Kubernetes Network
date:   2022/03/18 9:42
categories: "tip"
tags: ["kubernetes","network"]
keywords: ["kubernetes","network"]
description: Development Tips - Kubernetes Network
---

# {{ page.title }}
> https://kubernetes.io/docs/concepts/cluster-administration/networking/#the-kubernetes-network-model

![Kubernetes 네트워크](https://miro.medium.com/max/1400/1*qq0ioT5k9eazkHH402h3mw.png)
* [출처 - Kubernetes 네트워크 정리](https://sookocheff.com/post/kubernetes/understanding-kubernetes-networking-model/)

## 방화벽 규칙

* [GKE - 자동으로 생성되는 방화벽 규칙](https://cloud.google.com/kubernetes-engine/docs/concepts/firewall-rules?hl=ko)

## DNS

* `<service>.<namespace>.<svc>`
* `<pod>.<namespace>.<pod>`

```
▒ kubectl apply -f https://k8s.io/examples/admin/dns/dnsutils.yaml
▒ kubectl exec -it -n default dnsutils -- nslookup kubernetes.default
```

## Calico

```
▒ kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml
```

* calicoctl

```
▒ curl -L https://github.com/projectcalico/calico/releases/download/v3.24.5/calicoctl-linux-amd64 -o calicoctl
▒ chmod 700 calicoctl
▒ sudo mv calicoctl /usr/local/bin/
▒ sudo calicoctl node status
```

* connection refused

```
# Readiness probe failed: calico/node is not ready: BIRD is not ready: Error querying BIRD: unable to connect to BIRDv4 socket: dial unix /var/run/calico/bird.ctl: connect: connection refused

▒ kubectl set env daemonset/calico-node -n kube-system IP_AUTODETECTION_METHOD=interface=eth*
```