# MOVEBUDDY ENGINEERING CONSTITUTION v1.0

## PART 1 — Engineering Mission

### Engineering Mission
The mission of MoveBuddy engineering is to build and operate a secure, reliable, maintainable, and scalable commuter mobility platform that enables trusted daily rides for millions of users while protecting privacy, delivering operational excellence, and preserving long-term product quality.

### Engineering Vision
Our engineering vision is to create a modern mobility platform that is resilient by design, easy to evolve, fast to operate, and trusted by users, partners, and regulators. We aim to make engineering decisions that support a global commuter service without sacrificing safety, simplicity, or user trust.

### Engineering Values
- Security first
- Reliability through redundancy
- Maintainability through clarity
- Simplicity over complexity
- Privacy by default
- Performance with purpose
- Automation as standard
- Ownership and accountability
- Observability by default
- Continuous improvement

### Long-term Engineering Goals
- Build a robust modular architecture capable of scaling from India to international markets.
- Maintain production stability with no single points of failure.
- Ensure all critical flows are covered by automated tests and observability.
- Preserve user trust through rigorous security, privacy, and data integrity controls.
- Enable rapid feature delivery without compromising platform quality.
- Support enterprise and consumer usage with clear, audited operational practices.

---

## PART 2 — Engineering Principles

### Security First
Why it exists: Every commute is a personal, physical interaction. Engineering must protect users, payments, identifiers, and workflow integrity.
Risks if ignored: Data breaches, fraudulent rides, payment loss, regulatory penalties, and permanent loss of trust.
How it applies: All services must enforce authentication, authorization, input validation, secure secrets handling, and strong audit trails.

### Privacy by Design
Why it exists: Mobility data is sensitive, and privacy is essential to user trust and compliance.
Risks if ignored: Legal risk, user churn, and reputational damage.
How it applies: Only collect data required for ride matching, wallet transactions, safety, and operational support.

### Zero Trust
Why it exists: Every system boundary can be breached; trust must be continuously verified.
Risks if ignored: Unauthorized access, lateral movement, privilege escalation.
How it applies: Backend services must authenticate and authorize every request and never trust client-supplied values.

### API First
Why it exists: Clear, consistent APIs make product, mobile, web, and future enterprise integrations reliable.
Risks if ignored: Poor interoperability, duplicated logic, inconsistent behavior.
How it applies: Design APIs before implementation, document them, and make the backend the source of truth.

### Backend is the Source of Truth
Why it exists: Only the backend can enforce business rules, security, and data integrity.
Risks if ignored: Inconsistent state, client-side fraud, stale data, and trust erosion.
How it applies: Never rely on client-side calculations for pricing, eligibility, or authorization decisions.

### Fail Securely
Why it exists: Failures should never create unsafe states or expose sensitive data.
Risks if ignored: Data leaks, broken security, invalid ride completions.
How it applies: Implement defensive coding, graceful degradation, and safe defaults.

### Simplicity over Cleverness
Why it exists: Clear solutions are easier to understand, maintain, and audit.
Risks if ignored: Fragile code, hidden bugs, long-term technical debt.
How it applies: Prefer readable architecture and explicit logic over optimization tricks.

### Maintainability over Speed
Why it exists: The product must be sustainable for years, not just weeks.
Risks if ignored: Accumulated debt, slower future delivery, brittle platform.
How it applies: Require clean abstractions, documentation, and code review discipline.

### Automation First
Why it exists: Manual processes are error-prone and slow.
Risks if ignored: Deployment mistakes, missed regressions, inconsistent environments.
How it applies: Automate testing, deployment, monitoring, and security checks.

### Observability by Default
Why it exists: Visibility is required to operate a mission-critical service safely.
Risks if ignored: Undetected outages, slow incident response, unclear root causes.
How it applies: Instrument code with structured logs, metrics, tracing, and alerting.

---

## PART 3 — Software Architecture Standards

### Modular Monolith
- Why: MoveBuddy launches as a manageable, cohesive system while keeping future service boundaries clear.
- Standard: Organize code by domain modules, not by technical layers alone. Each module owns its own data, validation, business logic, and API contract.
- Example: Keep `auth`, `rides`, `wallet`, `subscriptions`, `support`, and `admin` as separate modules.
- Never: Create a single folder of unrelated utilities that mixes all business domains.

### Future Microservice Readiness
- Why: The platform must be able to evolve into services when scale demands.
- Standard: Define well-bounded domain interfaces and asynchronous contracts early.
- Example: Design ride matching, payments, and notifications as separable domains with explicit boundaries.
- Never: Hard-wire modules together using global mutable state.

### Domain Separation
- Why: Clear domains reduce coupling and improve maintainability.
- Standard: Each domain owns its own models, business rules, and database interactions.
- Example: `wallet` module should not directly query `rides` without going through a domain contract.
- Never: Let `admin` logic leak into core ride-matching code.

### Clean Architecture
- Why: Separation of concerns enables easier testing and evolution.
- Standard: Keep controllers, use cases, domain entities, and infrastructure separate.
- Example: Controllers handle HTTP concerns, use cases execute business logic, repositories handle persistence.
- Never: Put business rules in route handlers or raw queries in UI code.

### SOLID Principles
- Why: They guide robust and extensible object and module design.
- Standard: Use single responsibility, open/closed, Liskov substitution, interface segregation, and dependency inversion.
- Example: A `RideService` should not also manage payments.
- Never: Create classes or modules with multiple unrelated responsibilities.

### Dependency Injection
- Why: It enables testing and decouples implementation from contracts.
- Standard: Inject external dependencies such as repositories, mailers, payment clients, and feature toggles.
- Example: Pass Prisma client and Razorpay client into service constructors instead of importing them globally.
- Never: Use global singletons for external systems in business logic.

### Layer Responsibilities
- Why: Clear layer boundaries improve reasoning and reduce side effects.
- Standard: Presentation handles request/response, application handles orchestration, domain handles rules, infrastructure handles persistence and external systems.
- Example: Validation occurs before use case execution; persistence occurs after business rules are satisfied.
- Never: Write raw SQL in controllers or call external APIs from domain entities.

