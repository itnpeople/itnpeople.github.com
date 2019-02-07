---
title:  "거북이(Turtle)로 파이썬 시작하기"
date:   2018/02/07 10:30
categories: "python"
tags: ["recent"]
keywords: ["python","graphic","turtle","tutorial"]
description: "거북이(Turtle) 모듈을 활용하여 파이썬을 보다 쉽게 배워보기"
---

# 거북이로 그림 그리기

## Agenda


1. 출력과 입력
1. 변수
1. 거북이 불러오기
1. 거북이 이동하기

1. 비교와 블리언
1. 조건문
1. 논리연산
1. 반복문
1. 함수


## 출력과 입력

### 목표
* 입력과 출력의 개념
* 화면에 문자를 출력하고 입력하는 방법을 알아본다.

### 예제

```
print("#파이썬")
```

```
print("#파이썬")
input("입력하세요..")
print("#시작하기")
```

## 변수

### 목표
* 변수의 개념을 이해한다.
* 문자를 입력받고 입력받은 문자를 화면에 보여준다.

### 예제

```
print("#파이썬")
r = input("입력하세요..")
print(r)
```

## 거북이 불러오기

### 목표
* 거북이를 화면에 출력한다.

### 예제

```
import turtle
turtle.shape("turtle")
turtle.done()
```

## 거북이 이동하기

### 목표
* 거북이를 이동시켜 선을 그려본다.

### 예제

```
import turtle
turtle.shape("turtle")
turtle.forward(200)
turtle.left(90)
turtle.forward(200)
turtle.done()
```

### 응용
* 거북이를 이동시켜 사각형을 그려보자

```
import turtle
turtle.shape("turtle")
turtle.forward(200)
turtle.left(90)
turtle.forward(200)
turtle.left(90)
turtle.forward(200)
turtle.left(90)
turtle.forward(200)
turtle.done()
```

## 원그리기

### 목표
* 화면에 원을 그려보자

### 예제
* 현재 위치에서부터 반지름을 지정하여 원을 그린다.

```
import turtle
turtle.shape("turtle")
turtle.circle(100)
turtle.done()
```

### 예제 
* 현재 위치에서부터 종로지점까지 이어지는 점의 갯수를 지정

```
import turtle
turtle.shape("turtle")
turtle.circle(100, 180, 90)
turtle.done()
```

### 응용
* 마름모를 그려보자

```
import turtle
turtle.shape("turtle")
turtle.circle(100, 360, 4)
turtle.done()
```

### 응용
* 마름모를 2개를 30도씩 증가하며 그려보자

```
import turtle

turtle.shape("turtle")
turtle.circle(100, 360, 4)
turtle.right(30)
turtle.circle(100, 360, 4)
turtle.done()
```

## 반복문

### 목표
* 반복문 for는 원하는 횟수만큼 반복하여 같은 작업을 수행 때 사용한다.
* range() 함수에 대해 배워보자.
* ":" 쓰임새도 같이 이해하자.

### 예제
* 30도씩 우측으로 이동하며 360도 돌면서 마름모 그리기

```
import turtle

turtle.shape("turtle")
turtle.circle(100, 360, 4)

for i in range(1, 11):
	println(i)
	turtle.right(30)
	turtle.circle(100, 360, 4)

turtle.done()
```
