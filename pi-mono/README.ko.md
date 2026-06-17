# Pi Coding Agent Tool
## Agent tool 설치
https://pi.dev/에 접속해서 원하는 방식으로 설치한다.

## package 설치
### pi-mcp-adaptor
Pi에서 MCP 서버 사용
```
pi install npm:pi-mcp-adapter
```

### context-mode
컨텍스트 저장, 세션 연속성, 코드 기반의 생각, 산문 스타일 비강제를 제공하여 컨텍스트 감소에 도움을 줌
```
pi install npm:context-mode
```

### gentle-engram
기본적으로 로컬에 저장되고, 필요할 때는 클라우드에 저장하며, 모든 에이전트에서 검색할 수 있도록 도와주는 영구 메모리.
```
brew install gentleman-programming/tap/engram
pi install npm:gentle-engram
engram setup pi
```

### @vndv/pi-codegraph
codegraph에 Pi가 접근할 수 있도록 권한을 부여함. CodeGraph는 tree-sitter를 사용하여 프로젝트를 인덱싱하고 Pi는 기본확장 도구를 통해 심볼, 호출자, 피호출자, 종속성 영향, 파일 및 호출 경로를 쿼리 할 수 있음
```
npm install -g @colbymchenry/codegraph
cd /path/to/project
codegraph init -i
pi install npm:@vndv/pi-codegraph@0.1.7
pi
```

### rpiv-pi
spec-kit과 택1 (소규모 작업)
```
pi install npm:@juicesharp/rpiv-pi
```

### spec-kit
rpiv-pi와 택1 (대규모 작업)

https://github.com/github/spec-kit
```
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```