### Event-Driven Communication
- Why: It supports decoupling, retries, and future scale.
- Standard: Use events for asynchronous domain updates such as notifications, audit logs, and background jobs.
- Example: Emit `RideCompleted` and handle wallet settlement in separate processing.
- Never: Process long-running tasks synchronously inside request handlers.

### Caching Strategy
- Why: Cache improves performance without reducing correctness.
- Standard: Cache only derived read-heavy data, keep cache invalidation explicit, and never cache sensitive ephemeral state without encryption.
- Example: Cache branding config and feature flags with short TTLs; do not cache wallet balances indefinitely.
- Never: Use stale cache to authorize rides or calculate wallet balances.

### Background Jobs
- Why: Resource-intensive and retryable work belongs outside the request path.
- Standard: Use reliable background job mechanisms for notifications, reconciliation, and cleanup.
- Example: Send support emails, refill analytics, and process payout batches asynchronously.
- Never: Perform payment verification, KYC checks, or ride matching synchronously during user-facing requests.

### WebSockets
- Why: WebSockets provide real-time status updates for rides and notifications.
- Standard: Use WebSockets for transient state and fall back to API polling for critical status. Keep state in backend authoritative storage.
- Example: Emit ride progress events to connected clients, but persist every status change in the database.
- Never: Rely on WebSocket state alone for critical flow decisions.

### Configuration Management
- Why: Clear configuration prevents environment drift and misconfiguration.
- Standard: Store all environment-specific values in secure environment variables. Avoid checked-in secrets. Validate configuration at startup.
- Example: `JWT_SECRET`, `DATABASE_URL`, `RAZORPAY_KEY_SECRET` must be environment-managed.
- Never: Hard-code secrets, credentials, or environment-specific values in source code.

---

## PART 4 — Repository Standards

### Folder Structure
- Why: A standard structure improves discoverability and onboarding.
- Standard: Group by domain and purpose. Example structure:
  - `src/`: application source.
  - `src/auth/`, `src/rides/`, `src/wallet/`, `src/subscriptions/`, `src/support/`, `src/admin/`.
  - `src/shared/`: shared utilities, types, and infrastructure.
  - `src/lib/`: reusable client-side helpers.
- Never: Mix unrelated domains in the same folder.

### Naming Conventions
- Why: Consistent names reduce ambiguity.
- Standard: Use clear, descriptive names. `RideService`, `WalletRepository`, `SubscriptionController`.
- Example: API routes should reflect resources: `/api/rides`, `/api/auth/login`.
- Never: Name files or modules with vague terms like `utils` for domain logic.

### Module Boundaries
- Why: Boundaries maintain modularity and reduce coupling.
- Standard: A module may depend on shared infrastructure, not on other domain modules directly.
- Example: `support` can use `notifications`, but should communicate through explicit interfaces.
- Never: Import domain modules into unrelated domains without clear contract.

### File Size Limits
- Why: Large files become hard to read and maintain.
- Standard: Keep files under 300 lines when possible. Split large handlers, services, and UI components.
- Never: Create monolithic files with hundreds of unrelated functions.

### Service Responsibilities
- Why: Services encapsulate use cases and business rules.
- Standard: Services should orchestrate flows, validate rules, and keep side effects explicit.
- Example: `SubscriptionService` manages plan activation and renewal policies.
- Never: Put HTTP or database wiring inside domain service logic.

### Controller Responsibilities
- Why: Controllers should convert requests and responses only.
- Standard: Controllers validate input, call services, and return results or errors.
- Example: `AuthController` should not contain subscription pricing rules.
- Never: Implement business logic in controller code.

### DTO Rules
- Why: DTOs define clear boundaries for input and output.
- Standard: Use explicit DTOs for all API request and response payloads.
- Example: `CreateRideRequestDto`, `SubscriptionSummaryDto`.
- Never: Accept or return raw domain objects directly from APIs.

### Validation Rules
- Why: Validation protects data integrity and security.
- Standard: Perform validation at the boundary with strong typing and explicit schemas.
- Example: Validate request payloads before invoking business use cases.
- Never: Trust client payloads or perform validation only in persistence.

---

## PART 5 — Database Standards

### PostgreSQL Standards
- Why: A strong relational foundation ensures consistency and robust query capabilities.
- Standard: Use PostgreSQL features such as transactions, constraints, indexes, and JSONB only where appropriate.
- Example: Use relational tables for users, rides, subscriptions, wallets, and audit logs.
- Never: Use PostgreSQL as a key-value store for primary transactional state.

### Prisma Standards
- Why: Prisma provides type-safe database access with maintainable schemas.
- Standard: Keep Prisma schema aligned with domain models. Use Prisma migrations for every schema change.
- Example: Define relations and enums in `schema.prisma` and generate clients consistently.
- Never: Perform ad hoc raw SQL for core domain persistence unless necessary and audited.

### Migration Policy
- Why: Consistent migrations prevent drift and deployment failures.
- Standard: All schema changes must be applied via versioned migrations and tested in staging before production.
- Example: Add migration files for every change and run them in CI.
- Never: Modify production schema manually or bypass migration tooling.

### Transactions
- Why: Transactions preserve data integrity across multiple writes.
- Standard: Use database transactions for multi-step flows such as payments, ride completion, and wallet updates.
- Example: Deduct guest wallet balance and credit host wallet in a single transaction.
- Never: Update related financial or ride state across separate non-atomic operations.

### Soft Delete Policy
- Why: Soft deletes preserve auditability while removing data from active workflows.
- Standard: Use explicit soft delete fields like `deletedAt` for entities that require retention.
- Example: Soft delete support tickets or historical ride records when necessary.
- Never: Use soft delete as a substitute for proper data lifecycle management.

### Indexing
- Why: Proper indexes keep queries performant at scale.
- Standard: Index foreign keys, lookup columns, and high-cardinality filter fields used in matching and reporting.
- Example: Index `userId`, `status`, `createdAt`, and route-related lookup fields.
- Never: Add indexes without verifying query patterns and maintenance cost.

