---
title:  "iText에서 한글 폰트 사용방법"
date:   2013/01/11 17:41
categories: "java"
tags: []
keywords: ["iText","PDF","PPT","한글"]
description: "iText를 활용하여 PDF를 페이지 별로 하나의 이미지로 변환한 경험"
---

# iText에서 한글 폰트 사용방법
---

## 배경

PDF, PPT 문서의 페이지 별로 하나의 이미지로 변환해야 하는 경우가 생겼다.

Office 문서인 경우는 별 이슈 없이 apache-poi 를 사용하여 처리하였다.  
그러나 PDF인 경우는 apache apache-pdfbox 와 iText 에 대해서 고민하고 검토하게 되었는데  
apache-pdfbox 은 PDF 파일을 이미지로 변환하는 것이 매우 쉽다는 장점이 있지만  
한글 처리 방법(한글 폰트)을 찾지 못하였다.

반면에 그리고 iText 는 한글 폰트를 embeded 하기 편리하였고 샘플코드 및 레퍼런스 문서가 풍부하였다.  


## TTF (True Type Font) 파일 사용

물리적 ttf 파일을 통하여 BaseFont 클래스를 생성

```
package kr.co.squarenet.study.itext;
import com.itextpdf.text.*;
public class FontSample {
 
    public static void main(String[] args) throws Exception {
        BaseFont bfont = BaseFont.createFont("fonts/malgun.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        Font font = new Font(bfont,12);
        Phrase phrase = new Phrase("text string", font);
    }
}
```

BaseFont 폰트명은 "getFullFontName" 함수를 사용하여 얻을 수 있으며
리턴값은 "Platform ID, Platform Encoding ID, Language ID,font name" 별 값의  2차원 배열로 구성되어 있다

```
import com.itextpdf.text.*;
public class FontSample {
    public static void main(String[] args) throws Exception {
        BaseFont bfont = BaseFont.createFont("fonts/malgun.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        for (int i = 0; i < bfont.getFullFontName().length; i++) {
            System.out.println(bfont.getFullFontName()[i][0]);  // Platform ID
            System.out.println(bfont.getFullFontName()[i][1]);  // Platform Encoding ID
            System.out.println(bfont.getFullFontName()[i][2]);  // Language ID
            System.out.println(bfont.getFullFontName()[i][3]);  // font name
        }
    }
}
```

## TTC (True Type Compressed Font) 파일 사용

TTC는 TTF 가 2개 이상 존재하는 것이다. 그렇기 때문에 n 개의 BaseFont가 존재하고 1개의 BaseFont 는 위에서 살펴보았단 TTF에서 BaseFont를  다루는 법과 동일하다

조회방법도 폰트파일 path 에  "',' + index" (0 부터 시작) 을 넣어주면 된다.  
즉 아래 예제 처럼 "fonts/batang.ttc,0", fonts/batang.ttc,1" 과 같이 조회할 수 있다.

```
BaseFont bfont1 = BaseFont.createFont("fonts/batang.ttc,0", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
BaseFont bfont2 = BaseFont.createFont("fonts/batang.ttc,1", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
```

다음과 같이
BaseFont 의 "enumerateTTCNames" 함수를 사용하여 존재하는 폰트명 및 index를 조회할 수 있다.

```
import com.itextpdf.text.*;
public class FontSample {
    public static void main(String[] args) throws Exception {
         
        String[] names = BaseFont.enumerateTTCNames("fonts/batang.ttc");
         
        for (int i = 0; i < names.length; i++) {
            System.out.println(names[i]);
            BaseFont bfont = BaseFont.createFont(String.format("%s,%s", "fonts/batang.ttc", i), BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        }
    }
}
```

