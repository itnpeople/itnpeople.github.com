---
title:  "Createing ha cluster with kubeadm (external-etcd nodes)"
date:   2022/11/14 14:14
categories: "cloud"
tags: ["cloud", "kubeadm","kubernetes","external-etcd"]
keywords: ["kubernetes","쿠버네티스", "provisining", "kubeadm", "external eted"]
description: "kubeadm을 이용하여 external etcd topology 를 가진 HA 클러스터를 구성합니다."
---

# Createing ha cluster with kubeadm (external-etcd nodes)
**kubernetes 1.23.*, *haproxy 1.6*, *etcd: 3.4.22*

## 목적
***

* `kubeadm`을 이용하여 [**External Etcd Topology**](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/) HA 클러스터를 구성하기 위한 공식 문서의 설명이 충분하지 않아 정리 목적으로 포스팅 합니다.


## 환경
***

* Ubuntu 18.04 LTS

* 호스트 구성
```
HOST0 10.146.0.16
HOST1 10.146.0.17
HOST2 10.146.0.18
```

* 모든 호스트는  kubeadm 설치 기본 패키지 (kubeadm, kubectl, kubelet) 와 Container-Runtime 이 셋업되어 있어야 합니다.
* `SCP`, `SSH` 활용하기 때문에 모든 호스트는 SSH Passwordless 연결이 가능한 상태여야 합니다.

## 클러스터 생성
***

### 작업순서

1. HOST0에 haproxy 를 설치합니다.
1. HOST0, HOST1, HOST2 각각에 etcd를 설치힙니다.
1. HOST0에서 etcd CA인증서를 발급하고 HOST1, HOST2 복사합니다.
1. HOST0, HOST1, HOST2 에서 etcd 서버 인증서를 생성합니다. (CA인증서 필요)
1. etcd 데몬 서비스를 생성합니다.
1. kubeadm-config 파일을 작성합니다.
1. `kubeadm init` 및 `kubeadm join --control-plane ` 을 수행합니다.

### haproxy 설치

* HOST0 에 설치합니다.  
* HOST0 9998 포트 요청을 각 HOST0, HOST1, HOST2의 6443 포트로 roundrobin 되도록 설정 합니다.
* Loadbalancer를 활용할 수 있다면 haproxy 대신 Loadbalancer 활용을 권장합니다.

```
$ sudo add-apt-repository -y ppa:vbernat/haproxy-1.7
$ sudo apt update
$ sudo apt install -y haproxy

$ sudo bash -c "cat << EOF > /etc/haproxy/haproxy.cfg
global
  log 127.0.0.1 local0
  maxconn 2000
  uid 0
  gid 0
  daemon
defaults
  log global
  mode tcp
  option dontlognull
  timeout connect 5000ms
  timeout client 50000ms
  timeout server 50000ms
frontend apiserver
  bind :9998
  default_backend apiserver
backend apiserver
  balance roundrobin
  server  HOST0  10.146.0.16:6443  check
  server  HOST1  10.146.0.17:6443  check
  server  HOST2  10.146.0.18:6443  check
EOF"

# haproxy 재시작
$ sudo systemctl daemon-reload
$ sudo systemctl restart haproxy
```

### etcd 설치

* ETCD 설치할 호스트(HOST0,HOST1,HOST2)에 etcd를 설치합니다. 

```
$ ETCD_VER="v3.4.22"
$ curl -L https://storage.googleapis.com/etcd/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz -o etcd-${ETCD_VER}-linux-amd64.tar.gz
$ tar xzvf etcd-${ETCD_VER}-linux-amd64.tar.gz
$ sudo mv etcd-${ETCD_VER}-linux-amd64/etcd* /usr/local/bin/
$ rm -f etcd-${ETCD_VER}-linux-amd64.tar.gz
```
※ 공식문서는 etcd 설치 부분이 생략되어 있음

## etcd CA 및 서버 인증서 생성

* HOST0에서 etcd 에서 활용할 etcd CA(certificate authority) 파일을 Generate 합니다.

```
$ sudo kubeadm init phase certs etcd-ca
```

* 다음과 같이 2개의 파일이 생성됩니다.

```
/etc/kubernetes/pki/etcd/ca.crt
/etc/kubernetes/pki/etcd/ca.key
```

* HOST0에서 ca 파일(ca.key, ca.crt)을 HOST1, HOST2 의  `/etc/kubernetes/pki/etcd/` 디렉토리로 복사합니다.

