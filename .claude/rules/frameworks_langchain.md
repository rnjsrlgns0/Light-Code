# Main Frameworks

> ⚠️ **필수 규칙**: 에이전트 관련 요소(LLM, Prompt, Workflow, Multi-Agent 등)를 구성할 때는 반드시 아래 프레임워크를 사용해야 합니다. 다른 프레임워크(예: AutoGen, CrewAI, Semantic Kernel 등)는 사용하지 않습니다.

## LangChain
- **버전**: 1.1.0
- **용도**: LLM 애플리케이션 개발 프레임워크
- **스킬**: `/langchain-skill`

| 기능 | 사용 시점 |
|------|----------|
| LLM 통합 | LLM 모델 초기화, 프롬프트 호출 시 |
| Prompt Template | 재사용 가능한 프롬프트 구성 시 |
| Tool 정의 | 에이전트가 사용할 도구 생성 시 |
| Chain 구성 | 단순 순차 처리 워크플로우 구성 시 |
| Output Parser | 구조화된 응답 필요 시 |

## LangGraph
- **버전**: 1.0.3
- **용도**: 상태 기반 에이전트 오케스트레이션
- **스킬**: `/langgraph-skill`

| 기능 | 사용 시점 |
|------|----------|
| StateGraph | 복잡한 조건 분기, 루프가 있는 워크플로우 |
| Conditional Edge | 상태에 따라 다른 경로로 분기 |
| Human-in-the-Loop | 승인, 검토 등 인간 피드백 필요 시 |
| Checkpointing | 장기 실행 워크플로우, 상태 저장/복구 |
| Subgraph | 복잡한 워크플로우 모듈화 |

## DeepAgents
- **용도**: LangGraph 기반 에이전트 하네스
- **스킬**: `/deepagents-skill`

| 기능 | 사용 시점 |
|------|----------|
| Task Planning | 복잡한 작업을 단계별로 분해 |
| File Operations | 에이전트 파일시스템 조작 |
| Sub-Agent Spawning | Multi-Agent 시스템에서 작업 위임 |