### Foreign Keys
- Why: Foreign keys enforce referential integrity.
- Standard: Use foreign keys for all relational links that must remain consistent.
- Example: `ride.userId` should reference `users.id`.
- Never: Omit foreign keys for core transactional relations.

### Constraints
- Why: Constraints are guardrails at the data layer.
- Standard: Use `UNIQUE`, `NOT NULL`, `CHECK`, and enum constraints to enforce valid values.
- Example: Enforce valid ride statuses and subscription states in the schema.
- Never: Rely solely on application logic for basic data invariants.

### Versioning
- Why: Schema versioning supports auditability and rollback.
- Standard: Track migration versions and database schema state in source control.
- Example: Maintain a migration history table and versioned migration files.
- Never: Deploy database changes without version tracking.

### Audit Tables
- Why: Audits capture who changed what and why.
- Standard: Use audit tables or event logs for critical entities such as users, rides, payments, and support actions.
- Example: Log admin actions and ride status changes with timestamps and actor IDs.
- Never: Rely on application logs alone for audit evidence.

### Backup Policy
- Why: Backups are essential for recovery from data loss or corruption.
- Standard: Schedule automated backups with retention, test restores regularly, and secure backups.
- Example: Daily backups with 30-day retention and periodic restore drills.
- Never: Assume backups are valid without testing restores.

---

## PART 6 — API Standards

### REST Conventions
- Why: Consistent APIs are easier to consume and maintain.
- Standard: Use resource-based endpoints, plural nouns, and HTTP verbs.
- Example: `GET /api/rides`, `POST /api/auth/login`, `PUT /api/subscriptions/:id`.
- Never: Use RPC-style endpoints for core domain actions except where explicitly justified.

### HTTP Status Usage
- Why: Proper status codes communicate success and failure clearly.
- Standard: Use `200` for success, `201` for created, `204` for no content, `400` for validation errors, `401` for authentication failure, `403` for authorization failure, `404` for missing resources, `409` for conflict, `429` for rate limiting, and `500` for server errors.
- Never: Return `200` for errors or use vague status codes.

### Error Response Format
- Why: Consistent error responses simplify client handling.
- Standard: Return JSON errors with `code`, `message`, and optionally `details`.
- Example: `{ "error": { "code": "VALIDATION_ERROR", "message": "Email is required", "details": [...] } }`
- Never: Return HTML error pages or inconsistent structures.

### Pagination
- Why: Pagination keeps list endpoints scalable.
- Standard: Use cursor or page-based pagination with clear metadata.
- Example: `GET /api/rides?page=1&limit=20` or `cursor=...&limit=20`.
- Never: Return unbounded lists of production data.

### Filtering
- Why: Filtering enables efficient data retrieval.
- Standard: Accept explicit filter parameters and validate them.
- Example: `GET /api/admin/users?status=verified&role=guest`.
- Never: Allow arbitrary query injection or unsupported filter fields.

### Sorting
- Why: Sorting supports deterministic results.
- Standard: Support explicit sort fields and directions with validation.
- Example: `GET /api/notifications?sort=createdAt:desc`.
- Never: Allow clients to sort by arbitrary unsupported expressions.

### Validation
- Why: Validation prevents bad data and security issues.
- Standard: Validate all API inputs against typed schemas before business logic.
- Example: Use request DTOs and schema validators for every endpoint.
- Never: Trust client payloads or only validate after persistence.

### Versioning
- Why: API versioning protects consumers from breaking changes.
- Standard: Use path or header versioning for major API changes.
- Example: `/api/v1/...` for production stable APIs.
- Never: Make breaking changes to public endpoints without versioning.

### Idempotency
- Why: Idempotency prevents duplicate side effects in retries.
- Standard: Support idempotency for payment, checkout, subscription activation, and critical state-changing operations.
- Example: `Idempotency-Key` header for `POST /api/payments/create-order`.
- Never: Allow duplicate financial or ride creation on retry.

### Rate Limiting
- Why: Rate limiting protects the platform from abuse and overload.
- Standard: Apply authenticated and unauthenticated rate limits to sensitive endpoints.
- Example: Limit login, OTP, payment, and support endpoints.
- Never: Leave high-volume endpoints unthrottled.

### API Documentation Standards
- Why: Documentation is essential for reliable integrations.
- Standard: Document APIs with OpenAPI/Swagger or equivalent and keep it in source control.
- Example: Publish API docs for internal and external use.
- Never: Ship undocumented API behavior.

---

## PART 7 — Authentication & Authorization

### JWT
- Why: JWTs provide scalable stateless authentication.
- Standard: Use signed JWT access tokens for authenticated API access and verify them on every request.
- Example: Store access tokens securely on client side and send `Authorization: Bearer <token>`.
- Never: Accept unsigned or hard-coded JWTs.

### Refresh Tokens
- Why: Refresh tokens enable longer sessions without permanent access tokens.
- Standard: Issue refresh tokens separately, validate them securely, and rotate them on use if possible.
- Example: Use secure refresh token storage on the client and backend refresh endpoint.
- Never: Store refresh tokens in plaintext logs or use them as access tokens.

### Session Management
- Why: Session lifecycle matters for security and user experience.
- Standard: Implement session expiration, refresh workflows, and session invalidation on logout.
- Example: Invalidate sessions on password change or suspicious activity.
- Never: Keep sessions active indefinitely without renewal.

### RBAC
- Why: Role-based access controls enforce permission boundaries.
- Standard: Define roles for guests, hosts, support, operations, and admin. Enforce permissions in middleware and service logic.
- Example: Only admin roles may access `/api/admin/*` and pricing controls.
- Never: Grant admin-level access through client-side logic alone.

### Admin Permissions
- Why: Admin actions have elevated impact and require strict control.
- Standard: Require explicit admin authentication and role checks for all admin APIs.
- Example: Use `adminRole` claims and validate them at every admin endpoint.
- Never: Expose admin endpoints without authorization checks.

### Token Expiry
- Why: Expiry limits token misuse and improves security.
- Standard: Use short-lived access tokens and longer refresh tokens. Reject expired tokens explicitly.
- Example: `15m` access, `30d` refresh.
- Never: Use long-lived access tokens or ignore expiry.