```
$ sudo cp -R /etc/kubernetes/pki ${HOME}/
$ sudo chown -R $(id -u):$(id -g) pki

$ scp -r ${HOME}/pki ${USER}@10.146.0.17:
$ scp -r ${HOME}/pki ${USER}@10.146.0.18:

$ ssh ${USER}@10.146.0.17 'sudo chown -R root:root pki && sudo cp -R pki /etc/kubernetes/'
$ ssh ${USER}@10.146.0.18 'sudo chown -R root:root pki && sudo cp -R pki /etc/kubernetes/'
```

* 모든 호스트(HOST0, HOST1, HOST2)에서 etcd 관련 인증서를 생성합니다.
* 앞서 복사했던 `/etc/kubernetes/pki/etcd/ca.key`, `/etc/kubernetes/pki/etcd/ca.crt` 파일이 필요합니다.

```
# HOST0
$ sudo kubeadm init phase certs etcd-server
$ sudo kubeadm init phase certs etcd-peer
$ sudo kubeadm init phase certs etcd-healthcheck-client
$ sudo kubeadm init phase certs apiserver-etcd-client

# HOST1
$ ssh ${USER}@10.146.0.17 'sudo kubeadm init phase certs etcd-server'
$ ssh ${USER}@10.146.0.17 'sudo kubeadm init phase certs etcd-peer'
$ ssh ${USER}@10.146.0.17 'sudo kubeadm init phase certs etcd-healthcheck-client'
$ ssh ${USER}@10.146.0.17 'sudo kubeadm init phase certs apiserver-etcd-client'

# HOST2
$ ssh ${USER}@10.146.0.18 'sudo kubeadm init phase certs etcd-server'
$ ssh ${USER}@10.146.0.18 'sudo kubeadm init phase certs etcd-peer'
$ ssh ${USER}@10.146.0.18 'sudo kubeadm init phase certs etcd-healthcheck-client'
$ ssh ${USER}@10.146.0.18 'sudo kubeadm init phase certs apiserver-etcd-client'
```


* 인증서 생성 후 HOST1, HOST2에서는 `/etc/kubernetes/pki/etcd/ca.key` 파일을 삭제합니다.

```
$ ssh ${USER}@10.146.0.17 'sudo find /etc/kubernetes/pki/etcd -name ca.key -type f -delete'
$ ssh ${USER}@10.146.0.18 'sudo find /etc/kubernetes/pki/etcd -name ca.key -type f -delete'
```

※ 공식문서는 `kubeadm init` 명령어 실행 후 `/etc/kubernetes/pki/ca.crt`, `/etc/kubernetes/pki/ca.key`, `/etc/kubernetes/pki/sa.key`, `/etc/kubernetes/pki/sa.pub`, `/etc/kubernetes/pki/front-proxy-ca.crt`, `/etc/kubernetes/pki/front-proxy-ca.key`, `/etc/kubernetes/pki/etcd/ca.crt`, `/etc/kubernetes/pki/etcd/ca.key` 파일들을 scp 를 활용해 다른 control-plane 설치 대상 호스트에 복사하도록 기술되어 있으나 etcd 데몬 설정에 대한 설명이 없어 위와 같은 방식으로 대체합니다.


* 각 호스트의 디렉토리에 인증서가 정상 생성되었는지 확인합니다.

```
on HOST0
/etc/kubernetes/pki
├── apiserver-etcd-client.crt
├── apiserver-etcd-client.key
└── etcd
    ├── ca.crt
    ├── ca.key
    ├── healthcheck-client.crt
    ├── healthcheck-client.key
    ├── peer.crt
    ├── peer.key
    ├── server.crt
    └── server.key

on HOST1, HOST2
/etc/kubernetes/pki
├── apiserver-etcd-client.crt
├── apiserver-etcd-client.key
└── etcd
    ├── ca.crt
    ├── healthcheck-client.crt
    ├── healthcheck-client.key
    ├── peer.crt
    ├── peer.key
    ├── server.crt
    └── server.key
```



### etcd 데몬 서비스 생성

* ETCD를 설치할 모든 호스트(HOST0, HOST1, HOST2)에서 다음과 같이 etcd 데몬을 설정 합니다.

