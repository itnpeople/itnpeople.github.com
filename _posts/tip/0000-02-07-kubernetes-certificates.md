---
title:  Kubernetes Certificate
date:   2022/11/16 9:21
categories: "tip"
tags: ["kubernetes","kubeadm","certificates"]
keywords: ["kubernetes","kubeadm","certificates"]
description: Development Tips - Kubernetes Certificate
---

# {{ page.title }}

**Table of Contents**

* [Self-sign SSL Certificate](#self-sign-ssl-certificate)
* [인증서 수동 갱신](#manual-certificate-renewal)

## Self-sign SSL certificate
> 모든 인증서는 발급기관(CA) 이 있어야 하나 최상위에 있는 인증기관(root ca)은 서명해줄 상위 인증기관이 없으므로 root ca의 개인키로 스스로의 인증서에 서명하여 최상위 인증기관 인증서를 만든다. 이렇게 스스로 서명한 ROOT CA 인증서를 Self Signed Certificate 라고 부른다.

* Self-sign 인증서 생성

```
▒ KEY_FILE=server.key
▒ CERT_FILE=server.crt
▒ CERT_NAME=docker-registry-tls-cert
▒ IP=101.55.69.105

# 인증서 생성
▒ openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ${KEY_FILE} -out ${CERT_FILE} -subj "/CN=${IP}/O=${IP}" -reqexts SAN -extensions SAN -config <(cat /etc/ssl/openssl.cnf <(printf "[SAN]\nsubjectAltName=IP:${IP}"))
```

* 생성된 인증서를 TLS secret 로 만들기

```
▒ kubectl create secret tls ${CERT_NAME} --key ${KEY_FILE} --cert ${CERT_FILE}
```

* MacOS 에서 self-sign 인증서 적용한 HTTPS로 접속하는 경우 
키체인에 시스템 인증서로 등록 https://docs.docker.com/docker-for-mac/#add-custom-ca-certificates-server-side)

```
▒ sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${CERT_FILE}
```


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
$ sudo kill -s SIGHUP $(pidof kube-apiserver) $(pidof kube-controller-manager) $(pidof kube-scheduler)
$ sudo systemctl restart kubelet
$ sudo systemctl daemon-reload
$ sudo systemctl restart containerd
```

## 참고
* [Certificate Management with kubeadm](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
* [PKI certificates and requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)