### Password Handling
- Why: Secure passwords prevent account compromise.
- Standard: Hash passwords with a modern algorithm like bcrypt or Argon2, never store plaintext, and enforce strong password policies.
- Example: Use salted hashing and secure compare functions.
- Never: Store or transmit passwords in plaintext.

### OTP Handling
- Why: OTPs are a high-risk authentication vector.
- Standard: Limit OTP requests, enforce expiry, and store only hashed OTP values when possible.
- Example: Allow only a small number of OTP retries and timeout after expiration.
- Never: Accept OTP reuse or log OTP codes.

### Account Recovery
- Why: Recovery must balance usability with security.
- Standard: Use secure, auditable flows that verify identity without exposing accounts.
- Example: Recovery via verified email or phone with strong verification.
- Never: Reset passwords without user verification.

### Device/Session Management
- Why: Device awareness enhances security and incident response.
- Standard: Track active sessions or devices and allow users or administrators to revoke sessions.
- Example: Show active session history and expose logout from all devices.
- Never: Blindly trust indefinite sessions or ignore unusual login patterns.

---

## PART 8 — Security Constitution

### OWASP Top 10
- Classification: Mandatory
- Why: The platform must resist common web vulnerabilities.
- Standard: Protect against injection, broken auth, XSS, CSRF, broken access control, insecure deserialization, and more.
- Example: Validate and sanitize all inputs, enforce auth checks at every boundary.
- Never: Assume user input is safe.

### XSS
- Classification: Mandatory
- Why: Prevent malicious scripts from compromising users.
- Standard: Escape output, use safe templating, and avoid innerHTML on the web client.
- Example: Sanitize any user-generated content before rendering.
- Never: Render raw user input in the UI.

### CSRF
- Classification: Mandatory
- Why: Prevent unauthorized state-changing actions from other sites.
- Standard: Protect state-changing APIs with CSRF tokens or require auth headers.
- Example: Use `Authorization` headers for APIs and CSRF tokens for browser sessions.
- Never: Allow state changes from cross-origin forms without verification.

### SQL Injection
- Classification: Mandatory
- Why: SQL injection can expose or corrupt data.
- Standard: Use parameterized queries and ORM abstractions. Never build SQL from raw input.
- Example: Use Prisma query methods with typed parameters.
- Never: Concatenate user input into SQL strings.

### SSRF
- Classification: Recommended
- Why: SSRF can enable backend systems to make unauthorized internal requests.
- Standard: Validate outbound URLs and restrict internal IP ranges for proxy requests.
- Example: Allow only required external endpoints for services like payment gateways.
- Never: Fetch arbitrary URLs from user input.

### File Upload Security
- Classification: Mandatory
- Why: File uploads can contain malware or sensitive data.
- Standard: Validate file types and sizes, scan if possible, store uploads outside web root, and avoid executing uploaded content.
- Example: Store KYC uploads in secure storage, not in public web directories.
- Never: Trust file content or allow direct execution.

### Secret Management
- Classification: Mandatory
- Why: Secrets are the keys to the system.
- Standard: Store secrets in a secure vault or environment variables, never in source control.
- Example: Use managed secret storage for `DatabaseUrl`, `JWT_SECRET`, `RAZORPAY_KEY_SECRET`.
- Never: Commit secrets to Git.

### Environment Variables
- Classification: Mandatory
- Why: Environment-specific configuration must be isolated from code.
- Standard: Validate env vars at startup and fail loudly when required secrets are missing.
- Example: The app must refuse to start if production secrets are missing.
- Never: Default to insecure fallback secrets in production.

### Encryption in Transit
- Classification: Mandatory
- Why: Network traffic must be protected.
- Standard: Require TLS for all public and internal HTTP traffic.
- Example: Enforce HTTPS for frontend and backend communication.
- Never: Transmit sensitive data over plaintext HTTP.

### Encryption at Rest
- Classification: Recommended
- Why: Protected storage reduces risk from data breaches.
- Standard: Encrypt sensitive data at rest when possible, especially KYC documents and wallet data.
- Example: Use platform-managed encryption for database storage and file storage.
- Never: Store KYC or payment data unencrypted in backups or file stores.

### Secure Logging
- Classification: Mandatory
- Why: Logs should aid operations without leaking secrets.
- Standard: Log structured events, omit secrets and sensitive payloads.
- Example: Log request context and error codes, not full request bodies containing PII.
- Never: Log raw passwords, tokens, or KYC documents.

### Audit Logging
- Classification: Mandatory
- Why: Audits are required for security, compliance, and incident response.
- Standard: Record critical actions, especially admin changes, payment events, and support escalations.
- Example: Log who changed pricing and when.
- Never: Rely solely on ephemeral logs for audit evidence.

### Security Headers
- Classification: Recommended
- Why: Headers harden web clients against common attacks.
- Standard: Set `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` where applicable.
- Example: Use CSP to restrict allowed script origins.
- Never: Deploy browser-facing content without security headers.

### Rate Limiting
- Classification: Mandatory
- Why: Limits protect against abuse and denial-of-service.
- Standard: Rate-limit critical endpoints and login-related APIs.
- Example: Throttle login, OTP, support, and payment routes.
- Never: Leave sensitive APIs unprotected from high-volume abuse.

### Abuse Prevention
- Classification: Mandatory
- Why: Preventing misuse protects users and platform integrity.
- Standard: Monitor and act on suspicious behavior, repeated cancellations, and fraudulent account creation.
- Example: Block repeated OTP requests and suspicious ride patterns.
- Never: Ignore abuse signals or allow unchecked repeated activity.

---

## PART 9 — Privacy & DPDP Engineering Standards

### Privacy by Design
- Why: Privacy must be built into product behavior, not added later.
- Standard: Design every feature with minimal data collection and clear purpose.
- Example: Request location only for matching and never store unnecessary raw traces.
- Never: Collect broad personal data because it "might be useful".

### Data Minimization
- Why: Less data means less risk.
- Standard: Store only fields required for operations, safety, or compliance.
- Example: Only persist KYC documents, not unrelated user metadata.
- Never: Persist full raw client payloads as a convenience.

