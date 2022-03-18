---
title:  "Installing Apache 2.2.18 on CentOS 5.6"
date:   2014/02/19 14:16
categories: "linux"
tags: ["linux", "apache", "httpd","centos"]
keywords: ["Apache","httpd","CentOS"]
description: "CentOS에 아파치 웹서버를 컴파일하여 설치하는 방법"
---

# Installing Apache 2.2.18 on CentOS 5.6 (Apache HTTP Server 컴파일 설치)

## 환경

- CentOS 5.6
- Apache 2.2.18
- 설치 위치 : usr/local/apache

## 설치절차

- 루트 계정으로 로그인

-  기존에 "yum" 으로 설치된 아파치가 및 사용자 계정 제거

```
[root@ ~]# yum remove httpd
[root@ ~]# rm -rf /home/apache
[root@ ~]# userdel -rf apache	
yum remove httpd
```

- 계정 새로 생성

```
[root@ ~]# useradd -c "Apache" -u 48 -m apache
[root@ ~]# passwd apache
(비밀번호 입력)	
```

- 설치 디렉토리 생성하고 owner 변경

```
[root@ ~]# umkdir /usr/local/apache
[root@ ~]# chown apache:apache /usr/local/apache
```

- apache 계정으로 컴파일 하고 설치

```
[root@ ~]# su apache
[apache@ ~]# cd
[apache@ ~]# wget http://mirror.apache-kr.org/httpd/httpd-2.2.22.tar.gz
[apache@ ~]# tar zxvfp httpd-2.2.22.tar.gz
[apache@ ~]# cd httpd-2.2.22
[apache@ ~]# ./configure -prefix=/usr/local/apache --with-included-apr
[apache@ ~]# make
[apache@ ~]# make install
[apache@ ~]# make clean	
```

- SSL 포함해서 설치할 경우는 아래와 같이 root 계정으로 "openssl-devel autoconf libtool" 를 yum 으로 설치해주고

```
[root@ ~]# yum install openssl-devel autoconf libtool	
```

- `--enable-ssl`, `--enable-so` 옵션 추가

```
[apache@ ~]# ./configure -prefix=/usr/local/apache --with-included-apr --enable-ssl --enable-so	
```

- apache 계정으로 httpd (80포트) 사용 가능하도록 조정

```
[apache@ ~]# exit
[root@ ~]# chown root.root /usr/local/apache/bin/httpd
[root@ ~]# chmod +s /usr/local/apache/bin/httpd	
```

- 재 부팅후 자동실행 처리

```
[root@ ~]# cd /etc/rc.d/rc3.d
[root@ ~]# ln -s /usr/local/apache/bin/apachectl S57apache	
```