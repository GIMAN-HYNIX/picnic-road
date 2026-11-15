# 간식 왕국 그림

다음 게임(뱀서식 전투 + 슬더스식 갈림길)에 쓸 캐릭터 그림이에요. 무료 이미지 생성 서비스(Pollinations)로 뽑고, 배경을 지워 투명 PNG로 만들었어요.

| 파일 | 역할 | 이름 |
|---|---|---|
| `sprites/hero.png` | 주인공 | 슈크림 망토 제빵사 |
| `sprites/hero-alt.png` | 주인공 예비안 | 긴 머리 버전 |
| `sprites/jelly.png` | 잡몹 | 곰팡이 젤리 |
| `sprites/cookie.png` | 잡몹 | 탄 쿠키곰 |
| `sprites/icecream.png` | 잡몹 | 녹은 아이스크림 |
| `sprites/donut-knight.png` | 엘리트 | 딱딱 도넛 기사 |
| `sprites/boss-cake.png` | 보스 | 곰팡이 케이크 |

- `candidates/`: 고를 때 본 원본 후보 전체
- `sheets/`: 후보 비교표와 출연진 모음
- `tools/`: 다시 뽑고 자를 때 쓰는 스크립트 (`gen.py jobs2.json` → `cutout.py 원본=결과`)
