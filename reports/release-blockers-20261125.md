# V3 Release Blockers 검증 — 2026-11-25

## 범위와 판정
로컬 test2 코드의 알려진 FAIL을 해결했다. **NO GO: 실제 Preview SHA/Ready 상태와 운영 배포 설정, 실기기 및 롤백 편집 호환성 확인 전 Production 배포 금지.** main/Production 변경 없음. 운영 브라우저 데이터에 접근하지 않았다.

## 원인 및 수정
- meal-type.js: 버터 부분 문자열이 아몬드버터/캐슈넛버터를 우유로 오분류. 기존 미커밋 아몬드 예외를 보존하고 기존 견과류 분류 전체의 버터 이름으로 확장. 실제 우유 재료가 있으면 복수 분류 유지. 반응 기록은 수정하지 않음.
- tests/validate-middle.cjs: 표시명 밀가루와 과거 밀 식별자 혼동. 이력 키와 표시명을 분리. 60일/중량/NEW/소고기/공통 끼니/선택 3끼/채소 제한 및 승인 식단 해시 검증. 식단 수정 없음.
- tests/validate-workbook.py: 구버전 열 위치, 공백 포함 NEW 이름, 현미·퀴노아 원재료와 곡류죽 표시명, 완전히 빈 안내 행 처리 차이 수정. 모든 실제 식재료·중량·안내 셀 비교 유지.
- scripts/build-static.cjs, vercel.json: 실행 파일만 dist로 빌드. .gitignore/.vercelignore: 생성물·환경파일 등 제외. 기존 테스트/문서는 Git에 보존.
- tests/release-blockers.py: 15개 분류/복합 제품/입력 경로/NEW 사례/배포 산출물 공개 경로 회귀 검증 추가.

## 결과
| 항목 | 결과 | 근거/제한 |
|---|---|---|
| 알레르기 15개 명시 사례 | PASS | 6가지 끼니 형태, 별도 큐브 경로, 직접 입력 필터 |
| 제품명 추측 금지/복수 분류/수기 반응 보존 | PASS | 실제 입력 원재료만 사용, 조회 전후 snapshot 불변 |
| 중기 60일 규칙 | PASS | 2끼 120끼, 3끼 152끼, 밀가루 각각 8회, 채소 중복 0 |
| 최신 엑셀 전수 비교 | PASS | counts_corrected.xlsx SHA a125d76ba5ba02c5a4795179096aab7502d679f7dbefa9801770c77bb2e71ca2; 272끼 식재료·중량·NEW·총량, 안내 2시트 일치 |
| 앱 생성·미리보기 전수 비교 | PASS | 실제 PlannerCore 미리보기/적용 272끼 원본 일치; 7개 날짜 카드 320/375/390/430/1280 가로 넘침 없음 |
| 시판/간식/수제 NEW 및 자동 등록 | PASS | 가자미·새송이버섯·보리·열무·배·가지; 0g/미기록 미섭취, 과거 수정·삭제 재계산 |
| 시판 입력/기타 업체/아코디언 | PASS | commercial-layout.py: 320/375/390/430, 높이/동일 열/저장/취소/큐브/빈 수제 행 |
| 복사/충돌/다중 날짜/기록 보호 | PASS | copy-ux.py: 수제·시판, 새 ID, 섭취/메모/반응/이력 미복사 |
| 분석/필터/요약 | PASS | copy-ux.py 6개 필터, 계산/목록/주 이동/빈 기간 |
| 저장/큐브 중복 차감/추천 덮어쓰기 보호 | PASS | browser-regression.py |
| V1/V3 PNG 이미지 저장 | PASS | icon-export.py 주간/월간 PNG, 브라우저 다운로드 |
| V1/V3 공유 및 백업/복원 | PASS | timezone-storage-qa.py; UTC/한국/미국 시간대 |
| main 코드 생성 합성 기록 이전 | PASS | main e4afc26 코드의 저장 함수로 생성한 기록/다운로드 JSON → V3; 반복 로드 3회. 프로필/식단/섭취/반응/도입/큐브/메모/설정 보존 |
| 구버전 롤백 로드 및 프로필 저장 | PASS | 다중 끼니 보존. 구버전이 빈 날짜 행을 만드는 기존 동작 확인; V3 복원은 mealFirstTried:null 메타데이터만 추가 |
| 구버전 롤백 후 끼니·큐브 편집 | NOT TESTED | 읽기/프로필 저장 통과만으로 전체 쓰기 호환성을 보장하지 않음 |
| 실제 익명화 운영 백업 | NOT TESTED | 사용자 제공 실제 백업 없음 |
| 실제 Preview/Production 구성 | NOT TESTED | HTTPS CONNECT 단계 envoy 403. Vercel 인증 오류라고 단정할 수 없음 |
| iPhone Safari 실기기 | NOT TESTED | Chromium 모바일 너비 검증과 구분 |

