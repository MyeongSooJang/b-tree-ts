# B+ Tree 구현 및 벤치마크 설계

## 개요

DB에서 사용하는 B+ 트리를 구현하고, 디스크(파일) 접근 비용과 메모리 접근 비용을
실측 비교하여 B+ 트리의 페이지 크기 설계 원리를 체감하는 것이 목표다.

---

## 페이지 크기 기반 order 자동 계산

InnoDB처럼 order를 직접 지정하지 않고, **페이지 크기와 키 크기로 자동 결정**한다.

### 계산 방식

```
내부 노드 1 entry = 키 크기 + 자식 포인터 크기(6B)
사용 가능 공간 = 페이지 크기 - 페이지 헤더(100B)
order = floor(사용 가능 공간 / entry 크기)
```

### 키 타입별 order 예시 (페이지 16KB 기준)

| 키 타입 | 키 크기 | entry 크기 | order |
|---------|---------|-----------|-------|
| INT | 4B | 10B | ~1,500 |
| BIGINT | 8B | 14B | ~1,170 |
| VARCHAR(255) | 255B | 261B | ~62 |

### 트리 높이별 저장 가능 row 수 (BIGINT 기준, order=1,170)

| 층 수 | 저장 가능 row 수 |
|-------|----------------|
| 1층 | ~1,170 |
| 2층 | ~136만 |
| 3층 | ~16억 |

### 생성 방식

```ts
// 페이지 크기(bytes)와 키 크기(bytes)를 주입
new BPlusTree(pageSize, keySize, store)

// 내부에서 order 자동 계산
const POINTER_SIZE = 6
const PAGE_HEADER = 100
const order = Math.floor((pageSize - PAGE_HEADER) / (keySize + POINTER_SIZE))
```

---

## 구현 범위

### B+ 트리 연산
- `insert(key, value)` — 삽입 및 노드 분할(split)
- `search(key)` — 단일 키 검색
- `delete(key)` — 삭제 및 노드 병합/재분배
- `rangeSearch(min, max)` — 범위 검색 (리프 노드 연결 리스트 활용)

### 설정
- `pageSize`: 페이지 크기 (기본값 16,384B = 16KB)
- `keySize`: 키 타입 크기 (INT=4, BIGINT=8, VARCHAR=가변)
- 키: `number`, 값: `string` (고정 타입, 추후 제네릭 확장 예정)

---

## 아키텍처

```
src/
  types.ts              # NodeId, Node 유니온 타입, PageConfig
  NodeStore.ts          # INodeStore 인터페이스
  MemoryNodeStore.ts    # Map 기반 인메모리 저장소 (책상)
  FileNodeStore.ts      # 파일 기반 저장소 (창고, 실제 disk I/O)
  LeafNode.ts           # 리프 노드
  InternalNode.ts       # 내부(중간) 노드
  BPlusTree.ts          # 트리 로직 (INodeStore에만 의존)
  Benchmark.ts          # 시간 측정 및 결과 출력
  index.ts              # 벤치마크 실행 진입점
```

### 핵심 설계 원칙
- `BPlusTree`는 `INodeStore` 인터페이스에만 의존
- `MemoryNodeStore` / `FileNodeStore`는 동일 인터페이스 구현
- 저장소만 교체하면 메모리/파일 모드 전환 가능

---

## 벤치마크 설계

### 측정 1: 층간 비교 (디스크 접근 횟수 차이)

| 시나리오 | 설명 |
|----------|------|
| 2층 트리에서 값 찾기 | 디스크 2번 읽기 |
| 1층 트리에서 값 찾기 | 디스크 1번 읽기 |

→ 층이 하나 늘어날 때 소요 시간 증가폭 측정

### 측정 2: 같은 층 내 위치 비교 (메모리 읽기 비용)

| 시나리오 | 설명 |
|----------|------|
| 동일 노드에서 1번째 키 찾기 | 키 1번 비교 |
| 동일 노드에서 N번째 키 찾기 | 키 N번 비교 |

→ 같은 노드 안에서 키를 하나씩 훑는 비용 측정

### 측정 3: 페이지 크기별 비교

페이지 크기 = 4KB / 8KB / 16KB로 고정 데이터를 삽입했을 때:
- 자동 계산된 order 값
- 트리 높이(층 수) 변화
- 로드 시간 (삽입)
- 검색 시간

### 측정 4: 배열과 비교

동일 데이터를 배열에 넣고 선형 탐색했을 때 vs B+ 트리 검색 시간 비교

### 출력 예시

```
=== pageSize=4KB  → order=370  (트리 높이: 4층) ===
[File]   로드: 340ms  |  검색(1층): 12ms  |  검색(2층): 24ms
[Memory] 로드: 12ms   |  검색(1층): 0.3ms |  검색(2층): 0.6ms

=== pageSize=16KB → order=1170 (트리 높이: 2층) ===
[File]   로드: 280ms  |  검색(1층): 12ms  |  검색(2층): 24ms
[Memory] 로드: 15ms   |  검색(1층): 0.1ms |  검색(2층): 0.2ms

vs 배열 선형 탐색: 0.5ms
```

---

## 기존 파일 처리

| 파일 | 처리 |
|------|------|
| `LeafNode.ts` | 유지 (변경 없음) |
| `InternalNode.ts` | 유지 (변경 없음) |
| `types.ts` | `NodeId` 유지, `Node` 유니온 타입 및 `PageConfig` 추가 |

---

## 제외 범위

- 제네릭 타입 (`BPlusTree<K,V>`) — 추후 확장
- 트랜잭션 / 동시성 제어
- 페이지 캐시(버퍼 풀) 시뮬레이션
