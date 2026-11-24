# @gsashish/virtual

> Tiny virtualization engine for lists, grids, masonry and reverse chat scroll — **<6 kB gzipped**.

[![npm](https://img.shields.io/npm/v/@gsashish/virtual)](https://www.npmjs.com/package/@gsashish/virtual)
[![CI](https://github.com/gsashish-code/oss/actions/workflows/ci.yml/badge.svg)](https://github.com/gsashish-code/oss/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[**Demo →**](https://virtual.gsashish.in)

## Features

- Virtual **list** with dynamic heights (ResizeObserver)
- Virtual **grid** (row + column virtualization)
- **Chat/reverse scroll** mode — anchored bottom, prepend without jump, stick-to-bottom
- React hooks + ready-made components
- TypeScript-first, zero deps (React optional peer dep)

## Install

```bash
npm install @gsashish/virtual
# or
pnpm add @gsashish/virtual
```

## Quick Start — VirtualList

```tsx
import { VirtualList } from '@gsashish/virtual/react'

const items = Array.from({ length: 10_000 }, (_, i) => `Item ${i}`)

export function App() {
  return (
    <VirtualList
      count={items.length}
      estimateSize={() => 48}
      height={600}
      renderItem={(index) => (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          {items[index]}
        </div>
      )}
    />
  )
}
```

## Quick Start — Chat Scroll

```tsx
import { useChatVirtualizer } from '@gsashish/virtual/react'

export function ChatWindow({ messages }) {
  const { items, totalSize, scrollRef, measureRef, scrollToBottom } = useChatVirtualizer({
    count: messages.length,
    estimateSize: () => 56,
    onReachedTop: () => loadMoreMessages(), // infinite scroll upward
  })

  return (
    <div ref={scrollRef} style={{ height: 600, overflow: 'auto', position: 'relative' }}>
      <div style={{ height: totalSize, position: 'relative' }}>
        {items.map((item) => (
          <div
            key={item.key}
            ref={measureRef(item.index)}
            style={{ position: 'absolute', top: 0, width: '100%', transform: `translateY(${item.start}px)` }}
          >
            {messages[item.index].text}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## API

### `useVirtualizer(options)`

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `count` | `number` | ✓ | — | Total item count |
| `getScrollElement` | `() => Element \| null` | ✓ | — | Returns the scroll container |
| `estimateSize` | `(index: number) => number` | ✓ | — | Estimated px height per item |
| `overscan` | `number` | | `3` | Extra items rendered outside viewport |
| `reverse` | `boolean` | | `false` | Reverse/chat scroll mode |
| `onReachedTop` | `() => void` | | — | Fired when scroll reaches top |
| `onReachedBottom` | `() => void` | — | — | Fired when scroll reaches bottom |

### `useChatVirtualizer(options)`

Same as `useVirtualizer` minus `reverse` (always `true`). Returns `scrollRef`, `measureRef`, `scrollToBottom`, `isStuckToBottom`.

### `<VirtualList />` Props

Accepts all `useVirtualizer` options plus:

| Prop | Type | Description |
|------|------|-------------|
| `height` | `number \| string` | Container height |
| `renderItem` | `(index: number) => ReactNode` | Item renderer |

## License

MIT © [G S Ashish](https://github.com/gsashish-code)
