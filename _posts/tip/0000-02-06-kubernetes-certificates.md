---
title:  Kubernetes Certificates
date:   2022/11/16 9:21
categories: "tip"
tags: ["kubernetes","kubeadm","certificates"]
keywords: ["kubernetes","kubeadm","certificates"]
description: Development Tips - Kubernetes certificates
---

# {{ page.title }}

**Table of Contents**

* [인증서 수동 갱신](#manual-certificate-renewal)


## Manual certificate renewal
> Control-Plane 각각에 대해서 실행

* Check certificate expiration
```
$ sudo kubeadm certs check-expiration
```

* 인증서 백업
```
$ sudo cp -r /etc/kubernetes/pki /etc/kubernetes/pki.$(date "+%Y%m%d%H%M")
```

* 인증서 갱신
```
$ sudo kubeadm certs renew all
```

* static pod 재시작
```
sudo kill -s SIGHUP $(pidof kube-apiserver) $(pidof kube-controller-manager) $(pidof kube-scheduler)
sudo systemctl restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart containerd
```

### 참고
* [Certificate Management with kubeadm](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
* [PKI certificates and requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)

