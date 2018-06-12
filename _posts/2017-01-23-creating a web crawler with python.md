---
title:  "파이썬(Python)으로 웹 크롤러 만들기 - requests, beautifulsoup, lxml"
date:   2017/01/23 12:55
categories: "python"
tags: ["popular","recent"]
keywords: ["lxml","BeautifulSoup","centos"]
description: "파이썬(Python)으로 웹 크롤러 프로토타입 개발"
---

# 파이썬(Python)으로 웹 크롤러 만들기 - requests, beautifulsoup, lxml
---

## 환경

- CentOS 6.7

- Python 2.7

## 설명

생코에 어떤분의 "나만의 웹 크롤러 만들기 With Requests/BeautifulSoup"라는 흥미로운 블로그를 접하게 되었다.

마침 자바로 유사한 작업을 하던 중이었고 요즘 핫하다는 파이썬 맛도 좀 볼 수 있을 것 같아 해당 블로그를 보며 따라해 보았다.

결론부터 애기하자면 예제에서 대상 크롤링하는 사이트를 변경해보니 예제에 있는 html parser 로는 해당 사이트 파싱이 되지 않았다

그래서 html parser 대신 "lxml" 사용해야 했는데 centos 6.7 의 기본 설치된 파이썬 2.6에서는 실행되지 않았다.

결국 파이썬 2.7 설치부터 수행해야 했는데

구글신께 여쭤보니 파이썬 2.6을 2.7로 업그레이드 방법은 다음과 같이 크게 2가지 방법이 있다.

1. 2.7을 설치하고 /usr/bin/python 을 2.7로 실행파일로 대체하는 방법

1. 2.7과 2.6을 동시에 사용하는 방법

국내 블로그들은 보면 대부분은 첫번재 방법인 "2.7을 설치하고 /usr/bin/python 을 2.7로 실행파일로 대체하는 방법"에 대한 예제가 많으나 이것은 좋지 않은 방법으로 파이썬의 단순 실행은 가능했지만 "pip" 설치가 불가능하였다.

[How to install Python 2.7 and Python 3.3 on CentOS 6](https://danieleriksson.net/2017/02/08/how-to-install-latest-python-on-centos/)

## Dependency 라이브러리 설치

블로깅을 위해서 파이썬 2.7를 위한 dependency 라이브러리만을 리스팅하고 싶었지만 실패하였다.

관련 라이브러리들의 경우의 수가 많아 SE 지식이 거의없는 나로써는 쉽지 않은 작업이었기 대문에 결국 "development" 툴들을 모두 설치할 수 밖에 없었다.

```
[root@ ~]# yum install gcc
[root@ ~]# yum groupinstall -y development
[root@ ~]# yum install -y openssl-devel sqlite-devel bzip2-devel
```

## 파이썬 2.7 설치

파이썬 2.7을 다운로드 받고 컴파일 설치한다.

" --enable-shared" 옵션을 주의

```
[root@ ~]# cd
[root@ ~]# wget --no-check-certificate -N http://www.python.org/ftp/python/2.7.12/Python-2.7.12.tgz
[root@ ~]# tar -vxzf Python-2.7.12.tgz
[root@ ~]# ./configure --prefix=/usr/local/python2.7 --enable-shared
[root@ ~]# make
[root@ ~]# make install
```

Profile 추가

```
[root@ ~]# vi ~/.bash_profile
```

```
PATH=$PATH:$HOME/bin:/usr/local/python2.7/bin
LD_LIBRARY_PATH=/usr/local/python2.7/lib:LD_LIBRARY_PATH

export PATH
export LD_LIBRARY_PATH
```

Profile 반영 및 확인

```
[root@ ~]# source ~/.bash_profile
[root@ ~]# python2.7 -V
```

## PIP 설치

PIP 설치

```
[root@ ~]# cd
[root@ ~]# wget --no-check-certificate https://pypi.python.org/packages/source/s/setuptools/setuptools-1.4.2.tar.gz
[root@ ~]# tar -vzxf setuptools-1.4.2.tar.gz
[root@ ~]# cd setuptools-1.4.2
[root@ ~]# python2.7 setup.py install
[root@ ~]# cd
[root@ ~]# curl https://bootstrap.pypa.io/get-pip.py | python2.7 -
```

## 파이썬 dependency 라이브러리 설치

Requests, bs4(BeautifulSoup), lxml 설치

```
[root@ ~]# pip install requests
[root@ ~]# pip install bs4
[root@ ~]# pip install lxml
```

## 파피온라인3 선수정보 클롤링 예제

파피온라인3 사이트를 보면 게임내 선수정보를 제공하는 페이지가 있다.

아래 예제는 선수정보 첫번째 페이지를 크롤링하여 json 파일로 저장하는 간단한 예제이다.

```
[root@ ~]# mkdir /var/crawling
[root@ ~]# vi /var/crawling/fifaonline3.py
```

```
import requests
from bs4 import BeautifulSoup
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# HTTP GET Requeset
req = requests.get('http://fifaonline3.nexon.com/datacenter/player/list.aspx?ps=10&n4pageno=1');

# HTML
html = req.text

# HTML Header (200:success)
status = req.status_code

# HTTP ok ?
is_ok = req.ok

print(is_ok)

soup = BeautifulSoup(html, 'lxml')

players = soup.select('#currentContent > main > div.datacenterContent > div.datacenterListWrapper > table > tbody tr')

data = []
for player in players:

    row= {}
    info = player.find('td',{'class':'info'})
    ability = player.find('td',{'class':'ability'})
    ovrs = ability.find('span',{'class':'ovr'})
    body = ability.find('span',{'class':'body'})


    row['name'] = info.a.strong.span.text
    row['price'] = info.find('span', {'class':'value'}).text
    row['pic'] = info.find('span',{'class','thumb'}).img['src']


    row['ability'] = {}
    row['ability']['overall'] = ability.find('span',{'class':'ovr'}).text
    row['ability']['body'] = {}
    row['ability']['body']["height"] =  body.find('span',{'class':'height'}).text
    row['ability']['body']["weight"] =  body.find('span',{'class':'weight'}).text
    row['ability']['body']["foot"] =  body.find('span',{'class':'foot'}).text
    row['ability']['body']["skill"] =  body.find('span',{'class':'skill'}).text

    row['stat'] = []
    row['stat'].append(player.find('td',{'class':'stat1'}).text)
    row['stat'].append(player.find('td',{'class':'stat2'}).text)
    row['stat'].append(player.find('td',{'class':'stat3'}).text)
    row['stat'].append(player.find('td',{'class':'stat4'}).text)
    row['stat'].append(player.find('td',{'class':'stat5'}).text)
    row['rating'] = player.find('td',{'class':'rating'}).text

    data.append(row)

with open(os.path.join(BASE_DIR, 'result.json'), 'w+') as json_file:
    json.dump(data, json_file)
```

실행

```
[root@ ~]# python2.7 /var/crawling/fifaonline3.py
```
