# OpenCode - Project Brief

### 프로젝트 이름
- **OpenCode** (`opencode-ai`)

### 주요 목적
- 오픈소스 AI 코딩 에이전트 (CLI + Web + Desktop)
- LLM 기반 대화형 코드 작성/편집/분석 도구

### 핵심 기술 스택
- **런타임**: Bun 1.3+
- **언어**: TypeScript (전체)
- **모노레포**: Bun Workspaces + Turbo
- **CLI/TUI**: Yargs + Ink (React 기반 터미널 UI)
- **웹 프론트엔드**: SolidJS + Vite + TailwindCSS
- **데스크탑**: Tauri (Rust 백엔드)
- **API 서버**: Hono (SSE 이벤트 스트리밍)
- **인프라**: SST (Cloudflare + PlanetScale + Stripe)
- **문서**: Mintlify + Astro (랜딩)
- **빌드**: Nix (재현 가능한 빌드)

### 주요 기능
- 다중 LLM 프로바이더 연동 (Anthropic, OpenAI, Copilot 등)
- 내장 도구 체계 (Bash, Edit, Read, Write, Glob, Grep, LSP, WebSearch 등)
- MCP (Model Context Protocol) 서버 연동
- 플러그인/스킬 확장 시스템
- 세션 관리 (대화 저장, 포크, 내보내기, 공유)
- 권한 관리 시스템 (도구 실행 승인/거부)
- 컨텍스트 압축 (장문 대화 자동 요약)
- Web UI / Desktop App / CLI TUI 3가지 인터페이스

### 대상 사용 사례
- 개발자의 일상적 코딩 작업 자동화
- AI 기반 코드 리뷰, 리팩토링, 디버깅
- GitHub PR/이슈 관리 연동
- 엔터프라이즈 팀 협업 (콘솔, 인증)
