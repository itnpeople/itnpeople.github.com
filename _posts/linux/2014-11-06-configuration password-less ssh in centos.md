---
title:  "CentOS Password-less SSH 설정 방법"
date:    2014/11/06 11:50
categories: "linux"
tags: []
keywords: ["Apache","httpd","CentOS"]
description: "Password-less SSH 는 서버간 ssh 연결시 비밀번호 입력없이 상호 trust된 연결이 되도록 지정해 주는 것 방법"
---

# CentOS Password-less SSH 설정 방법

## 개요

Password-less SSH 는 서버간 ssh 연결시 비밀번호 입력없이 상호 trust된 연결이 되도록 지정해 주는 것으로  
하둡 클러스터를 구성 등 분산환경을 구성하다보면 각 호스트간의 비밀번호 없이 SSH 접속이 가능하도록 설정해 주어야 하는 경우가 종종 발생한다.

## 설치방법

- ssh-client 설치 (필요시)

```
[root@ ~]# yum install openssh-clients
```

- 서버간 SSH "authorized key" 생성 

  `각 서버 모두 실행`

```
[root@ ~]# ssh-keygen -t dsa -P '' -f ~/.ssh/id_dsa
[root@ ~]# cp ~/.ssh/id_dsa.pub ~/.ssh/authorized_keys
```

- 서버들간 "authorized_keys" 복사

  '각 서버에서 실행하며'

  server1 인 경우는 server2,3 을, server2 는 server1, 3, server3 은 server1,2 에 대해서만 실행

  - server1

  ```
  [root@ ~]# cat ~/.ssh/id_dsa.pub | ssh root@server2 "cat >> ~/.ssh/authorized_keys"
[root@ ~]# cat ~/.ssh/id_dsa.pub | ssh root@server3 "cat >> ~/.ssh/authorized_keys"
```

  - server2

  ```
[root@ ~]# cat ~/.ssh/id_dsa.pub | ssh root@server1 "cat >> ~/.ssh/authorized_keys"
[root@ ~]# cat ~/.ssh/id_dsa.pub | ssh root@server3 "cat >> ~/.ssh/authorized_keys"
```

  - server3

  ```
[root@ ~]# cat ~/.ssh/id_dsa.pub | ssh root@server1 "cat >> ~/.ssh/authorized_keys"
[root@ ~]# cat ~/.ssh/id_dsa.pub | ssh root@server2 "cat >> ~/.ssh/authorized_keys"
```

## 확인

아래의 명령어를 실행하여 패스워드 입력없이 디렉터리 리스팅이 가능하면 정상적으로 설정된 것임

```
[root@ ~]# ssh root@server1 "ls /"
```