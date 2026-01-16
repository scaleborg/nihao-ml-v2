# Security Check

Thoroughly investigate the current feature for security problems, permission gaps, and vulnerabilities. Act like a red-team pen-tester. Suggest fixes.

## Checklist

- [ ] **Injection**: SQL injection, command injection, XSS
- [ ] **Authentication**: Auth bypass, session issues, token leaks
- [ ] **Authorization**: Permission gaps, IDOR, privilege escalation
- [ ] **Data exposure**: Sensitive data in logs, responses, or errors
- [ ] **Input validation**: Missing or weak validation
- [ ] **API security**: Rate limiting, CORS, exposed endpoints
- [ ] **Dependencies**: Known vulnerabilities in packages

## Output

1. List vulnerabilities found (severity: critical/high/medium/low)
2. Provide proof-of-concept or exploit path
3. Suggest specific fixes with code examples