테스트 개발 중 고정 fixture ID 조회를 이름 조회로 수정했다. HTTP 검사에는 로컬 요청용 프록시 비사용 설정을 적용했다. 기존 사용자 파일이나 식단을 테스트에 맞춰 수정하지 않았다.

## 배포 파일 42개 전체 분류
42개 모두 서비스/빌드 실행 필수가 아니며 Git 보존, dist 제외. 일괄 삭제하지 않았다. 추가 발견한 assets/food-icons/preview.html, audit.csv도 Git 보존·dist 제외. 정상 아이콘 리소스와 manifest는 유지한다.
.gitignore는 이미 추적된 파일을 제거하지 않는다. .vercelignore만으로 Git 연동 배포 제외를 보장하지 않고 outputDirectory=dist로 산출물을 제한했다. 로컬 dist에서 테스트/문서/프리뷰/스크립트/.env/.git 경로 404 및 SW 필수 파일 존재를 확인했다. 실제 Vercel 산출물은 미검증.

| 파일 | 용도 | 처리 |
|---|---|---|
| navigation-cubes-results.json | 생성 검증 결과·집계 | Git 유지 / 배포 제외 |
| previews/ICON-INTEGRATION.md | 개발 문서·검수 보고서 | Git 유지 / 배포 제외 |
| previews/INTEGRATED-UPDATE-20261025.md | 개발 문서·검수 보고서 | Git 유지 / 배포 제외 |
| previews/PREVIEW-PLAN.md | 개발 문서·검수 보고서 | Git 유지 / 배포 제외 |
| previews/TEST-REPORT.md | 개발 문서·검수 보고서 | Git 유지 / 배포 제외 |
| previews/all-icons.html | 개발용 아이콘 미리보기 | Git 유지 / 배포 제외 |
| previews/all-icons.png | 테스트 스크린샷 | Git 유지 / 배포 제외 |
| previews/food-icon-coverage.json | 생성 검증 결과·집계 | Git 유지 / 배포 제외 |
| previews/icon-comparison.html | 개발용 아이콘 미리보기 | Git 유지 / 배포 제외 |
| previews/icons.html | 개발용 아이콘 미리보기 | Git 유지 / 배포 제외 |
| previews/icons.png | 테스트 스크린샷 | Git 유지 / 배포 제외 |
| previews/icons/beef.svg | 미리보기 참조 아이콘 | Git 유지 / 배포 제외 |
| previews/icons/broccoli.svg | 미리보기 참조 아이콘 | Git 유지 / 배포 제외 |
| previews/icons/carrot.svg | 미리보기 참조 아이콘 | Git 유지 / 배포 제외 |
| previews/icons/egg.svg | 미리보기 참조 아이콘 | Git 유지 / 배포 제외 |
| previews/icons/peanut.svg | 미리보기 참조 아이콘 | Git 유지 / 배포 제외 |
| previews/icons/rice.svg | 미리보기 참조 아이콘 | Git 유지 / 배포 제외 |
| previews/icons/salmon.svg | 미리보기 참조 아이콘 | Git 유지 / 배포 제외 |
| previews/icons/zucchini.svg | 미리보기 참조 아이콘 | Git 유지 / 배포 제외 |
| previews/ingredients.json | 생성 검증 결과·집계 | Git 유지 / 배포 제외 |
| previews/plan-validation.json | 생성 검증 결과·집계 | Git 유지 / 배포 제외 |
| reports/final-qa-20261026.md | 개발 문서·검수 보고서 | Git 유지 / 배포 제외 |
| reports/integrated-qa-20261026.md | 개발 문서·검수 보고서 | Git 유지 / 배포 제외 |
| reports/iphone-fixes-20261025.md | 개발 문서·검수 보고서 | Git 유지 / 배포 제외 |
| reports/qa18-runtime-20261026.md | 개발 문서·검수 보고서 | Git 유지 / 배포 제외 |
| tests/browser-regression.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/commercial-layout.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/copy-ux.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/editor-save-qa.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/final-qa.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/food-icons.cjs | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/icon-export.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/integrated-layout-qa.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/integrated-qa.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/iphone-fixes.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/mobile-pages.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/new-foods.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/qa18-behavior.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/timezone-storage-qa.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/v1-input-navigation.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/validate-middle.cjs | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |
| tests/validate-workbook.py | 유지할 테스트·검증 코드 | Git 유지 / 배포 제외 |

