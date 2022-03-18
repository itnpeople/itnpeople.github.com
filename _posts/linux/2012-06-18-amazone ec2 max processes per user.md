---
title:  "Amazone EC2 사용자별 MAX 프로세스 갯수 변경"
date:   2012/06/18 10:44
categories: "linux"
tags: ["linux", "cloud", "ec2"]
keywords: ["Cloud","System Engineering"]
description: "리눅스는 사용자별로 max 로 수정할 수 있는 프로세스 수가 정해져 있으며 아마존 EC2 환경에서 사용자별 프로세스 수 변경하였다."
---

# Amazone EC2 사용자별 MAX 프로세스 갯수 변경


리눅스는 사용자별로 max 로 수정할 수 있는 프로세스 수가 정해져 있다.  
다음과 같이 아마존 EC2 환경에서 사용자별 프로세스 수 변경하였다.

## 환경

- 아마존 EC2
- Version : Amazon Linux AMI release 2011.02.1.1 (beta)

## 사용자별 max 프로세스 갯수 조회 방법

"ulimit" 명령을 사용하여 사용자별 max 프로세스 갯수 조회

```
ulimit -a
```

아래는 조회결과 예제  
"max user processes" 가 사용자별 max 프로세스 수

```
core file size          (blocks, -c) 0
data seg size           (kbytes, -d) unlimited
scheduling priority             (-e) 0
file size               (blocks, -f) unlimited
pending signals                 (-i) 26779
max locked memory       (kbytes, -l) 64
max memory size         (kbytes, -m) unlimited
open files                      (-n) 8192
pipe size            (512 bytes, -p) 8
POSIX message queues     (bytes, -q) 819200
real-time priority              (-r) 0
stack size              (kbytes, -s) 10240
cpu time               (seconds, -t) unlimited
max user processes              (-u) 1024
virtual memory          (kbytes, -v) unlimited
file locks                      (-x) unlimited
```

## 변경 방법

다음과 같이 3가지 방법을 시도하였고  
세번째 ""profile" 파일 변경하는 방법만 성공

1. ulimit - u 명령
1. "limits.conf" 파일 변경
1. "profile" 파일 변경


- 시도 1 : ulimit - u 명령을 통하여 값 변경

```
ulimit -u 8192
ulimit -a
```

  정상적으로 값이 변경 되었음을 확인 하였으나 재접속하면 값이 변경되지 않았음  
  **실패**


- 시도 2 :  "limits.conf" 파일 변경

```
vi /etc/security/limits.conf
```

```
# 다음 라인을 추가
*                soft    nproc           8192
*                hard    nproc          8192
```

  구글링하면 재접속하면 제대로 변경된다고 하였으나 "# ulimit -a " 해도 값은 변경 없음  
  그러나 hard 값("# ulimit -Ha")은 변경되는 이상한 현상 발생 역시 **실패**


- 시도 3 :  "profile" 파일 변경

```
vi /etc/profile
```

아래와 같이주석처리하고 ulimit -u 라인 추가

```
# ulimit -S -c 0 > /dev/null 2>&1
ulimit -u 8192
```

프로파일 적용

```
source /etc/profile
```

**성공**