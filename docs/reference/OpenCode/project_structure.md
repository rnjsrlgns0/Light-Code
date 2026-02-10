# OpenCode - Project Structure

```
opencode/
│
├── package.json                    # 모노레포 루트 (workspaces: packages/*)
├── sst.config.ts                   # SST 인프라 설정 (Cloudflare, PlanetScale, Stripe)
├── turbo.json                      # Turborepo 빌드 파이프라인
├── bunfig.toml                     # Bun 런타임 설정
├── tsconfig.json                   # 루트 TypeScript 설정
├── bun.lock                        # 의존성 잠금
├── flake.nix / flake.lock          # Nix 패키지 정의
├── install                         # 설치 스크립트 (bash, curl용)
├── AGENTS.md                       # AI 에이전트 코딩 지침
├── CONTRIBUTING.md                 # 기여 가이드 (Bun 1.3+, bun install && bun dev)
├── SECURITY.md                     # 보안 정책
├── STATS.md                        # 프로젝트 통계
├── README.md (+17개 번역)           # 문서 (en, ko, ja, zh, de, fr, es, it ...)
│
├── .github/
│   ├── CODEOWNERS                  # 코드 소유자
│   ├── VOUCHED.td                  # 신뢰 기여자 목록
│   ├── ISSUE_TEMPLATE/             # 이슈 템플릿
│   │   ├── bug-report.yml
│   │   ├── feature-request.yml
│   │   └── question.yml
│   ├── actions/                    # 커스텀 Actions
│   │   ├── setup-bun/
│   │   └── setup-git-committer/
│   └── workflows/                  # CI/CD (30+개 워크플로우)
│       ├── publish.yml             #   배포 (NPM)
│       ├── publish-vscode.yml      #   VSCode 확장 배포
│       ├── test.yml                #   테스트
│       ├── typecheck.yml           #   타입 체크
│       ├── deploy.yml              #   SST 배포
│       ├── containers.yml          #   Docker 빌드
│       ├── beta.yml                #   베타 릴리스
│       └── ...                     #   PR관리, 이슈분류, 리뷰 자동화 등
│
├── .husky/
│   └── pre-push                    # 푸시 전 검증 훅
│
├── .opencode/                      # OpenCode 자체 설정 (dogfooding)
│   ├── opencode.jsonc              #   프로젝트 설정 파일
│   ├── agent/                      #   에이전트 프롬프트 (docs, triage, duplicate-pr)
│   ├── command/                    #   커스텀 명령어 (commit, issues, learn, rmslop, spellcheck)
│   ├── skill/                      #   커스텀 스킬 (bun-file-io)
│   ├── tool/                       #   커스텀 도구 (github-pr-search, github-triage)
│   └── themes/                     #   TUI 커스텀 테마
│
├── infra/                          # SST 인프라 코드
│   ├── app.ts                      #   메인 앱 리소스
│   ├── console.ts                  #   콘솔 리소스
│   ├── enterprise.ts               #   엔터프라이즈 리소스
│   ├── secret.ts                   #   시크릿 정의
│   └── stage.ts                    #   스테이지 설정
│
├── nix/                            # Nix 빌드 정의
│   ├── opencode.nix                #   CLI 빌드
│   ├── desktop.nix                 #   데스크탑 앱 빌드
│   ├── node_modules.nix            #   Node 모듈
│   ├── hashes.json                 #   의존성 해시
│   └── scripts/                    #   빌드 헬퍼 스크립트
│
├── github/                         # GitHub Action 패키지
│   ├── action.yml                  #   Action 정의
│   ├── index.ts                    #   진입점
│   └── script/                     #   실행 스크립트
│
├── patches/                        # NPM 패키지 패치
│
├── sdks/                           # 외부 SDK (Python 등)
│
├── specs/                          # API 스펙
│
├── script/                         # 루트 레벨 스크립트
│
└── packages/                       # ========= 모노레포 패키지 =========
    │
    ├── opencode/                   # [핵심] CLI 코어 엔진
    │   └── src/
    │       ├── index.ts            #   진입점 (Yargs CLI 정의 + 에러 핸들링)
    │       │
    │       ├── agent/              #   --- AI 에이전트 ---
    │       │   ├── agent.ts        #   Agent 모듈 (defaultAgent, generate, get, list)
    │       │   └── prompt/         #   에이전트 프롬프트 템플릿
    │       │
    │       ├── session/            #   --- 세션 관리 ---
    │       │   ├── index.ts        #   Session 모듈 (createNext, list, plan, update)
    │       │   ├── llm.ts          #   LLM 호출 관리
    │       │   ├── message.ts      #   메시지 구조
    │       │   ├── message-v2.ts   #   메시지 v2 구조
    │       │   ├── processor.ts    #   메시지 처리기
    │       │   ├── instruction.ts  #   시스템 지침 구성
    │       │   ├── system.ts       #   시스템 프롬프트
    │       │   ├── prompt.ts       #   프롬프트 구성
    │       │   ├── compaction.ts   #   컨텍스트 압축
    │       │   ├── summary.ts      #   대화 요약
    │       │   ├── status.ts       #   세션 상태
    │       │   ├── retry.ts        #   재시도 로직
    │       │   ├── revert.ts       #   되돌리기
    │       │   ├── todo.ts         #   할일 관리
    │       │   └── prompt/         #   프롬프트 템플릿
    │       │
    │       ├── provider/           #   --- LLM 프로바이더 ---
    │       │   ├── provider.ts     #   Provider 모듈 (getModel, getSDK, list, sort 등)
    │       │   ├── models.ts       #   모델 정의
    │       │   ├── auth.ts         #   프로바이더 인증
    │       │   ├── error.ts        #   오류 처리
    │       │   ├── transform.ts    #   데이터 변환
    │       │   └── sdk/
    │       │       └── copilot/    #   GitHub Copilot SDK
    │       │
    │       ├── tool/               #   --- 내장 도구 (20+개) ---
    │       │   ├── tool.ts         #   도구 인터페이스 정의
    │       │   ├── registry.ts     #   ToolRegistry (register, all, tools, fromPlugin)
    │       │   ├── bash.ts         #   Bash 실행
    │       │   ├── edit.ts         #   파일 편집 (문자열 치환)
    │       │   ├── multiedit.ts    #   다중 파일 편집
    │       │   ├── read.ts         #   파일 읽기
    │       │   ├── write.ts        #   파일 쓰기
    │       │   ├── glob.ts         #   파일 패턴 검색
    │       │   ├── grep.ts         #   내용 검색 (ripgrep)
    │       │   ├── ls.ts           #   디렉토리 목록
    │       │   ├── lsp.ts          #   LSP 연동 도구
    │       │   ├── codesearch.ts   #   코드 검색
    │       │   ├── apply_patch.ts  #   패치 적용
    │       │   ├── batch.ts        #   배치 실행
    │       │   ├── task.ts         #   서브 에이전트 태스크
    │       │   ├── plan.ts         #   계획 모드 (enter/exit)
    │       │   ├── question.ts     #   사용자 질문
    │       │   ├── skill.ts        #   스킬 실행
    │       │   ├── todo.ts         #   할일 도구
    │       │   ├── webfetch.ts     #   웹 페이지 가져오기
    │       │   ├── websearch.ts    #   웹 검색
    │       │   ├── truncation.ts   #   출력 잘라내기
    │       │   ├── invalid.ts      #   무효 도구 핸들링
    │       │   ├── external-directory.ts  # 외부 디렉토리
    │       │   └── *.txt           #   각 도구 설명 프롬프트
    │       │
    │       ├── cli/                #   --- CLI 인터페이스 ---
    │       │   ├── bootstrap.ts    #   CLI 초기화/부트스트랩
    │       │   ├── ui.ts           #   TUI 렌더링 (Ink)
    │       │   ├── logo.ts         #   로고 출력
    │       │   ├── network.ts      #   네트워크 설정
    │       │   ├── upgrade.ts      #   업그레이드 체크
    │       │   ├── error.ts        #   에러 핸들링
    │       │   └── cmd/            #   CLI 명령어
    │       │       ├── cmd.ts      #     명령어 정의
    │       │       ├── run.ts      #     `opencode` (기본 TUI)
    │       │       ├── serve.ts    #     `opencode serve` (서버 모드)
    │       │       ├── web.ts      #     `opencode web` (웹 UI)
    │       │       ├── session.ts  #     세션 관리
    │       │       ├── agent.ts    #     에이전트 실행
    │       │       ├── auth.ts     #     인증
    │       │       ├── models.ts   #     모델 목록
    │       │       ├── mcp.ts      #     MCP 관리
    │       │       ├── pr.ts       #     PR 관리
    │       │       ├── github.ts   #     GitHub 연동
    │       │       ├── acp.ts      #     Auto Commit & Push
    │       │       ├── generate.ts #     코드 생성
    │       │       ├── export.ts   #     세션 내보내기
    │       │       ├── import.ts   #     세션 가져오기
    │       │       ├── stats.ts    #     사용 통계
    │       │       ├── upgrade.ts  #     업그레이드
    │       │       ├── uninstall.ts#     제거
    │       │       ├── tui/        #     TUI 관련 모듈
    │       │       └── debug/      #     디버그 명령어
    │       │
    │       ├── server/             #   --- HTTP API 서버 (Hono) ---
    │       │   ├── server.ts       #   Server 모듈 (listen, openapi, url)
    │       │   ├── event.ts        #   SSE 이벤트 스트리밍
    │       │   ├── error.ts        #   API 에러 처리
    │       │   ├── mdns.ts         #   mDNS 서비스 디스커버리
    │       │   └── routes/         #   API 라우트
    │       │       ├── session.ts  #     세션 CRUD + 메시지 처리
    │       │       ├── config.ts   #     설정 관리
    │       │       ├── provider.ts #     프로바이더 관리
    │       │       ├── project.ts  #     프로젝트 정보
    │       │       ├── file.ts     #     파일 조회
    │       │       ├── mcp.ts      #     MCP 서버 관리
    │       │       ├── permission.ts#    권한 관리
    │       │       ├── question.ts #     질문/응답
    │       │       ├── pty.ts      #     터미널 PTY
    │       │       ├── tui.ts      #     TUI 상태
    │       │       ├── global.ts   #     글로벌 설정
    │       │       └── experimental.ts # 실험 기능
    │       │
    │       ├── mcp/                #   --- MCP (Model Context Protocol) ---
    │       │   ├── index.ts        #   MCP 모듈 (connect, disconnect, tools, prompts, resources)
    │       │   ├── auth.ts         #   OAuth 인증
    │       │   ├── oauth-callback.ts#  OAuth 콜백
    │       │   └── oauth-provider.ts#  OAuth 프로바이더
    │       │
    │       ├── plugin/             #   --- 플러그인 시스템 ---
    │       │   ├── index.ts        #   Plugin 모듈 (init, list, trigger)
    │       │   ├── codex.ts        #   OpenAI Codex 플러그인
    │       │   └── copilot.ts      #   GitHub Copilot 플러그인
    │       │
    │       ├── skill/              #   --- 스킬 시스템 ---
    │       │   ├── index.ts        #   스킬 등록
    │       │   ├── skill.ts        #   스킬 정의
    │       │   └── discovery.ts    #   스킬 탐색
    │       │
    │       ├── lsp/                #   --- Language Server Protocol ---
    │       │   ├── index.ts
    │       │   ├── client.ts       #   LSP 클라이언트
    │       │   ├── server.ts       #   LSP 서버 관리
    │       │   └── language.ts     #   언어별 설정
    │       │
    │       ├── permission/         #   --- 권한 관리 ---
    │       │   ├── index.ts
    │       │   ├── arity.ts        #   권한 수준 정의
    │       │   └── next.ts         #   차세대 권한 시스템
    │       │
    │       ├── config/             #   설정 로드/파싱
    │       ├── storage/            #   로컬 SQLite 저장소
    │       ├── shell/              #   셸 실행 환경
    │       ├── pty/                #   의사 터미널
    │       ├── project/            #   프로젝트 디렉토리 관리
    │       ├── worktree/           #   Git 워크트리
    │       ├── share/              #   세션 공유 (share, share-next)
    │       ├── snapshot/           #   파일 스냅샷
    │       ├── auth/               #   인증 모듈
    │       ├── bus/                #   이벤트 버스
    │       ├── command/            #   커맨드 시스템
    │       ├── env/                #   환경 변수
    │       ├── file/               #   파일 유틸리티
    │       ├── flag/               #   기능 플래그
    │       ├── format/             #   포맷팅
    │       ├── global/             #   글로벌 상태
    │       ├── id/                 #   ID 생성 (ULID)
    │       ├── ide/                #   IDE 연동
    │       ├── installation/       #   설치 경로 관리
    │       ├── patch/              #   패치 시스템
    │       ├── question/           #   질문 핸들링
    │       ├── scheduler/          #   태스크 스케줄러
    │       ├── acp/                #   Auto Commit & Push
    │       ├── bun/                #   Bun 런타임 유틸
    │       └── util/               #   공통 유틸리티
    │
    ├── app/                        # [프론트엔드] Web UI (SolidJS)
    │   ├── vite.config.ts          #   Vite 빌드 설정
    │   ├── playwright.config.ts    #   E2E 테스트 설정
    │   ├── index.html              #   진입 HTML
    │   ├── e2e/                    #   Playwright E2E 테스트
    │   └── src/
    │       ├── entry.tsx           #   SolidJS 엔트리
    │       ├── app.tsx             #   앱 루트
    │       ├── index.ts            #   모듈 진입
    │       ├── index.css           #   글로벌 스타일 (Tailwind)
    │       ├── pages/              #   페이지
    │       │   ├── home.tsx        #     홈 (세션 목록)
    │       │   ├── session.tsx     #     세션 대화 뷰
    │       │   ├── layout.tsx      #     메인 레이아웃
    │       │   ├── error.tsx       #     에러 페이지
    │       │   ├── directory-layout.tsx
    │       │   └── layout/         #     레이아웃 컴포넌트
    │       ├── components/         #   UI 컴포넌트
    │       │   ├── session/        #     세션 관련 (메시지, 도구결과 등)
    │       │   ├── prompt-input/   #     프롬프트 입력 컴포넌트
    │       │   ├── server/         #     서버 상태 표시
    │       │   ├── titlebar.tsx    #     타이틀바
    │       │   ├── terminal.tsx    #     터미널 뷰
    │       │   ├── file-tree.tsx   #     파일 트리
    │       │   ├── dialog-*.tsx    #     다이얼로그 (모델선택, 설정, MCP, 프로바이더 등)
    │       │   ├── settings-*.tsx  #     설정 패널 (일반, 모델, MCP, 권한, 키바인딩 등)
    │       │   └── ...
    │       ├── hooks/              #   SolidJS 훅
    │       ├── context/            #   컨텍스트 프로바이더
    │       ├── addons/             #   애드온 시스템
    │       ├── i18n/               #   다국어 지원
    │       └── utils/              #   유틸리티
    │
    ├── desktop/                    # [데스크탑] Tauri 데스크탑 앱
    │   ├── vite.config.ts
    │   ├── index.html
    │   ├── src/                    #   프론트엔드 (SolidJS)
    │   ├── src-tauri/              #   Rust 백엔드 (Tauri)
    │   └── scripts/                #   빌드 스크립트
    │
    ├── ui/                         # [공유] 공유 UI 컴포넌트 라이브러리
    │   ├── vite.config.ts
    │   └── src/                    #   재사용 가능 컴포넌트
    │
    ├── web/                        # [웹사이트] 랜딩 페이지 (Astro)
    │   └── src/
    │       ├── pages/              #   랜딩 페이지
    │       ├── components/         #   웹 컴포넌트
    │       ├── content/            #   마크다운 콘텐츠
    │       ├── styles/             #   CSS 스타일
    │       ├── assets/             #   정적 에셋
    │       ├── i18n/               #   다국어
    │       ├── types/              #   타입 정의
    │       └── middleware.ts        #   미들웨어
    │
    ├── docs/                       # [문서] API/가이드 문서 (Mintlify)
    │   ├── docs.json               #   문서 사이트 설정
    │   ├── openapi.json            #   OpenAPI 스펙
    │   ├── index.mdx               #   메인 페이지
    │   ├── quickstart.mdx          #   빠른 시작
    │   ├── development.mdx         #   개발 가이드
    │   ├── essentials/             #   핵심 가이드
    │   ├── ai-tools/               #   AI 도구 문서
    │   ├── snippets/               #   코드 스니펫
    │   └── images/                 #   이미지
    │
    ├── console/                    # [콘솔] 관리 콘솔
    │   ├── app/                    #   콘솔 프론트엔드 (SolidJS)
    │   ├── core/                   #   콘솔 코어 로직
    │   ├── function/               #   서버리스 함수
    │   ├── mail/                   #   이메일 서비스
    │   └── resource/               #   SST 리소스 정의
    │
    ├── enterprise/                 # [엔터프라이즈] 기업용 기능
    │   └── src/
    │
    ├── sdk/                        # [SDK] 클라이언트 SDK
    │   ├── openapi.json            #   API 스펙
    │   └── js/                     #   JavaScript/TypeScript SDK
    │
    ├── plugin/                     # [플러그인] 플러그인 패키지
    │   └── src/
    │
    ├── function/                   # [함수] 서버리스 함수
    │   └── src/
    │
    ├── identity/                   # [브랜딩] 로고/아이콘 에셋
    │   ├── mark.svg
    │   └── mark-*.png              #   다양한 크기 아이콘
    │
    ├── extensions/                 # [IDE 확장]
    │   └── zed/                    #   Zed 에디터 확장
    │
    ├── containers/                 # [컨테이너] Docker 빌드 정의
    │   ├── base/                   #   베이스 이미지
    │   ├── bun-node/               #   Bun + Node 이미지
    │   ├── rust/                   #   Rust 빌드 이미지
    │   ├── tauri-linux/            #   Tauri Linux 빌드
    │   ├── publish/                #   배포용 이미지
    │   └── script/                 #   빌드 스크립트
    │
    ├── script/                     # [스크립트] 빌드/유틸리티
    │   └── src/
    │
    ├── util/                       # [유틸] 공유 유틸리티
    │   └── src/
    │
    └── slack/                      # [Slack] Slack 봇 연동
```