```
$ HOSTNAME="HOST0"      # HOST0, HOST1, HOST2
$ HOSTIP="10.146.0.16"  # 10.146.0.16, 10.146.0.17, 10.146.0.18
$ CLUSTER="HOST0=https://10.146.0.16:2380,HOST1=https://10.146.0.17:2380,HOST2=https://10.146.0.18:2380"

$ sudo bash -c "cat << EOF > /etc/systemd/system/etcd.service
[Unit]
Description=etcd

[Service]
Type=exec
ExecStart=/usr/local/bin/etcd \\
  --name=${HOSTNAME}  \\
  --data-dir=/var/lib/etcd \\
  --advertise-client-urls=https://${HOSTIP}:2379 \\
  --initial-advertise-peer-urls=https://${HOSTIP}:2380 \\
  --initial-cluster=certificate-1=https://${HOSTIP}:2380 \\
  --listen-client-urls=https://127.0.0.1:2379,https://${HOSTIP}:2379 \\
  --listen-metrics-urls=http://127.0.0.1:2381 \\
  --listen-peer-urls=https://${HOSTIP}:2380 \\
  --cert-file=/etc/kubernetes/pki/etcd/server.crt \\
  --key-file=/etc/kubernetes/pki/etcd/server.key \\
  --peer-cert-file=/etc/kubernetes/pki/etcd/peer.crt \\
  --peer-key-file=/etc/kubernetes/pki/etcd/peer.key \\
  --peer-client-cert-auth=true \\
  --peer-trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt \\
  --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt \\
  --client-cert-auth=true \\
  --experimental-initial-corrupt-check=true \\
  --experimental-watch-progress-notify-interval=5s \\
  --snapshot-count=10000 \\
  --initial-cluster-token=etcd-cluster \\
  --initial-cluster=${CLUSTER} \\
  --initial-cluster-state=new
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF"

$ sudo systemctl daemon-reload
$ sudo systemctl enable --now etcd
$ sudo systemctl restart etcd
$ sudo systemctl status etcd
```


### `kubeadm init`

* HOST0에서 다음과 같이 kubeadm-config 파일을 작성합니다.
  * `kubectl` 등의 클라이언트를 통해 외부에서  api-server에 접근하고자 한다면 `controlPlaneEndpoint`,`advertise-address` 에 `10.146.0.16` 대신 접근가능 endpoint(public-ip) 를 지정해 줍니다.
  * 아래 예제는 `InitConfiguration` 을 통해 token , certificate-key 값을 수동 generate하여 처리하도록 했으나 굳이 필요 없다면 `ClusterConfiguration` 만 활용해도 무관합니다.

```
$ CERT_KEY="$(kubeadm certs certificate-key)"
$ TOKEN="$(kubeadm token generate)"

$ cat << EOF > kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
bootstrapTokens:
- token: "$(kubeadm token generate)"
  description: "Proxy for managing TTL for the kubeadm-certs secret"
  ttl: "1h"
- token: "${TOKEN}"
  description: "kubeadm bootstrap token"
  ttl: "24h"
  usages:
  - authentication
  - signing
  groups:
  - system:bootstrappers:kubeadm:default-node-token
certificateKey: "${CERT_KEY}"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
imageRepository: k8s.gcr.io
controlPlaneEndpoint: 10.146.0.16:9998
dns:
  type: CoreDNS
apiServer:
  extraArgs:
    advertise-address: 10.146.0.16
    authorization-mode: Node,RBAC
etcd:
  external:
    endpoints:${ETCD_ENDPOINTS}
    caFile: /etc/kubernetes/pki/etcd/ca.crt
    certFile: /etc/kubernetes/pki/apiserver-etcd-client.crt
    keyFile: /etc/kubernetes/pki/apiserver-etcd-client.key
controllerManager: {}
scheduler: {}
EOF
```

* HOST0에서 클러스터를 초기화 합니다.

```
$ sudo kubeadm init --v=5 --upload-certs  --config kubeadm-config.yaml
```

* Control-Plane `kubeadm join` 명령어

```
$ HASH="$(openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -hex | sed 's/^.* //')"
$ echo "sudo kubeadm join 35.243.98.12:9998 --token ${TOKEN} --discovery-token-ca-cert-hash sha256:${HASH} --control-plane --certificate-key ${CERT_KEY}"
```

* HOST1, HOST1 에서 control-plane join을 수행합니다.

```
$ ssh ${USER}@10.146.0.17 'sudo kubeadm join 35.243.98.12:9998 --token .........'
$ ssh ${USER}@10.146.0.18 'sudo kubeadm join 35.243.98.12:9998 --token .........'
```

* 노드를 확인합니다.

```
$ kubectl get nodes --kubeconfig=/etc/kubernetes/admin.conf
```

## 참고
***

### 문서

* [Creating Highly Available Clusters with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/#external-etcd-nodes)
* [Set up a High Availability etcd Cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/)
* [kubeadm Configuration (v1beta3)](https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/)
