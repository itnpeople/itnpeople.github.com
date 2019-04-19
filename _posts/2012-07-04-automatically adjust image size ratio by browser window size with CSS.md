---
title:  "CSS로 브라우저 창 크기별로 이미지 사이즈 비율 자동 조정하기"
date:   2012/07/04 12:58
categories: "js"
tags: []
keywords: ["css"]
description: "열린 브라우저 창 크기에 따라서 이미지 사이즈 비율을 자동으로 조정하도록 조정합니다."
---

# CSS로 브라우저 창 크기별로 이미지 사이즈 비율 자동 조정하기
---

열린 브라우저 창 크기에 따라서 이미지 사이즈 비율을 자동으로 조정

html5, xhtml 1.1, html 4.01 모두 가능

```
body {
    margin: 0;
    padding: 0;
}
img {
    float: left; width: 100%;
    -webkit-transition-property: width;
    -webkit-transition-duration: .3s;
}
img.enlargement { width: 100%; }
```