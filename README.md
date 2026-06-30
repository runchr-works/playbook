# 플레이북 (Playbook)

**runchr 공유 모노레포** — 우리가 제품을 만들며 실제로 사용하는 규칙, 도구, 문서들을 모아둔 저장소입니다.

## AGENTS.md

[AGENTS.md](./agents-md)

## Agent Tools
* https://github.com/Gitlawb/openclaude
* https://github.com/lidge-jun/opencodex

## 패키지 (Packages)

| 패키지                | 설명                                 |
| ------------------ | ---------------------------------- |
| [memkit](./memkit) | 코딩 에이전트용 MCP 도구를 한 번에 설정할 수 있는 패키지 |

## 즐겨찾기 (Favorites)

| 이름                                       | 설명                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [makeable.me](https://makeable.me/en)    | 디자인 시스템을 추출하고, 화면에 보이는 프론트엔드를 수정 가능한 React 코드로 재구성합니다.                                                         |
| [designmd](https://www.designmd.supply/) | 공개된 도메인을 입력하면 Google 스타일의 DESIGN.md를 생성하여 AI 에이전트에 바로 활용할 수 있습니다.                                              |
| [herdr](https://herdr.dev/)              | 터미널 내부에서 동작하는 에이전트 런타임입니다. 기존 셸 환경과 SSH 설정은 그대로 유지하면서, tmux 스타일의 지속성, 마우스 기반 패널, 에이전트 상태 관리, API 제어 기능을 제공합니다. |
| [ui-skills](https://www.ui-skills.com/)  | 디자인 엔지니어를 위한 다양한 UI 스킬 모음입니다.                                                                                  |
| [skillui](https://skillui.vercel.app/)   | URL, 저장소, 또는 폴더를 분석하여 색상, 폰트, 간격, 컴포넌트, 애니메이션 등을 `.skill` 파일로 생성하고, 이를 통해 Claude Code에서 동일한 UI를 구현할 수 있습니다.    |

추가 참고 자료:

* https://www.designmode.app/
* https://getyoink.dev/

## 철학 (Philosophy)

우리는 제품을 만듭니다.

그 과정에서 실제로 효과가 있었던 도구, 패턴, 그리고 개발 규칙들을 발견합니다.
Playbook은 그런 경험들을 단순한 이론이 아니라, 우리가 매일 사용하는 실전 사례로 공유하는 공간입니다.

현재의 핵심 목표는 코딩 에이전트가 최고의 MCP 도구에 직접 접근할 수 있도록 하는 것입니다.

* **Hindsight**: 장기 기억 관리
* **CodeGraph**: 코드 이해 및 탐색
* **context-mode**: 세션 및 작업 맥락 추적

중간 프록시나 제한된 기능 없이, 원래의 기능을 그대로 활용하는 것을 지향합니다.

## 개발 (Development)

```bash
git clone https://github.com/runchr-works/playbook.git
cd playbook/memkit
npm install
npm run check
npm test
```