### Purpose Limitation
- Why: Data should be used only for the purpose it was collected.
- Standard: Restrict data usage to matching, payments, support, and safety.
- Example: Do not use ride history for unrelated marketing without explicit consent.
- Never: Reuse sensitive data for secondary purposes without user permission.

### Consent
- Why: Respect user autonomy and legal requirements.
- Standard: Obtain consent for data processing where required and log it for audits.
- Example: Ask for consent before using location or sending marketing messages.
- Never: Assume consent by default.

### User Rights
- Why: Users must have control over their personal data.
- Standard: Support access, correction, and deletion requests in accordance with policy.
- Example: Provide a way to delete account data while preserving legal retention requirements.
- Never: Block legitimate user data requests without justification.

### Data Classification
- Why: Different data types require different protections.
- Standard: Classify data as public, internal, sensitive, or restricted.
- Example: Treat KYC documents and payment details as restricted.
- Never: Handle all data with the same level of protection.

### Data Retention
- Why: Retention policies balance operational needs and privacy.
- Standard: Retain data only as long as necessary for active operations, audits, or legal requirements.
- Example: Archive historical ride data after it is no longer needed but keep audit logs for required retention periods.
- Never: Keep personal data indefinitely by default.

### Data Deletion
- Why: Deletion supports privacy and compliance.
- Standard: Implement deletion workflows that remove or anonymize personal data while preserving required logs.
- Example: Delete user profile data after account closure, while keeping audit references anonymized.
- Never: Leave deleted accounts with lingering sensitive data.

### Third-party Processing
- Why: Third-party systems increase privacy risk.
- Standard: Only share data with verified vendors for payment, notifications, or compliance, and limit the data shared.
- Example: Share only the minimum payment metadata required with Razorpay.
- Never: Expose KYC documents or full ride histories to third parties without clear need.

### KYC Privacy
- Why: KYC documents are highly sensitive.
- Standard: Encrypt and restrict access to KYC uploads, and log all access requests.
- Example: Store KYC files in secure, access-controlled storage.
- Never: Expose KYC content to unauthorized support staff or external systems.

### Location Privacy
- Why: Location is extremely sensitive personal data.
- Standard: Use location only for matching and ride operations. Do not retain live tracking data beyond operational need.
- Example: Discard detailed location history after the ride is completed unless required for incident investigation.
- Never: Use location data for unrelated profiling or advertising.

---

## PART 10 — Payment Engineering Standards

### Razorpay Integration
- Why: Payments must be secure and compliant.
- Standard: Use Razorpay’s official SDK and APIs for order creation, verification, and settlement.
- Example: Create payment orders server-side and verify callbacks using webhook signatures.
- Never: Trust client-side payment confirmation without server-side verification.

### Webhook Verification
- Why: Webhooks can be forged if not validated.
- Standard: Validate Razorpay webhook signatures on every incoming event.
- Example: Reject webhook events with invalid signatures and log them.
- Never: Process webhooks blindly.

### Transaction Ledger
- Why: A ledger is required for financial integrity.
- Standard: Record every payment, refund, wallet credit, and debit in an immutable ledger.
- Example: Store ledger entries with timestamps, actor IDs, and source references.
- Never: Adjust balances without a corresponding ledger entry.

### Refunds
- Why: Refunds must be controlled and auditable.
- Standard: Process refunds through a documented workflow and log approval decisions.
- Example: Refund only after incident verification and policy validation.
- Never: Issue manual refunds without accounting records.

### Idempotency
- Why: Prevent duplicate financial effects from retries.
- Standard: Use idempotency keys for payment creation and refund operations.
- Example: Reject duplicate requests with the same idempotency key or return the existing result.
- Never: Process duplicate payment requests as separate charges.

### Financial Reconciliation
- Why: Reconciliation detects mismatches and maintains trust.
- Standard: Reconcile wallets, payment receipts, refunds, and payouts regularly.
- Example: Compare ledger entries and payment gateway records daily.
- Never: Assume records are correct without periodic reconciliation.

### Double-payment Prevention
- Why: Double charges damage trust and accounting.
- Standard: Guard payment flows with uniqueness checks and transactional state.
- Example: Mark a subscription purchase as pending before charging and complete it once.
- Never: Process the same purchase twice due to race conditions.

### Wallet Consistency
- Why: Wallet balance integrity is crucial for user confidence.
- Standard: Update wallet balances in transactions and verify consistency against ledger entries.
- Example: Apply credits and debits atomically.
- Never: Show wallet balances that differ from ledger-backed state.

---

## PART 11 — KYC Standards

### Document Upload
- Why: Accurate KYC documents are required for host verification.
- Standard: Accept only approved file types and validate file size, format, and metadata.
- Example: Allow JPEG, PNG, PDF for identity documents within size limits.
- Never: Accept executable or malformed files.

### Storage
- Why: KYC documents must be protected at rest.
- Standard: Store documents in secure, access-controlled storage outside the public web root.
- Example: Use encrypted object storage with limited access policies.
- Never: Store KYC files in public file directories.

### Encryption
- Why: Encrypted storage prevents unauthorized disclosure.
- Standard: Encrypt sensitive files and database fields containing KYC references.
- Example: Use managed encryption keys for document storage.
- Never: Store KYC documents in plaintext backups.

### Verification Workflow
- Why: Verification is the gate to host activation.
- Standard: Implement an audited workflow for document submission, review, approval, and rejection.
- Example: Track verification status, reviewer ID, and timestamps.
- Never: Activate hosts without completed verification.

### Retention
- Why: Retention balances operational needs and privacy.
- Standard: Retain KYC documents only as long as required for compliance, audit, or active host status.
- Example: Remove or archive documents when a host account is closed.
- Never: Retain KYC files indefinitely without justification.

### Access Control
- Why: Access to KYC must be restricted.
- Standard: Only authorized personnel and systems may access KYC content.
- Example: Enforce role-based access for support and admin staff.
- Never: Allow broad access to sensitive documents.

### Deletion Policy
- Why: Deletion reduces risk after account closure.
- Standard: Remove or anonymize KYC documents when the user requests data deletion or the account is closed, subject to legal retention.
- Example: Delete KYC files and references while keeping audit records of deletion.
- Never: Retain KYC content without a policy.

