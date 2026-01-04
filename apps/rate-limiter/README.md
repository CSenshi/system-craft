# 🚦 Rate Limiter

> **Production-ready rate limiting service with multiple algorithm implementations**

## Key Components

### Algorithms

- **Fixed Window Algorithm**  
  [`src/rate-limiter/algorithms/fixed-window`](src/rate-limiter/algorithms/fixed-window/fixed-window.script.ts)

- **Sliding Window Log Algorithm**  
  [`src/rate-limiter/algorithms/sliding-window-log`](src/rate-limiter/algorithms/sliding-window-log/sliding-window-log.script.ts)

- **Sliding Window Counter Algorithm**  
  [`src/rate-limiter/algorithms/sliding-window-counter`](src/rate-limiter/algorithms/sliding-window-counter/sliding-window-counter.script.ts)

- **Token Bucket Algorithm**  
  [`src/rate-limiter/algorithms/token-bucket`](src/rate-limiter/algorithms/token-bucket/token-bucket.script.ts)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

## ✨ **Features**

### **Core Functionality**

- ✅ **Multiple Algorithm Support** – Fixed Window, Sliding Window Log, Sliding Window Counter, and Token Bucket
- ✅ **Flexible Rule Configuration** – Define multiple rate limit rules with different algorithms and limits
- ✅ **Client Identification** – Supports user ID, API key and IP address-based identification
- ✅ **Redis-Based Storage** – High-performance rate limit tracking using Redis Lua scripts
- ✅ **Decorator-Based API** – Easy-to-use `@RateLimit()` decorator for route protection
- ✅ **Standard Rate Limit Headers** – Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers

## 🛠️ **Tech Stack**

### **Backend**

- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Language**: [TypeScript](https://www.typescriptlang.org/)

### **Data Layer**

- **Storage**: [Redis](https://redis.io/) - High-performance in-memory data store
- **Scripts**: Redis Lua scripts for atomic rate limit operations

### **Development & DevOps**

- **Package Manager**: [pnpm](https://pnpm.io/) - Fast, efficient package management
- **Testing**: [Jest](https://jestjs.io/) - Comprehensive test suite
- **Logging**: Built-in NestJS logging

## 📦 **Installation & Setup**

### **Prerequisites**

- Node.js 22+
- Docker & Docker Compose (for Redis)
- pnpm

### **Quick Start**

```bash
# 1. Clone the repository (Needed only 1st time)
git clone https://github.com/CSenshi/system-craft.git
cd system-craft

# 2. Install dependencies (Needed only 1st time)
pnpm install

# 3. Copy env file (Needed only 1st time)
cp apps/rate-limiter/.env.example apps/rate-limiter/.env

# 4. Start required services (Needed only 1st time)
pnpm nx run @apps/rate-limiter:infra:up

# 5. Start the development server
pnpm nx run @apps/rate-limiter:serve
```

## 🎯 **Rate Limiting Algorithms**

### **1. Fixed Window**

**How it works:** Divides time into fixed intervals (e.g., 1-minute windows). Each window has its own counter that resets at the start of the next window. Requests increment the counter for the current window.

- **Time**: O(1) - Single Redis INCR operation
- **Space**: O(1) per client - One counter per time window
- **Accuracy**: Low - Allows boundary bursts (2N requests possible at window transitions)
- **Best For**: High-throughput scenarios where exact accuracy isn't critical

### **2. Sliding Window Log**

**How it works:** Stores a timestamp for each request in a hash. When checking limits, counts only requests within the last W seconds by removing expired entries. Most precise but requires storing all request timestamps.

- **Time**: O(1)\* - Redis `HLEN` maintains count internally
- **Space**: O(N) per client - Stores one entry per request in the window
- **Accuracy**: High - Precisely enforces "N requests in last W seconds" with no boundary bursts
- **Best For**: Low to medium traffic where accuracy is critical

### **3. Sliding Window Counter**

**How it works:** Uses weighted counters from current and previous time periods. Calculates approximate count using formula:

```
weight = (remainingTime/windowSize)
count = previousCount * weight + currentCount
```

Cloudflare-style approach that balances accuracy and efficiency.

- **Time**: O(1) - Fixed hash operations (2 periods)
- **Space**: O(1) per client - Stores counters for current and previous periods only
- **Accuracy**: Medium - Good approximation with minimal deviation from true count
- **Best For**: Production systems needing good accuracy with high performance

### **4. Token Bucket**

**How it works:** Maintains a bucket with tokens (up to capacity). Tokens refill at a constant rate (limit/windowSeconds per second). Each request consumes one token. Allows bursts up to bucket capacity while maintaining average rate.

- **Time**: O(1) - Fixed hash operations for token refill and consumption
- **Space**: O(1) per client - Stores token count and last refill timestamp
- **Accuracy**: Medium - Enforces average rate over time, not strict "N requests in last W seconds"
- **Best For**: Traffic shaping, APIs that benefit from burst allowance

### **Algorithm Comparison**

| Algorithm                  | Time (per client) | Space (per client) | Accuracy | Burst Handling     |
| -------------------------- | ----------------- | ------------------ | -------- | ------------------ |
| **Fixed Window**           | O(1)              | O(1)               | Low      | Poor (edge bursts) |
| **Sliding Window Log**     | O(1) (Amortized)  | O(N)               | High     | None               |
| **Sliding Window Counter** | O(1)              | O(1)               | Medium   | Limited            |
| **Token Bucket**           | O(1)              | O(1)               | Medium   | Excellent          |

> Notes:
>
> - `Accuracy` - how precisely the algorithm enforces “X requests per time window”
> - `Burst handling` - ability to temporarily allow traffic spikes while still enforcing long-term limits

## 🧪 **Testing**

### **Run Tests**

```bash
# Unit tests
pnpm nx test @apps/rate-limiter

# Integration tests
pnpm nx test:int @apps/rate-limiter

# E2E tests
pnpm nx e2e @e2e/rate-limiter
```
