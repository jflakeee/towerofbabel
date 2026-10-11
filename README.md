# BABEL · 잿빛 탑

모바일 우선 서바이버 액션 RPG의 플레이 가능한 PWA 프로토타입입니다.
벤치마크는 NANOO의 [Tower of Babel: Survivors of Chaos](https://store.steampowered.com/app/2665680/Tower_of_Babel_Survivors_of_Chaos/?l=koreana)입니다. 원작의 공식 모바일 포팅이 아니며, 원작 이미지·음원·코드·캐릭터 에셋을 포함하지 않습니다.

## 실행

Node.js 20 이상, Python 3가 있으면 외부 패키지 설치 없이 실행할 수 있습니다.

```sh
npm run check
npm test
npm run build
npm start
```

브라우저에서 `http://localhost:8080`을 여세요. 같은 네트워크의 휴대폰에서는 PC의 LAN IP와 8080 포트를 사용합니다. 오프라인 캐시와 홈 화면 설치는 HTTPS 배포 또는 localhost에서 지원됩니다. `index.html`을 파일로 직접 열면 ES 모듈과 서비스 워커가 동작하지 않을 수 있습니다.

## 구현 기능

- 세로 화면 우선 반응형 UI, 노치 안전 영역, 가로 화면 대응.
- 기사 / 술사 / 추적자: 근접 베기, 광역 투사체, 원거리 속사.
- 5개 층 순차 해금. 각 층 90초 웨이브 후 최대 60초 보스전.
- 가상 조이스틱, 자동 공격·조준, 3초 회피와 12초 폭발 쿨다운.
- 경험치 수집, 9종 축복, 레벨업 3택과 층당 1회 새로고침.
- 일반 / 돌격 / 원거리 / 정예 / 보스 적, 보스 장판 예고와 방사형 탄막.
- 15처치마다 체력 회복, 보스 진입 시 체력 20% 회복과 일반 적 정리.
- 정예 장비 드롭, 보스 희귀 이상 보상, 5개 등급과 무작위 능력치.
- 무기 / 방어구 / 부적 장착, 현재 수치 비교, 장비 분해.
- 공격력 / 체력 / 파편 보상 영구 강화, 패배 시에도 획득 보상 정산.
- 5초 간격 전투 저장, 저장 후 로비로, 새로고침 후 전투 이어하기.
- 앱 전환·포커스 이탈 시 자동 정지, 왼손 모드, 절전 화질, 효과음 설정.
- PWA 설치 선언과 오프라인 캐시. 런타임 외부 서비스 요청 없음.

PC 조작: WASD 또는 방향키 이동, Space 회피, E 폭발, Esc 일시정지.
전투 축복은 층마다 초기화되고, 장비와 영구 강화는 남습니다. 저장은 브라우저 localStorage이며 기기 간 동기화는 없습니다. 동일 브라우저의 여러 탭에서 동시에 플레이하지 않는 것을 권장합니다.

## GitHub Pages 배포

저장소: `https://github.com/jflakeee/towerofbabel.git`

1. 소스를 `main` 브랜치에 push합니다.
2. GitHub 저장소 **Settings → Pages → Source → GitHub Actions**를 선택합니다.
3. `.github/workflows/pages.yml`이 구문 검사, 테스트, 정적 빌드를 실행한 후 Pages에 배포합니다.
4. Actions의 배포 작업에서 실제 URL을 확인합니다. 기본 예상 주소는 `https://jflakeee.github.io/towerofbabel/`입니다. 이 README의 예상 주소만으로 배포 성공을 뜻하지는 않습니다.

프로젝트 경로 아래에서 실행되도록 모든 자원 경로는 상대 주소입니다. 다른 정적 호스팅은 `npm run build` 결과인 `dist/`를 게시하면 됩니다.

## 구조

| 파일 | 역할 |
| --- | --- |
| `index.html`, `styles.css` | 반응형 로비, 전투 HUD, 모달 |
| `src/engine.js` | DOM에 의존하지 않는 전투·성장·보상 모델 |
| `src/app.js` | 입력, Canvas 2D 그래픽, 사운드, UI, 저장 |
| `manifest.webmanifest`, `sw.js` | 설치 선언, 오프라인 캐시 |
| `tests/engine.test.js` | 전투 시뮬레이션과 저장·정산 회귀 검증 |
| `docs/research.md` | 출처, 영상 챕터 분석, 모바일 구현 대응표 |
| `docs/verification.md` | 실제 검증 결과와 미검증 범위 |
| `docs/benchmark-parity-plan.md` | 원작 대응 차이, 필요한 자료, 구현 순서와 완료 조건 |

## 범위

현재는 독립 프로토타입입니다. 네이티브 APK/IPA, 원작 전체 콘텐츠, 서버 계정, 과금, 클라우드 저장, 완전한 아이소메트릭 월드, 장비별 캐릭터 외형 변화는 구현 범위에 포함하지 않았습니다. 렌더링된 기둥은 장식이며 이동 충돌 장애물이 아닙니다. 적은 바닥 좌표에서 움직이고 그래픽에 입체 표현을 사용합니다.

리서치는 공개 웹 자료를 교차 검토했습니다. 유튜브 전체 영상·자막을 확보하지 못해 프레임 단위 관찰이나 영상 내용의 완전한 검증을 주장하지 않습니다. 상세 한계는 [분석 문서](docs/research.md)를 참고하세요.