---

## PART 12 — Coding Standards

### TypeScript Rules
- Why: Strong typing reduces runtime errors and improves maintainability.
- Standard: Use strict TypeScript settings, avoid `any`, and prefer explicit types.
- Example: Define domain interfaces and response DTOs clearly.
- Never: Use `any` as a shortcut in production code.

### React Rules
- Why: React UI must be predictable and performant.
- Standard: Use functional components, hooks, and typed props. Keep components focused and avoid state misuse.
- Example: Separate presentational and container logic.
- Never: Mix heavy business logic into UI components.

### Backend Rules
- Why: Backend code must be secure and testable.
- Standard: Use clear module boundaries, typed request/response models, and service orchestration.
- Example: Keep routing, validation, business logic, and persistence separate.
- Never: Put validation or persistence logic directly inside HTTP handlers.

### Naming Conventions
- Why: Names communicate intent.
- Standard: Use nouns for models, verbs for actions, and consistent suffixes like `Service`, `Controller`, `Repository`, `Dto`.
- Example: `verifyOtp`, `RideCreationDto`, `SubscriptionService`.
- Never: Use ambiguous names like `data`, `handler`, or `stuff`.

### Comments
- Why: Comments should explain why, not what.
- Standard: Use comments for intent, edge cases, and business rationale. Keep code self-explanatory.
- Example: Document why a particular validation exists.
- Never: Comment obvious code or leave stale comments.

### Documentation
- Why: Documentation supports maintainability and onboarding.
- Standard: Document architecture, APIs, and operational procedures in source-controlled markdown.
- Example: Maintain READMEs and architecture notes for modules.
- Never: Leave design decisions undocumented.

### Error Handling
- Why: Errors must be safe, informative, and recoverable.
- Standard: Handle expected errors explicitly and return structured error responses.
- Example: Distinguish validation errors from authorization failures.
- Never: Catch broad errors and hide failure causes.

### Logging
- Why: Logs are essential for debugging and operations.
- Standard: Log structured events with context, levels, and correlation IDs.
- Example: Include request IDs, user IDs, and operation outcomes.
- Never: Log sensitive payloads or use ad hoc console logs in production.

### Async Programming
- Why: Async flows must be predictable and robust.
- Standard: Use async/await consistently, handle rejected promises, and avoid unhandled promise rejections.
- Example: Await all asynchronous operations and catch errors.
- Never: Fire-and-forget critical async work without monitoring.

### Dependency Management
- Why: Dependencies are a long-term risk.
- Standard: Keep dependencies minimal, update intentionally, and audit for vulnerabilities.
- Example: Review package upgrades and remove unused packages.
- Never: Add dependencies without a clear need or security review.

---

## PART 13 — Git Standards

### Branch Naming
- Why: Clear branches improve collaboration.
- Standard: Use `feature/<short-descriptive-name>`, `bugfix/<short-descriptive-name>`, `hotfix/<short-descriptive-name>`, `release/<version>`.
- Never: Use personal or ambiguous branch names like `john-work`.

### Commit Conventions
- Why: Consistent commits support history and review.
- Standard: Use concise, descriptive commit messages. Prefer `feat:`, `fix:`, `refactor:`, `docs:`, `test:` prefixes.
- Example: `feat: add subscription renewal validation`.
- Never: Commit large unrelated changes in the same commit.

### Pull Requests
- Why: PRs are the primary collaboration interface.
- Standard: Open PRs with a clear summary, testing notes, and linked documentation. Keep changes focused.
- Example: Explain the problem, solution, and impact in PR description.
- Never: Merge PRs without review or context.

### Merge Policy
- Why: Controlled merges preserve branch quality.
- Standard: Require at least one review, passing CI, and updated documentation before merging.
- Example: Use protected branches for `main` and `release`.
- Never: Force-push or merge without meeting branch protections.

### Code Review Requirements
- Why: Reviews improve quality and catch issues early.
- Standard: Reviewers must verify correctness, architecture, tests, security, and documentation.
- Example: Check for business rule adherence and implementation consistency.
- Never: Approve code you did not understand or that bypasses standards.

### Release Tagging
- Why: Tags mark production-ready releases.
- Standard: Tag releases with semantic versions and release notes.
- Example: `v1.0.0`.
- Never: Deploy without recorded release tags.

---

## PART 14 — Testing Standards

### Unit Tests
- Why: Unit tests validate individual components and logic.
- Standard: Cover core business rules, validation, and edge cases.
- Example: Test ride matching eligibility and wallet operations.
- Never: Skip unit tests for new business logic.

### Integration Tests
- Why: Integration tests validate component interactions.
- Standard: Test API flows, database interactions, and external service integration.
- Example: Test subscription purchase and wallet settlement end-to-end.
- Never: Assume integration between modules works without verification.

### End-to-End Tests
- Why: E2E tests validate real user journeys.
- Standard: Automate key flows like signup, subscription, host matching, and ride completion.
- Example: Simulate a guest booking a commute and completing a ride.
- Never: Treat manual testing as a substitute for automation.

### Performance Tests
- Why: Performance tests catch regressions before production.
- Standard: Test critical APIs and ride matching under expected load.
- Example: Measure response time for match queries and wallet updates.
- Never: Ignore performance characteristics of production flows.

### Load Tests
- Why: Load tests ensure the platform scales.
- Standard: Run load tests for peak commute periods and service boundaries.
- Example: Simulate thousands of concurrent ride search requests.
- Never: Deploy without understanding load characteristics.

### Security Tests
- Why: Security tests find vulnerabilities early.
- Standard: Include dependency scanning, static analysis, and targeted security tests for auth and payment flows.
- Example: Run OWASP-focused tests on user-facing APIs.
- Never: Ship security-sensitive changes without security validation.

### Regression Tests
- Why: Regression tests protect existing behavior.
- Standard: Add tests for bugs fixed and keep regression coverage for critical flows.
- Example: Cover a previously broken refund or ride cancellation flow.
- Never: Remove regression tests for fixed issues.

