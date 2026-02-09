# Commit Rules

## 커밋 메시지 포맷

### Conventional Commits 형식 사용
- `feat:` - 새 기능
- `fix:` - 버그 수정
- `refactor:` - 리팩토링
- `docs:` - 문서
- `test:` - 테스트
- `chore:` - 빌드/설정

## ⚠️ 중요: 커밋 메시지 제약사항

**커밋 메시지에 다음 내용을 포함하지 마세요:**
- ❌ "🤖 Generated with Claude Code" 또는 유사한 AI 생성 표시
- ❌ "Co-Authored-By: Claude [MODEL]" 또는 AI 공동 작성자 표시
- ✅ 일반적인 Conventional Commits 형식만 사용

## 올바른 커밋 메시지 예제

```bash
git commit -m "feat: add worktree detection to branch-manager

- Implement automatic worktree detection
- Add session-based worktree creation
- Support concurrent Claude Code sessions"
```

## 잘못된 커밋 메시지 예제 (사용 금지)

```bash
# ❌ 잘못된 예 - AI 생성 표시 포함
git commit -m "feat: add worktree detection

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```
