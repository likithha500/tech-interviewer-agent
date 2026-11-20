
# Tech Interviewer Agent

### AI-Powered Technical Interview & Recruitment Assessment Platform

Tech Interviewer Agent is a full-stack, AI-assisted technical assessment platform designed for entry-level Software Development Engineer (SDE) recruitment.

It brings together structured technical interviews, coding assessments, AI-powered answer evaluation, evidence-based scorecards, human hiring decisions, and Applicant Tracking System (ATS) reporting.

The goal is to reduce repetitive evaluation work, support consistent technical assessments, and help interviewers make informed hiring decisions while keeping humans in control.

---

## Key Features

### 1. Authentication & Admin Dashboard
- Supabase-based user authentication.
- Admin dashboard for managing the recruitment workflow.
- Candidate management and interview progress tracking.
- Centralized access to reports and evaluation results.

### 2. Candidate Management
- Manage candidate profiles and application information.
- Create and track candidate interviews.
- Store candidate and interview records in Supabase PostgreSQL.
- Access completed interview reports.

### 3. Question Bank
- Technical questions covering:
  - Data Structures and Algorithms (DSA)
  - Database Management Systems (DBMS)
  - Operating Systems
  - Computer Networks
  - Object-Oriented Programming
- Questions organized by technical topic and difficulty.
- Supports a structured approach to technical assessment.
- Common question sets and evaluation rubrics are intended to improve consistency across candidates applying for the same role.

### 4. Technical Interviews
- Candidate-facing technical assessment interface.
- Written responses to technical questions.
- DSA and core computer science assessments.
- Coding challenges with an integrated code editor.
- Interview status and completion tracking.

### 5. Coding Assessment
- Integrated code editor for programming challenges.
- Supported languages:
  - Python
  - JavaScript
  - Java
  - C++
- Docker-based code execution implementation.
- Output validation against predefined test cases.
- Resource restrictions and isolated execution environment.

**Note:** The local Docker-based code runner requires a compatible Docker execution environment. Running the web application inside Docker does not automatically make the host Docker daemon available to the code runner.

### 6. AI-Powered Evaluation
- AI-assisted evaluation of written technical answers.
- Groq API integration.
- `openai/gpt-oss-20b` model.
- Rubric-based scoring and feedback.
- Overall and skill-wise assessment results.
- Strengths, weaknesses, and evaluation explanations.
- AI-generated hiring recommendations:
  - Hire
  - Hold
  - Reject

AI recommendations are advisory and do not automatically determine hiring outcomes.

### 7. Reports & Human Review
- Detailed candidate performance reports.
- Technical skill breakdowns.
- Evaluation feedback and recommendations.
- Human interviewer review.
- Final hiring decision recorded separately from the AI recommendation.

### 8. Applicant Tracking System Integration

The application includes an ATS integration architecture with three providers.

**Demo ATS**
- Simulated ATS integration without external credentials.
- Stores synchronized candidate scorecards in Supabase.
- Displays received candidate records in a dedicated dashboard.
- Tracks synchronization status.
- Supports scorecard inspection and duplicate prevention.

**Greenhouse**
- API integration adapter implemented.
- Requires authorized Greenhouse credentials and appropriate permissions.
- Live third-party synchronization has not been verified.

**Lever**
- API integration adapter implemented.
- Requires an authorized Lever organization account and API access.
- Live third-party synchronization has not been verified.

Demo ATS is a simulation and must not be presented as a live connection to Greenhouse or Lever.

---

## Technology Stack

| Component | Technology |
|---|---|
| Full-stack framework | Next.js |
| Frontend | React, TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| AI evaluation | Groq API |
| AI model | GPT-OSS-20B |
| Code editor | Monaco Editor |
| Code execution | Docker |
| ATS integration | Demo ATS, Greenhouse and Lever adapters |
| Version control | Git and GitHub |

---

## Application Modules

The administrator interface contains six primary sections:

1. **Dashboard** — Recruitment activity and interview overview.
2. **Candidates** — Candidate profiles and application records.
3. **Interviews** — Technical interview management and tracking.
4. **Question Bank** — Technical assessment questions.
5. **Reports & Review** — AI scorecards and human hiring decisions.
6. **Demo ATS** — Simulated ATS records and synchronized scorecards.

---

## System Architecture

```text
                   TECH INTERVIEWER AGENT
                            |
                            v
                Next.js + React Frontend
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
         Supabase       Interview      Admin Panel
       Authentication    Workflow
              |             |             |
              +-------------+-------------+
                            |
                            v
                   Next.js Server
                            |
            +---------------+---------------+
            |               |               |
            v               v               v
       Supabase DB       Groq API       Docker Runner
            |               |               |
       Candidates       AI Scoring      Code Execution
       Interviews       Feedback        Test Validation
       Reports          Recommendation
            |
            v
       Human Review
            |
            v
       Final Decision
            |
            v
        ATS Service
            |
      +-----+------+-----------+
      |            |           |
      v            v           v
   Demo ATS     Greenhouse    Lever
  (Supabase)     Adapter     Adapter
```