### Minimum Testing Expectations
- Why: Every production feature must be verifiable.
- Standard: Feature changes require unit tests, integration tests for affected flows, and documentation of test coverage.
- Example: A new ride matching rule must include unit and integration tests.
- Never: Release without defined test coverage for the feature.

---

## PART 15 — DevOps Standards

### Development
- Why: Development environments must reproduce production behavior safely.
- Standard: Maintain local development setup, environment configs, and sample data for engineering.
- Example: Use a local database and environment variables matching staging settings.
- Never: Rely on production data in developer environments.

### Staging
- Why: Staging validates changes before production.
- Standard: Staging must mirror production as closely as possible.
- Example: Use similar infrastructure, data shape, and integrations.
- Never: Treat staging as optional or lower fidelity.

### Production
- Why: Production must be stable, secure, and monitored.
- Standard: Only deploy tested changes, use automated pipelines, and enforce rollback plans.
- Example: Deploy via CI/CD with health checks and canary rollout if available.
- Never: Deploy directly from local machines without pipeline verification.

### Environment Variables
- Why: Environment-specific secrets must be managed securely.
- Standard: Use separate env vars for dev, staging, and production and validate them at startup.
- Example: Store secrets in a vault or secure environment manager.
- Never: Mix production secrets into lower environments.

### CI/CD
- Why: Automated pipelines reduce manual risk.
- Standard: Every merge to protected branches triggers CI that runs tests, linting, and security scans.
- Example: Deploy to staging automatically after merge and require manual approval for production.
- Never: Use manual ad hoc deployments for production.

### Health Checks
- Why: Health checks enable monitoring and automated recovery.
- Standard: Expose application health endpoints and probe dependencies.
- Example: `GET /health` verifies database, payment gateway, and message queue connectivity.
- Never: Run services without health endpoints.

### Rollback
- Why: The ability to revert mitigates deployment risk.
- Standard: Maintain rollback procedures and test them periodically.
- Example: Roll back to the previous release if production health degrades.
- Never: Deploy without a rollback plan.

### Zero Downtime Deployment
- Why: Commuters depend on continuous availability.
- Standard: Deploy with strategies that avoid service interruption, such as blue/green or rolling updates.
- Example: Deploy new versions behind load balancers and verify health before cutting over.
- Never: Schedule or accept downtime for routine releases.

---

## PART 16 — Monitoring Standards

### Structured Logging
- Why: Structured logs make troubleshooting faster.
- Standard: Log JSON-like structured events with timestamps, correlation IDs, levels, and context.
- Example: Include `requestId`, `userId`, `route`, and `outcome` in logs.
- Never: Use unstructured free-text logs for production analysis.

### Metrics
- Why: Metrics track system health and product behavior.
- Standard: Emit metrics for API latency, errors, throughput, ride lifecycle events, wallet operations, and security events.
- Example: Track match rate, ride completion rate, and payment success rate.
- Never: Rely solely on logs for operational insight.

### Tracing
- Why: Distributed tracing reveals performance bottlenecks.
- Standard: Instrument request flows across services and important background jobs.
- Example: Trace ride creation through matching, payment, and notification flows.
- Never: Leave complex flows untraced in production.

### Alerting
- Why: Alerts enable fast incident response.
- Standard: Alert on high error rates, slow responses, failed health checks, and critical business metrics.
- Example: Alert when ride completion rate drops or payment verification fails.
- Never: Configure alerts only for infrastructure without business context.

### Crash Reporting
- Why: Crash reports capture unexpected failures.
- Standard: Integrate crash reporting for backend exceptions and unhandled rejections.
- Example: Capture stack traces and deployment metadata for fatal errors.
- Never: Ignore crashes or rely on logs alone.

### Performance Monitoring
- Why: Performance impacts user experience and costs.
- Standard: Monitor latency, throughput, database query performance, and resource utilization.
- Example: Track the 95th percentile latency of ride search APIs.
- Never: Accept performance regressions without investigation.

### Error Budgets
- Why: Error budgets balance reliability and innovation.
- Standard: Define acceptable failure thresholds and use them to guide release decisions.
- Example: Pause new feature rollout when error budget exhaustion is detected.
- Never: Keep shipping when the platform is degrading beyond acceptable levels.

---

## PART 17 — Performance Standards

### API Latency
- Why: Fast APIs improve user experience.
- Standard: Target sub-200ms median latency for core ride and auth APIs, and sub-500ms for most endpoints.
- Example: Measure and optimize `/api/rides` and `/api/auth/me`.
- Never: Accept a sudden latency increase without alerting.

### Database Queries
- Why: Efficient queries keep the platform responsive.
- Standard: Keep queries indexed and avoid N+1 patterns or unbounded scans.
- Example: Use paginated queries and only select required columns.
- Never: Query entire tables in production endpoints.

### Bundle Size
- Why: Smaller bundles improve frontend load time.
- Standard: Optimize frontend bundles and avoid shipping unnecessary libraries.
- Example: Tree-shake dependencies and split code by route.
- Never: Add large libraries without justification.

### Memory Usage
- Why: Bound memory usage for stability.
- Standard: Monitor memory consumption and prevent unbounded growth in services.
- Example: Avoid loading large datasets into memory on request.
- Never: Keep large in-memory caches without eviction.

### Response Time
- Why: Predictable response times keep users engaged.
- Standard: Define service-level response budgets and monitor percentile metrics.
- Example: Keep 95th percentile API response under budget.
- Never: Allow response times to degrade silently.

### Caching
- Why: Cache improves speed while reducing load.
- Standard: Use cache for read-heavy data and configure invalidation explicitly.
- Example: Cache branding settings and frequently read feature flags.
- Never: Cache critical authorization or financial state without immediate invalidation.

### Realtime Updates
- Why: Real-time status must be timely and accurate.
- Standard: Use WebSockets for status push, but persist state in the backend.
- Example: Emit ride progress updates while storing status changes in the database.
- Never: Treat real-time streams as the only truth.

---

## PART 18 — AI Engineering Policy

