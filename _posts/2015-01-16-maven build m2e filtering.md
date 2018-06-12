---
title:  "Eclipse에서 Maven 빌드 시 지원되지 않는 goal 예외 처리"
date:   2015/01/16 17:51
categories: "maven"
tags: []
keywords: ["Eclipse","org.eclipse.m2e","pluginExecutionFilter"]
description: "Eclipse에서 Maven 빌드 시 지원되지 않는 goal 예외 처리"
---

# Eclipse에서 Maven 빌드 시 지원되지 않는 goal 예외 처리
---

## 환경

- java 1.7.0
- maven 3.2.2
- eclipse - Juno Service Release 2

## 현상

eclipse 에서 Maven 빌드를 실행할 시  `지원되지 않는 goal`이 있는 경우가 있다. 이런 경우 해당 goal을 사용하지 않도록 처리하면 그만이지만 jenkins 활용과 같이 eclipse 가 아닌 다른 환경에서 동일한 pom.xml을 사용해야 하는 경우가 생길 수도 있다. 

`지원되지 않는 goal`의 한가지 예로 "maven-dependency-plugin" 의 "copy-dependencies" goal은 eclipse 환경에서 빌드할 경우 다음과 같은 에러 메시지를 발생시킨다.

```
maven-dependency-plugin (goals "copy-dependencies", "unpack") is not supported by m2e
```

## 해결방법

`is not supported by m2e` 에러가 발생하는 경우는 eclipse 환경에서 해당 goal이 실행되지 않도록 `필터링`을 설정해 주여야 한다.

아래 예제는 eclipse에서 maven 빌드 할 때 "maven-dependency-plugin" 에서 "copy-dependencies" goal이 실행되지 않도록 필터링 처리하는 예제이다.

[org.eclipse.m2e](http://www.eclipse.org/m2e/) 는 eclipse IDE의 maven 빌드 환경을 의미한다.

```
<build>
<pluginManagement>
<plugins>

<plugin>
    <groupId>org.eclipse.m2e</groupId>
    <artifactId>lifecycle-mapping</artifactId>
    <version>1.0.0</version>
    <configuration>
        <lifecycleMappingMetadata>
            <pluginExecutions>
            <!-- copy-dependency plugin -->
                <pluginExecution>
                    <pluginExecutionFilter>
                        <groupId>org.apache.maven.plugins</groupId>
                        <artifactId>maven-dependency-plugin</artifactId>
                        <goals>
                            <goal>copy-dependencies</goal>
                        </goals>
                    </pluginExecutionFilter>
                    <action>
                        <ignore />
                    </action>
                </pluginExecution>
            </pluginExecutions>
        </lifecycleMappingMetadata>
    </configuration>
</plugin>

</plugins>
</pluginManagement>
</build>
```

## 참고

[maven-dependency-plugin (goals “copy-dependencies”, “unpack”) is not supported by m2e](https://stackoverflow.com/questions/8706017/maven-dependency-plugin-goals-copy-dependencies-unpack-is-not-supported-b)