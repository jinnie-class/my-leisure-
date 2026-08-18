#!/bin/sh
# html`` 템플릿 안의 <!-- 주석 --> 에 백틱이 들어가면 템플릿이 그 자리에서 끊겨
# 앱이 통째로 하얗게 됩니다. 주석이 **여러 줄** 이면 줄 단위 grep 으로는 못 잡아서,
# 여기서는 <!-- 부터 --> 까지를 이어 붙여 검사합니다.
#   쓰는 법 :  sh tools/backtick-check.sh
awk '
  FILENAME != prev { prev = FILENAME; inc = 0 }
  {
    line = $0
    while (length(line)) {
      if (!inc) {
        i = index(line, "<!--")
        if (!i) break
        inc = 1; start = FILENAME ":" FNR; line = substr(line, i + 4)
      } else {
        j = index(line, "-->")
        seg = j ? substr(line, 1, j - 1) : line
        if (index(seg, "`")) { print "[X] " start " 주석 안에 백틱: " $0; bad = 1 }
        if (!j) break
        inc = 0; line = substr(line, j + 3)
      }
    }
  }
  END { exit bad ? 1 : 0 }
' $(find js -name '*.js') && echo "[OK] 안전 - html 주석 안에 백틱 없음"