민감정보 점검: 개인키·GitHub 토큰·AWS 접근키의 명백한 패턴은 발견되지 않았다. 이는 전문 보안 감사나 모든 개인정보 부재 보증이 아니다. 합성 테스트 이름·날짜가 테스트 코드에 존재하며 운영 백업은 커밋하지 않는다.

## 사용자 직접 확인 및 배포 전 조건
1. Vercel Dashboard에서 test2 대상 deployment의 Ready/Preview 환경과 Git SHA를 원격 test2와 대조. Production Branch가 main인지 확인. 보호된 Preview라면 권한 있는 계정으로 로그인하며 보호 해제/우회 금지.
2. Preview에서 아몬드버터→견과류만, 유제품 버터→우유, 포함 재료 우유+아몬드→둘 다 확인. NEW 가자미/배/보리·열무 확인.
3. iPhone Safari에서 시판 2열, 기타 마미포유 인라인 입력, 수제 기본 펼침/시판·큐브 기본 접힘, 입력 유지, 복사/충돌, PNG 공유·저장 확인. 320/375/390/430 너비와 키보드 표시 중 가로 넘침 확인.
4. 익명화된 실제 백업이 제공되면 격리 환경에서 추가 검증. 롤백 후 구버전의 끼니·큐브 편집은 별도 검증 전 허용하지 않는다.

## 승인 후에만 실행할 배포·롤백 계획
- 현재 실제 Production 배포 ID/SHA와 main SHA를 확인하고 기존 main에 백업 태그를 생성한다(이번 작업에서는 생성 안 함).
- 검증된 test2 SHA의 main 대상 PR을 검토하고 병합한다. 새 main 변경이 있으면 충돌/회귀 재검증. 이번에는 main 병합 안 함.
- Vercel main Production 자동 배포 또는 명시적 Production 배포 후 SHA/프로필/기존 기록/등록·복사/큐브/백업/이미지 즉시 확인.
- 장애 시 확인해 둔 이전 Production 배포로 롤백. 서버 코드 롤백은 브라우저 저장 데이터를 되돌리지 않는다. 데이터 초기화/구버전 백업의 강제 덮어쓰기 금지.
- 롤백 전후 최신 사용자 백업을 보존하고, 구버전 편집 호환성이 불확실하면 쓰기 작업을 안내상 중단하고 호환 패치를 검증한다. 본 변경은 저장 스키마·추천 식단·마이그레이션을 수정하지 않는다.
- 정식 배포는 사용자의 별도 명시적 승인 후 진행한다.
