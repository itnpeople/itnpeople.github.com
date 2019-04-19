---
title:  "window.onload vs document.ready 이벤트"
date:   2012/06/05 10:24
categories: "js"
tags: []
keywords: ["window.onload","document.ready","jquery"]
description: "document.ready 와  window.onload 이벤트를 발생 시점에 대한 이해를 통해 예기치 않았던 버그를 막을 수 있습니다."
---

# window.onload vs document.ready 이벤트
---

document.ready 와  window.onload 차이 때문에 오류 원인을 찾지 못하고 한참을 고생했던 기억이 있다.

구글링 해본 결과는 다음과 같았다.

	document.ready 이벤트는
		javascript 의 DOM 트리 로딩이 완료되었을때를 발생한다.
		즉, DOM트리를 인식하고 사용 준비가 완료되면 이벤트가 발생하게 된다.


	document.onload 이벤트는
		페이지의 모든 엘리먼트들이 모두 브라우저로 다운되고
		스크립트가 모든 엘리먼트에 접근가능하게 될 때 발생한다.
		


결론을 내보면

	document ready --> window onload 순으로 이벤트가 발생한다.

주의 할 점은
jQuery를 사용해본 개발자는 다음과 같은 코드를 무의식적으로 사용할 수 도 있다.

```
<script type="text/javascript">
    $(function() {
        $(window).load( function() {   alert("onload..!");   } );
    });
</script>
```

언듯보면 위의 코드는 문제가 없어 보인다.  
하지만 실제 웹개발을 하다보면 위 코드에서   
alert("onload..!"); 이 실행되지 않는 경우가 발생하곤 한다.

상황을 예상해보면
ready 이벤트에서 load 이벤트를 바인딩 하는 사이에 onload 가 완료 되는 경우이다.
아래와 같이 분리 해줘야 한다는 것..

```
<script type="text/javascript">
    $(function() {
 
    });
    $(window).load( function() {   alert("onload..!");   } );
</script>
```