The diagram represents the application's components and intended data flow. Live external ATS connectivity and deployment-specific Docker execution require additional configuration.

---

## AI Evaluation Workflow

1. An administrator prepares technical assessment questions.
2. A candidate completes written and coding assessments.
3. The application stores the candidate's responses.
4. Coding submissions are checked against test cases when the code execution environment is available.
5. The Groq-powered evaluator grades written responses using structured criteria.
6. The application generates skill-wise scores and evaluation feedback.
7. The AI provides a Hire, Hold, or Reject recommendation.
8. A human interviewer reviews the evidence and records the final decision.
9. The finalized scorecard can be sent to the simulated Demo ATS.

---

## Fairness & Responsible AI

Tech Interviewer Agent is designed to support more consistent, evidence-based technical evaluation.

Key principles include:

- Using approved technical questions and structured scoring criteria.
- Evaluating technical responses rather than unrelated personal background.
- Keeping reference answers separate from the candidate interface.
- Providing interpretable evaluation feedback.
- Keeping the final hiring decision with a human reviewer.
- Distinguishing AI recommendations from human decisions.

**Important:** A shared question bank and scoring rubric can reduce inconsistency but do not guarantee an unbiased assessment. Full fairness validation, question-set enforcement, and independent evaluation audits remain important areas for further development.

---

## Getting Started

### Prerequisites

- Node.js and npm
- Supabase project
- Groq API key
- Docker Desktop (for local coding execution)
- Git

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd tech-interviewer-agent
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the actual repository URL.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root.

Configure the Supabase and Groq environment variables expected by the application.

Optional external ATS configuration may include:

```env
GREENHOUSE_API_KEY=
GREENHOUSE_ON_BEHALF_OF_USER_ID=
LEVER_API_KEY=
```

Use the exact Supabase and Groq variable names required by the existing application code.

**Never commit `.env.local`, API keys, or Supabase service-role credentials to GitHub.**

### 4. Configure Supabase

Set up the project's required database schema and authentication.

Apply the ATS migrations in order:

```text
supabase/migrations/20261120000000_create_ats_tables.sql
supabase/migrations/20261120000001_add_demo_ats.sql
```

Ensure that the Demo ATS migration uses secure admin-only Row Level Security policies matching the application's authorization model.

### 5. Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 6. Test Demo ATS

1. Log in as an authorized administrator.
2. Open a completed candidate interview report.
3. Review the AI evaluation.
4. Record a final human hiring decision.
5. Select **Demo ATS** in the ATS Integration section.
6. Click **Simulate Push to Demo ATS**.
7. Open the **Demo ATS** dashboard.
8. Verify the received candidate scorecard.

---

## Docker

The project includes Docker configuration for containerizing the Next.js application.

To build and start the web application:

```bash
docker compose --env-file .env.local up -d --build
```

With the current local Compose configuration, the web application is exposed at:

```text
http://localhost:3001
```

**Code runner limitation:** The existing coding runner invokes Docker from the Next.js server process. A separately containerized Next.js application does not automatically have access to the host Docker runtime. A dedicated, appropriately isolated runner service is recommended for a production deployment.

---

## ATS Database Tables

The ATS implementation uses the following Supabase tables:

| Table | Purpose |
|---|---|
| `ats_candidate_mappings` | Links internal candidates to ATS identifiers |
| `ats_sync_logs` | Records ATS synchronization attempts and results |
| `demo_ats_records` | Stores scorecards received by the simulated ATS |

The Demo ATS provider does not send candidate data to an external ATS service.

---

## Testing

The ATS integration implementation report recorded:

- **12/12 automated ATS tests passed**
- **0 TypeScript errors**

These are reported local test results, not proof of successful live Greenhouse or Lever API synchronization.

To run the ATS tests:

```bash
npx tsx --require ./tests/register-server-only.cjs tests/ats-integration.test.ts
```

To check TypeScript:

```bash
npx tsc --noEmit
```

---

## Current Limitations

- Live Greenhouse and Lever integrations require authorized credentials and provider permissions.
- Demo ATS synchronization is simulated.
- Docker-based code execution requires compatible runtime infrastructure.
- Fairness and rubric consistency require continued validation.
- Dynamic reasoning follow-up questions require further verification.
- Production readiness requires additional security testing and monitoring.

---

## Future Enhancements

- Adaptive follow-up questions based on candidate reasoning.
- Expanded question bank and standardized assessment templates.
- Improved fairness auditing and evaluation calibration.
- Dedicated sandboxed coding execution service.
- Live ATS synchronization with authorized Greenhouse and Lever accounts.
- Advanced recruitment analytics.
- Production deployment and operational monitoring.

---

## Hackathon Demonstration

The demonstration covers:

**Login → Dashboard → Question Bank → Candidate Assessment → AI Evaluation → Human Review → Demo ATS → Supabase Database**

The project demonstrates how AI can assist technical interviewing while preserving human accountability.

---

## Project Status

**Hackathon Prototype**

Core assessment, evaluation, reporting, and simulated ATS features have been implemented. Additional verification and production hardening are required before use in real hiring decisions.

---

## License

No license has been specified. See the repository for any future licensing information.
