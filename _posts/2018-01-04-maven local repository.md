---
title:  "Maven Repository 없이 로컬 jar 파일을 maven project 에 추가하는 방법"
date:   2018/01/04 15:03
categories: "maven"
tags: ["popular"]
keywords: ["dependency","repository"]
description: "Maven Repository 없이 로컬 jar 파일을 maven project 에 추가하는 방법"
---

# Maven Repository 없이 로컬 jar 파일을 maven project 에 추가하는 방법
---

## 환경

- java 1.7.0
- maven 3.2.2

## 단순 참조만 필요한 경우

maven repository 가 없는 로컬 jar 파알을 maven 프로젝트에 추가 하기 위해서는 사설 repository를 만드는 방법도 있지만 
다음과 같이 "dependency" 정의 시 `scope` 노드와 `systemPath` 노드를 사용하여 프로젝트에 포함된 jar 파일을 지정하여 줄 수 있다

```
<dependency>
    smack</groupId>
    <artifactId>smack-custom</artifactId>
    <version>1.0.0</version>
    <scope>system</scope>
    <systemPath>${project.basedir}/lib/smack-custom.jar</systemPath>
</dependency>
```
groupId, artifactId, version 은 임의로 정의해도 무방하다

${project.basedir} 는 프로젝트의 ROOT 패스


## 로컬을 Repository 를 활용하는 방법

위와 같이 처리하는 경우는 문제점이 있다. scrop 의 system 이기 때문에 maven 빌드 시 해당 jar 파일이 포함되지 않는다.

만일 빌드결과물에 해당 jar 파일을 포함해야 하는 경우는 pom.xml 에 다음과 같이 정의하여 `로컬을 repositoy로 활용`하는 방법을 사용한다.

```
<dependency>
    <groupId>smack</groupId>
    <artifactId>smack-custom</artifactId>
    <version>1.0.0</version>
</dependency>
<repository>
    <id>in-project</id>
    <name>custom jars</name>
    <url>file://${project.basedir}/lib</url>
</repository>
```

이 때 ${project.basedir}/lib 는 `maven 디렉토리 구조를 따르도록 구성`해주어야 한다.

위의 예제에서는 디렉토리 및 파일명을 아래와 같이 구성해야 한다.

이때 파일은 `jar` 파일과 `pom.xml` 파일 2개로 구성되어야 하며 pom파일이 없는 경우는 dependencies 를 읽지못한다.

```
${project.basedir}/lib/smack/smack-custom/1.0.0/smack-custom-1.0.0.jar
${project.basedir}/lib/smack/smack-custom/1.0.0/smack-custom-1.0.0.pom
```

jenkins에서 maven 빌드를 하는 경우는 pom.xml에 아래과 같이 로컬 repository를 하나 더 추가해준다.

```
<repository>
    <id>in-project-jenkins</id>
    <name>custom jars-jenkins</name>
    <url>file://${JENKINS_HOME}/jobs/${JOB_NAME}/workspace/lib</url>
</repository>
```