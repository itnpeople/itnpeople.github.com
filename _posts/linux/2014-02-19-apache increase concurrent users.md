---
title:  "아파치 웹서버 (Apache HTTP Server) 동시 접속자 수 늘리기"
date:   2014/02/19 14:25
categories: "linux"
tags: ["linux", "apache", "httpd","popular"]
keywords: ["Apache","httpd"]
description: "아파치 동시 접속자수는 httpd.conf 파일에서 그 값을 지정할 수 있으며 컴파일시 지정하는 'ServerLimit' 값 이상은 그 값이 늘어나지 않는다."
---

# 아파치 웹서버 (Apache HTTP Server) 동시 접속자 수 늘리기


아파치 동시 접속자수는 httpd.conf 파일에서 그 값을 지정할 수 있다.

다만 컴파일시 지정하는 "ServerLimit" 값 이상은 그 값이 늘어나지 않으며 확인 결과 apache 2.2.x 버전의 "ServerLimit" 는 DEFAULT = 256 , MAX = 20000 으로 지정되어 있다.

동시 접속자 수 2000은 충분이 큰 값이며 굳이 컴파일 설치를 통하여 "ServerLimit" 값을 늘려 줄 필요는 거의 없으며 간단히 RPM 설치해도 무방할 듯 하다.

설치 후 httpd.conf 옵션값 조정만으로 충분할 것으로 판단된다

## 환경

- Linux CentOS 5.6
- apache 2.2.19 MPM(다중처리 모듈)은 Prefork 방식
- MPM
  - prefork 방식 - 프로세스:쓰레드 = 1:1
  - Worker 방식 - 프로세스:쓰레드 = 1:n

## "ServerLimit" 값 조정 방법

- 아파치 컴파일된 현재 셋팅값 조회해 보고

  ```
[apache@ ~]# /usr/local/apache/bin/apachectl -V	
```

- 변경하고자 할 경우 Httpd.conf 에서 /conf/extra/httpd-mpm.conf 을 Include 처리 (리마크 제외) 하고 

  ```
# 다음 라인 리마크 해제
Include conf/extra/httpd-mpm.conf
```

- Httpd-mpm.conf 파일을 열고 지시자 변경한다. 다음은 동시접속자를 "1024" 로 지정한 예제이다.

  ```
〈IfModule mpm_prefork_module〉
    ServerLimit         1024
    StartServers          5
    MinSpareServers       5
    MaxSpareServers      10
    MaxClients          1024
    MaxRequestsPerChild   0
〈IfModule〉
```

- 지시자

  - MinSpareServers, MaxSpareServers

    부하가 적어서 MinSpareServers 개수 보다 적었을 경우 최소한 이 개수 만큼 유지하려고 아파치가 노력하고 부하가 증가하여 프로세스 개수가 많아질 경우에 MaxSpareServers 개수 이하로 줄이려고 아파치는 노력한다.
    즉, 절대적인 수치가 아니다.

  - StartServer

    아파치 구동시 프로세스 개수

  - MaxClients

    실행가능한 최대 프로세스 개수

  - MaxRequestsPerChild

    클라이언트들의 요청 개수를 제한. 만약 자식 프로세스가 이 값만큼의 클라이언트 요청을 받았다면 이 자식 프로세스는 자동으로 죽게 된다. 0 일 경우엔 무한대


## ServerLimit 에 대한 오해

구글링을 하다 보면 "ServerLimit" 를 올리려면 컴파일을 다시 해주어야 한다는 내용을 많이 찾아 볼 수 있으며 아파치 1.3.x 버전 내용인지 2.2.x 버전 내용인지를 명시 하지 않아 혼란을 야기한다.

위에서 정의 한 것 처럼 아파치 2.2.x 버전은 기본 컴파일된 Max Server Limit 값은 충분히 큰 값(=20000)이며 필요 동시 사용자수가 limit 값을 넘지 않는다면 conf 조정하여 늘려 사용하면 된다.
