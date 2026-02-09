# MCPs

## 일반 규칙
- 아래의 정보를 참조하여 mcp 도구를 사용하세요
- 아래 도구 중 할당된 작업에 필요한 mcp를 사용할 수 없는 경우 반드시 사용자의 피드백을 받으시오

---

## 사용 가능한 MCP 서버

### Serena MCP
**용도**: 메모리 관리 전용 도구, 최우선 사용

**주요 도구**:
| 도구 | 설명 |
|------|------|
| `list_memories` | 사용 가능한 메모리 목록 조회 |
| `read_memory` | 메모리 파일 읽기 |
| `write_memory` | 메모리 파일 쓰기 |
| `edit_memory` | 메모리 파일 편집 |
| `delete_memory` | 메모리 파일 삭제 |
| `activate_project` | 프로젝트 활성화 |

**사용 규칙**:
- 다른 도구 사용 전 반드시 `list_memories`로 메모리 목록 확인

---
### Context7 MCP
**용도**: 라이브러리/프레임워크 공식 문서 참조

**주요 도구**:
| 도구 | 설명 |
|------|------|
| `resolve-library-id` | 라이브러리 ID 검색 |
| `get-library-docs` | 라이브러리 문서 조회 |

**사용 규칙**:
- 출력 범위를 ~ 5k 토큰으로 유지
- 검색한 Library ID는 `.serena/memories/techcontext.md`에 저장
- 검색 전 techcontext.md에서 기존 Library ID 확인

---
