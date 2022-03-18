---
title:  "Maven 빌드 시 소스 디렉토리내 리소스들을 포함 시키는 방법"
date:    2015/01/16 17:47
categories: "java"
tags: ["java", "maven"]
keywords: ["resources"]
description: "maven은 소스 디렉토리내에 java 이외의 파일은 리소스로 인식하지 않기 때문에 소스 디렉토리 내의 리소스는 pom.xml 에서 다음과 같이 추가로 `resources` > `resource` 노드에 추가로 지정해 주어야 패키징 시 해당 리소스들이 포함된다."
---

# Maven 빌드 시 소스 디렉토리내 리소스들을 포함 시키는 방법

## 환경

- java 1.7.0
- maven 3.2.2

## Maven 빌드 시 소스 디렉토리내 리소스들을 포함 시키는 방법

maven은 소스 디렉토리내에 java 이외의 파일은 리소스로 인식하지 않기 때문에
소스 디렉토리 내의 리소스는 pom.xml 에서 다음과 같이 추가로 `resources` > `resource` 노드에 추가로 지정해 주어야 패키징 시 해당 리소스들이 포함된다.


```
<build>
    <resources>
        <resource>
            <directory>src/main/java</directory>
                <includes>
                <include>**/*.xml</include>
            </includes>
        </resource>
        <resource>
            <directory>src/main/jdf</directory>
                <includes>
                <include>**/*.xml</include>
            </includes>
        </resource>
    </resources>
</build>
```


## 참고

[Including and excluding files and directories](http://maven.apache.org/plugins/maven-resources-plugin/examples/include-exclude.html)