### AI must never invent business rules.
- Why: Business rules are defined in approved product documents.
- Business impact: Invented behavior can break product consistency and trust.
- Engineering impact: AI-assisted changes must align to documented rules.
- Security impact: Unsanctioned logic can create vulnerabilities.
- Correct implementation: Use AI to summarize existing rules or draft code that references approved product documents.
- Must never do: Add a new ride lifecycle rule or pricing logic without product approval.

### AI must never delete production code without verification.
- Why: Code deletions can remove critical behavior or introduce regressions.
- Business impact: Lost functionality can damage the product.
- Engineering impact: Every removal must be reviewed and justified.
- Security impact: Deleting security checks by accident can create vulnerabilities.
- Correct implementation: Propose refactors and document them before deleting code.
- Must never do: Remove code without a human validated replacement.

### AI must never bypass authentication.
- Why: Authentication is the first line of defense.
- Business impact: Bypassed auth undermines user trust and platform safety.
- Engineering impact: Authentication flows must remain enforced in every service.
- Security impact: Bypassed auth exposes sensitive data and actions.
- Correct implementation: Ensure AI-generated code continues to validate JWTs and roles on all protected endpoints.
- Must never do: Implement APIs or flows that skip auth checks.

### AI must never disable security checks.
- Why: Security checks protect the product from attack.
- Business impact: Disabled checks increase risk of breach and noncompliance.
- Engineering impact: Safeguards must remain intact.
- Security impact: Disabling checks can create exploitable paths.
- Correct implementation: Keep checks, and if a check is modified, document the rationale clearly.
- Must never do: Remove validation, authorization, logging, or rate limiting without explicit review.

### AI must always inspect existing code before modifying it.
- Why: Understanding current behavior is essential for safe changes.
- Business impact: Blind changes can introduce regressions or conflict with existing design.
- Engineering impact: Reviewing code reduces the chance of breaking contracts.
- Security impact: Ensures AI does not bypass established security patterns.
- Correct implementation: Read the relevant module and adjacent code before suggesting edits.
- Must never do: Make changes based on assumptions alone.

### AI must avoid duplicate implementations.
- Why: Duplication increases maintenance overhead and inconsistency.
- Business impact: Duplicate code leads to divergent behavior over time.
- Engineering impact: Reuse existing services and utilities.
- Security impact: Duplicate logic can create inconsistent security enforcement.
- Correct implementation: Reuse shared modules or refactor common functionality into one place.
- Must never do: Implement the same business rule in multiple places independently.

### AI must preserve backward compatibility where possible.
- Why: Compatibility protects existing integrations and users.
- Business impact: Breaking compatible behavior can disrupt customers and internal clients.
- Engineering impact: Changes should be additive or versioned.
- Security impact: Backward compatibility helps avoid emergency rollback.
- Correct implementation: Add versioned APIs and preserve old contracts when needed.
- Must never do: Replace existing behavior with breaking changes without versioning.

### AI must document architectural changes.
- Why: Architecture documentation is essential for future maintenance.
- Business impact: Undocumented changes hinder engineering coordination.
- Engineering impact: Documented changes make reviews and audits possible.
- Security impact: Architecture notes clarify security implications.
- Correct implementation: Update architecture or design docs when AI proposes a structural change.
- Must never do: Change architecture without adding or updating documentation.

### AI-generated code must be reviewed before merge.
- Why: Human review ensures quality and correctness.
- Business impact: Review prevents flawed code from reaching production.
- Engineering impact: Every AI-assisted change must pass standard PR review.
- Security impact: Human reviewers validate security implications.
- Correct implementation: Treat AI output as a draft requiring full review.
- Must never do: Merge AI-generated code without human approval.

---

## PART 19 — Engineering Decision Records (ADR)

### When ADRs are required
- Significant architectural changes
- New service or domain boundaries
- Major infrastructure decisions
- Security or compliance design choices
- Changes to core data or API contracts

### Format
- Why: Consistent ADRs capture reasoning and decisions.
- Standard: Use a concise template with context, decision, alternatives, and consequences.
- Example sections: Title, Status, Context, Decision, Consequences, Notes.
- Never: Write ADRs as vague paragraphs.

### Review process
- Why: Review ensures decisions are sound and aligned.
- Standard: Share ADRs with relevant stakeholders and review in engineering or architecture forums.
- Example: Circulate ADR drafts before approval.
- Never: Make major decisions without peer review.

### Approval process
- Why: Approval formalizes responsibility.
- Standard: Obtain sign-off from engineering leadership and product when ADR affects product behavior.
- Example: Document approvals in the ADR header.
- Never: Treat ADRs as optional for major changes.

---

## PART 20 — Release Checklist

### Mandatory checklist before every release
- Security: Review security implications and verify no secrets or unsafe code are introduced.
- Testing: Ensure unit, integration, and regression tests pass.
- Documentation: Update relevant docs and release notes.
- Database migration verification: Validate migration scripts in staging.
- Rollback verification: Confirm rollback procedure is available.
- Monitoring verification: Ensure new metrics and alerts are in place.
- Performance verification: Validate no critical performance regressions.

---

## PART 21 — Production Readiness Checklist

Before any feature ships, verify:
- Functional completeness: The feature works end-to-end as specified.
- Security review: Sensitive paths are assessed and protected.
- Privacy review: Personal data collection and usage are justified.
- Performance review: Critical flows meet performance criteria.
- Accessibility review: UI components are accessible where applicable.
- Logging: Sufficient logs exist for troubleshooting.
- Monitoring: Metrics and alerts cover the feature.
- Documentation: User-facing and engineering docs are updated.
- Testing: Required automated tests cover the feature.

---

## PART 22 — Non-Negotiable Engineering Rules

- Never trust frontend calculations.
- Never expose secrets.
- Never bypass payment verification.
- Never expose KYC documents.
- Never disable audit logging.
- Never skip authorization.
- Never merge unreviewed critical code.
- Never deploy directly to production without CI/CD.
- Never collect unnecessary user data.
- Never ignore failing tests.
- Never deploy without a rollback plan.
- Never accept production changes without observability.
- Never let security checks be optional.
- Never compromise privacy for convenience.
- Never make business decisions in code without documented approval.

---

This constitution is the permanent engineering handbook for MoveBuddy. It governs how the platform is built, operated, and evolved for the next decade.