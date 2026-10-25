# 전체 식재료 SVG — 적용 전 검토

## 제작 범위
초기 SEED와 중기 2끼·3끼 60일 데이터에서 47개 표기를 추출했다. 정규화된 식재료 40종, 초기 포괄 표기 ‘곡류’ 1종, 기본 아이콘 1종으로 SVG 42개를 제공한다. 곡류를 임의로 쌀로 바꾸지 않았다. 쌀오트밀죽 등 복합 음식은 대표 아이콘을 표시하되 원래 텍스트를 유지한다. 버섯과 새송이버섯은 별개로 유지한다.

승인된 8종 중 브로콜리의 줄기를 줄이고 꽃봉오리 곡선을 추가했다. 모든 자산은 64×64 viewBox, 투명 배경, 브라운 기본 윤곽선 2, 파스텔 채색이다. 파일명은 자산 키이며 사용자 식재료 ID가 아니다.

## 준비 파일
- assets/food-icons/*.svg: 식재료 41종 + default.svg
- assets/food-icons/manifest.json: 이름 → 파일 키
- assets/food-icons/adapter.js: V1/V3 공용 표시 전용 API
- previews/all-icons.html / all-icons.png: 24·32·48px 전체 비교
- previews/food-icon-coverage.json: 원본 표기와 별칭
- tests/food-icons.cjs: 매핑·기본 아이콘·앱 미연결 검사

## 승인 후 적용 예정
두 페이지에서 같은 adapter.js를 로드하고 식재료 선택 목록, 주간·월간 식단의 음식 표시 영역에 `PlannerFoodIcons.create(name, 24|32|48)`을 사용한다. 문자열 HTML 렌더러는 `PlannerFoodIcons.url(name)`로 자산 URL을 가져오고 기존 안전한 HTML 이스케이프를 유지한다. 기존 v3/icons.js의 메뉴 아이콘은 유지한다. 이미지 내보내기 canvas는 외부 SVG 이미지 로딩이 필요하므로 별도 회귀 검증 후 연결한다. 서비스 워커에는 승인된 자산을 추가하고 캐시 버전을 변경한다.

현재 실제 앱 HTML·식단 렌더러·서비스 워커에는 연결하지 않았다. 데이터 저장 코드를 호출하지 않으며 기존 ID, icon 필드, 음식명, 백업 구조는 수정하지 않는다. 알 수 없는 이름과 로드 실패는 default.svg로 대체한다. 수정본 8종 previews/icons/*는 이전 요청에서 수정된 로컬 상태를 유지한다.

## 검증
47개 원본 표기 누락 없음. SVG 42개 XML 파싱 통과. 126개 크기별 이미지 로드 통과. 기본 아이콘 동작 확인. 390px 미리보기 가로 넘침 없음. 전체 PNG 시각 점검 완료. 실제 앱 적용 및 실기기 검증은 승인 후 범위다.
