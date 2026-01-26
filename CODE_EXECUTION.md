# Code Execution Guide

This document explains how the code execution system works in CodeComp.

## Overview

CodeComp uses **Piston** - a high-performance, sandboxed code execution engine that runs code in isolated Docker containers.

## How It Works

```
User Code → API Route → Piston API → Docker Container → Results → User
```

1. User writes code in the Monaco editor
2. Code is sent to `/api/execute` endpoint
3. API validates the code and language
4. Code is sent to Piston API with test case inputs
5. Piston executes code in an isolated Docker container
6. Results are returned (stdout, stderr, exit code, execution time)
7. Results are compared against expected outputs
8. Score is calculated and returned to the user

## Supported Languages

| Language   | Version  | File Name |
|------------|----------|-----------|
| Python     | 3.10.0   | main.py   |
| JavaScript | 18.15.0  | main.js   |
| Java       | 15.0.2   | Main.java |
| C++        | 10.2.0   | main.cpp  |
| C#         | 6.12.0   | Main.cs   |
| Go         | 1.16.2   | main.go   |
| Rust       | 1.68.2   | main.rs   |

## Security Features

### Sandboxing
- Each execution runs in an isolated Docker container
- Containers are destroyed after execution
- No persistent state between executions

### Resource Limits
- **Compile Timeout**: 10 seconds
- **Run Timeout**: 5 seconds  
- **Total Request Timeout**: 15 seconds
- **Memory Limit**: Enforced by Docker
- **CPU Limit**: Enforced by Docker

### Network Isolation
- Containers have no network access
- Cannot make external API calls
- Cannot download files

### File System
- Read-only file system
- Cannot write or modify files
- Cannot execute system commands

## Configuration

### Using Public Piston Instance (Development)

The app is pre-configured to use the public Piston instance:

```env
CODE_EXECUTION_API_URL=https://emkc.org/api/v2/piston
```

**Pros:**
- No setup required
- Free to use
- Always up-to-date

**Cons:**
- Shared resource (may be slower)
- Rate limits may apply
- Not suitable for production

### Self-Hosting Piston (Production)

For production, self-host Piston for better control:

#### Using Docker

```bash
docker run -d \
  --name piston \
  -p 2000:2000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart unless-stopped \
  ghcr.io/engineer-man/piston
```

#### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  piston:
    image: ghcr.io/engineer-man/piston
    container_name: piston
    ports:
      - "2000:2000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

#### Update Environment Variable

```env
CODE_EXECUTION_API_URL=http://your-server:2000/api/v2/piston
```

## API Reference

### Execute Code

**Endpoint**: `POST /api/execute`

**Request Body**:
```json
{
  "code": "print('Hello World')",
  "language": "python",
  "competition_id": "uuid-here",
  "test_only": true
}
```

**Parameters**:
- `code` (required): The source code to execute
- `language` (required): Programming language (python, javascript, java, cpp, csharp, go, rust)
- `competition_id` (optional): Competition ID to fetch test cases
- `test_only` (optional): If true, only run non-hidden test cases

**Response**:
```json
{
  "results": [
    {
      "passed": true,
      "input": "5",
      "expected": "5",
      "actual": "5",
      "error": null,
      "executionTime": 123,
      "stderr": ""
    }
  ],
  "score": 100,
  "passedTests": 3,
  "totalTests": 3
}
```

## Test Cases

### Database Test Cases

Test cases are stored in the `test_cases` table:

```sql
CREATE TABLE test_cases (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  input TEXT,
  expected_output TEXT,
  points INTEGER DEFAULT 10,
  is_hidden BOOLEAN DEFAULT FALSE
);
```

**Fields**:
- `input`: Input data passed to the program via stdin
- `expected_output`: Expected stdout output
- `points`: Points awarded for passing this test
- `is_hidden`: If true, only shown during final submission (not during testing)

### Default Test Cases

If no test cases exist for a competition, default test cases are used:

```typescript
const DEFAULT_TEST_CASES = [
  { input: "5", expected: "5", points: 10, isHidden: false },
  { input: "10", expected: "10", points: 10, isHidden: false },
  { input: "1", expected: "1", points: 10, isHidden: false },
];
```

## Adding New Languages

To add support for a new language:

1. Check if Piston supports it: `GET /api/v2/piston/runtimes`

2. Add to `LANGUAGE_MAP` in `/lib/code-execution.ts`:

```typescript
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  // ... existing languages
  ruby: { language: "ruby", version: "3.0.1" },
};
```

3. Add file extension in `getFileName()`:

```typescript
function getFileName(language: string): string {
  const fileNames: Record<string, string> = {
    // ... existing extensions
    ruby: "main.rb",
  };
  return fileNames[language.toLowerCase()] || "main.txt";
}
```

4. Update the competition creation form to include the new language.

## Error Handling

### Compilation Errors

If code fails to compile, the error is returned:

```json
{
  "passed": false,
  "error": "SyntaxError: invalid syntax",
  "stderr": "...",
  "stdout": ""
}
```

### Runtime Errors

If code crashes during execution:

```json
{
  "passed": false,
  "error": "RuntimeError: division by zero",
  "stderr": "...",
  "stdout": "..."
}
```

### Timeout Errors

If code exceeds time limits:

```json
{
  "error": "Execution timeout - code took too long to run"
}
```

## Performance Optimization

### Caching

For frequently run code (e.g., during testing), consider caching results:

```typescript
// Example using Redis
const cacheKey = `exec:${hash(code + language + input)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await executeCode(code, language, input);
await redis.setex(cacheKey, 300, JSON.stringify(result)); // Cache for 5 min
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// Example using Redis
const userKey = `rate:${userId}`;
const count = await redis.incr(userKey);
if (count === 1) await redis.expire(userKey, 60);
if (count > 10) throw new Error('Rate limit exceeded');
```

## Troubleshooting

### "Unsupported language" Error

**Problem**: Language not found in LANGUAGE_MAP

**Solution**: Check spelling and ensure language is added to LANGUAGE_MAP

### Timeout Errors

**Problem**: Code takes too long to execute

**Solution**: 
- Optimize the code
- Reduce problem complexity
- Increase timeout limits (if appropriate)

### Network Errors (Cannot reach Piston)

**Problem**: Cannot connect to Piston API

**Solution**:
- Check `CODE_EXECUTION_API_URL` is correct
- Verify Piston container is running
- Check firewall rules
- Ensure network connectivity

### Docker Socket Permission Denied

**Problem**: Piston cannot access Docker socket

**Solution**:
```bash
# Add proper permissions
sudo chmod 666 /var/run/docker.sock

# Or run Piston with proper user permissions
docker run --user $(id -u):$(id -g) ...
```

## Best Practices

### For Competition Creators

1. **Test your test cases**: Run them yourself before publishing
2. **Use hidden test cases**: Prevent hardcoding solutions
3. **Provide sample inputs**: Help participants understand requirements
4. **Set appropriate limits**: Balance difficulty with fairness

### For Developers

1. **Always validate input**: Check language support before execution
2. **Handle errors gracefully**: Provide clear error messages
3. **Monitor execution times**: Track slow/problematic code
4. **Log failures**: Keep logs for debugging
5. **Implement rate limiting**: Prevent abuse and overload

### For System Administrators

1. **Monitor Piston resources**: CPU, memory, disk usage
2. **Update regularly**: Keep Piston and language runtimes updated
3. **Backup configurations**: Save important settings
4. **Scale horizontally**: Run multiple Piston instances for high load
5. **Implement monitoring**: Use tools like Prometheus/Grafana

## Advanced Configuration

### Custom Language Versions

To use specific language versions, update LANGUAGE_MAP:

```typescript
python: { language: "python", version: "3.11.0" }
```

Check available versions:
```bash
curl https://emkc.org/api/v2/piston/runtimes
```

### Custom Execution Parameters

Modify execution parameters in `/lib/code-execution.ts`:

```typescript
{
  compile_timeout: 20000,  // 20 seconds
  run_timeout: 10000,      // 10 seconds
  compile_memory_limit: 500000000,  // 500 MB
  run_memory_limit: 500000000,       // 500 MB
}
```

## Resources

- [Piston GitHub](https://github.com/engineer-man/piston)
- [Piston Documentation](https://github.com/engineer-man/piston/blob/master/README.md)
- [Supported Languages](https://github.com/engineer-man/piston/blob/master/packages/list.md)
- [API Reference](https://github.com/engineer-man/piston/blob/master/api.md)

## Support

For code execution issues:
1. Check this guide first
2. Review Piston logs: `docker logs piston`
3. Test Piston API directly with curl
4. Open an issue with error details
