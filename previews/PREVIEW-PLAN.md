# Preview 배포 준비 (원격 작업 미실행)

## 확인한 상태
- 저장소: hazlenut89/baby-food-planner. 로컬 작업 브랜치 work.
- 원격 test2: bf150a613c63b60e9ca02d63df0e9a8d7f3d3f7b (준비 시 읽기 전용 확인).
- Vercel 연결 파일/프로젝트 ID/토큰 없음. GitHub deployments API는 Forbidden. 프로젝트 연결, Production Branch, Preview 자동 배포 여부는 미확인.
- Git fetch 기본 설정은 main만 가져옴. test2는 명시적으로 가져와야 함.

## 사용자 확인이 필요한 배포 전 조건
Vercel 프로젝트 Settings에서 Git 저장소가 hazlenut89/baby-food-planner인지, Production 환경의 추적 브랜치가 test2가 아닌지 확인한다. test2가 Production이면 push하지 않는다. Preview의 test2 자동 배포 허용 여부와 Ignored Build Step, 프로젝트 Root Directory, 별도 배포 워크플로를 확인한다. 이 저장소는 정적 사이트이며 별도 빌드가 필요 없다. Preview에는 프로덕션 전용 환경 변수/사용자 지정 도메인을 연결하지 않는다. Deployment Protection이 iPhone 테스트 접근을 허용하는지도 확인한다.

## 위 조건 확인 및 사용자 push 승인 후에만 실행
```sh
cd /workspace/baby-food-planner
git status --short
git fetch origin refs/heads/test2:refs/remotes/origin/test2
git merge-base --is-ancestor origin/test2 work
git log --oneline origin/test2..work
git diff --stat origin/test2 work
git push --dry-run origin work:refs/heads/test2
git push origin work:refs/heads/test2
```
조상 검사 실패 시 중단하고 새 원격 변경과 통합 계획을 검토한다. force push 금지. 명시적인 refspec은 test2만 갱신한다. Vercel Git 연동은 push 자체로 배포가 시작될 수 있으므로 push 전에 모든 조건을 확인한다.

## 배포 확인
Vercel Deployments에서 Branch=test2, Environment=Preview, Git SHA=로컬 커밋인지 확인한다. 해당 배포의 고유 Preview URL만 사용하고 Promote to Production 및 프로덕션 도메인 연결은 하지 않는다. 자동 Preview가 없으면 원격 상태를 확인한 후 별도로 승인된 Preview 배포 방식을 선택한다. Vercel CLI를 사용할 경우 프로젝트 연결을 확인한 뒤 `vercel`의 기본 Preview 대상만 사용하며 `--prod`는 사용하지 않는다.

## iPhone / PWA
기존 프로덕션 홈 화면 앱 대신 고유 Preview URL을 Safari에서 연다. Preview와 프로덕션은 origin이 달라 브라우저 저장 데이터도 분리된다. 기존 데이터 검증은 사용자가 만든 JSON 백업을 Preview에만 복원한다. Safari 사이트 데이터 삭제나 IndexedDB/localStorage 초기화를 요구하지 않는다.

서비스 워커는 버전별 bamsongi- 캐시만 정리하고 사용자 IndexedDB/localStorage는 건드리지 않는다. 새 공통 CSS/JS도 precache에 포함한다. 설치 시 HTTP 캐시 재검증, 온라인 요청 시 HTTP 캐시 우회, 등록 시 updateViaCache:none 적용. 이미 열린 탭의 실행 중 JavaScript까지 자동 교체되지는 않으므로 입력을 저장한 뒤 탭을 다시 열거나 새로고침한다. 오프라인에서는 이전 캐시가 보일 수 있으므로 첫 검증은 온라인으로 한다.

냉장: 등록 시부터 시간·온도·재료별 지침 확인 안내. 14일 기준 없음.
냉동: 제조 14일 경과 시 관리 알림. 안전 기한 보증 없음.
자동 폐기·재고 초기화 없음.
