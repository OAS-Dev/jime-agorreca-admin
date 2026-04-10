# Skill Registry — jime-agorreca-admin

Generated: 2026-04-10

## Project Convention Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project context, architecture, commands |

## User Skills

| Name | Trigger |
|------|---------|
| `branch-pr` | When creating a pull request, opening a PR, or preparing changes for review |
| `go-testing` | When writing Go tests, using teatest, or adding test coverage |
| `issue-creation` | When creating a GitHub issue, reporting a bug, or requesting a feature |
| `judgment-day` | Parallel adversarial review — when asked to review code with adversarial judges |
| `skill-creator` | When user asks to create a new skill or document patterns for AI |

## Compact Rules

### branch-pr
- Open a GitHub issue FIRST before creating a PR (issue-first enforcement)
- PR must reference the issue in description
- Use `gh pr create` with structured body (Summary + Test plan)

### issue-creation
- Create issue before starting any non-trivial work
- Use GitHub issue for tracking; include context and acceptance criteria

### judgment-day
- Launch two independent blind judge sub-agents simultaneously
- Synthesize their findings and apply fixes
- Re-judge until both pass or escalate after 2 iterations

### skill-creator
- Follow the Agent Skills spec format
- Include frontmatter triggers (name, description, trigger)
- Save to `~/.claude/skills/{skill-name}/SKILL.md`
