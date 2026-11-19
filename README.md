
# Tech Interviewer Agent

### AI-Powered Technical Assessment and Interview Evaluation Platform

Tech Interviewer Agent is a full-stack, AI-assisted technical interview platform designed to evaluate candidates applying for fresher Software Development Engineer (SDE) roles.

The platform combines structured technical assessments, automated code execution, AI-powered rubric evaluation, skill-wise scorecards, and human hiring decisions.

It supports DSA, DBMS, Operating Systems, Computer Networks, Object-Oriented Programming, and practical coding assessments.

The goal is to make technical interviews more consistent, evidence-based, efficient, and fair while ensuring that final hiring decisions remain with human interviewers.

---

## 1. Key Features

### Candidate Management
- Candidate profile creation and management.
- Interview assignment and tracking.
- Candidate interview status monitoring.
- Supabase-backed candidate records.

### Technical Assessment
- DSA questions across different difficulty levels.
- DBMS and Core Computer Science questions.
- Coding challenges with predefined test cases.
- Structured interview workflow.
- Question bank management.

### Multi-Language Code Execution
Supports four programming languages:

- Python
- JavaScript
- Java
- C++

Candidate code is executed using isolated Docker containers with resource restrictions.

### AI-Powered Evaluation
- Groq-powered written-answer evaluation.
- Rubric-based scoring.
- Skill-wise performance analysis.
- Strengths and weaknesses.
- Evidence-based feedback.
- AI-generated hiring recommendations.

### Interview Reports
- Overall candidate score.
- Individual skill scores.
- Candidate performance breakdown.
- AI recommendation: Hire, Hold, or Reject.
- Detailed evaluation feedback.

### Human Review
- Human interviewers review AI-generated scorecards.
- Final Hire, Hold, or Reject decision.
- Human decisions remain authoritative.
- AI recommendations are advisory only.

### Admin Dashboard
- Real candidate information from Supabase.
- Interview status overview.
- Evaluation and report management.
- Human review controls.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| AI Evaluation | Groq API |
| AI Model | openai/gpt-oss-20b |
| Code Editor | Monaco Editor |
| Code Execution | Docker |
| Containerization | Docker and Docker Compose |
| Development Environment | Antigravity IDE / VS Code |
| Version Control | Git and GitHub |

The project also contains SDK dependencies for additional AI providers, although Groq is used for the current written-answer evaluation flow.

---

## 3. System Architecture

```text
                  TECH INTERVIEWER AGENT
                           |
                           v
                   Next.js Frontend
                           |
              +------------+------------+
              |                         |
              v                         v
       Candidate Interface       Admin Dashboard
              |                         |
              v                         v
       Interview Workflow       Reports and Review
              |                         |
              +------------+------------+
                           |
                           v
                    Next.js Backend
                           |
              +------------+------------+
              |            |            |
              v            v            v
           Supabase     Groq API    Code Runner
              |            |            |
              v            v            v
         Candidate      AI Rubric    Docker Sandbox
         Interview      Evaluation   Python / JS /
         Report Data                 Java / C++
              |            |
              +------+-----+
                     |
                     v
              Skill Scorecard
                     |
                     v
             AI Recommendation
                     |
                     v
             Human Final Review
```

The application uses Supabase for persistent data, Groq for written-answer evaluation, and Docker for isolated code execution.

---

## 4. Interview Workflow

The assessment follows a structured process.

### Step 1: Candidate Registration

A candidate profile is created and associated with an interview.

### Step 2: DSA Assessment

The candidate answers Data Structures and Algorithms questions.

Questions may vary by topic and difficulty.

### Step 3: Core Computer Science Assessment

The candidate answers conceptual questions covering topics such as:

- Database Management Systems
- Operating Systems
- Computer Networks
- Object-Oriented Programming

### Step 4: Coding Assessment

The candidate writes code using the Monaco Editor.

The code runner executes the submitted program against predefined test cases.

### Step 5: AI Evaluation

The evaluation service grades written answers using a rubric and combines the available assessment results.

### Step 6: Scorecard Generation

The system generates an interview report containing:

- Overall score
- Skill-wise performance
- Strengths
- Weaknesses
- Evaluation evidence
- AI hiring recommendation

### Step 7: Human Review

An authorized human reviewer examines the report and records the final hiring decision.

The AI does not make the final hiring decision.

---

## 5. Project Requirements

The project is based on the Tech Interviewer Agent technical assessment specification.

Its primary goals are:

1. Conduct structured technical assessments for fresher SDE roles.
2. Ask DSA and Core CS questions.
3. Execute coding programs and validate outputs.
4. Evaluate performance against a rubric.
5. Produce skill-wise scorecards.
6. Provide evidence for each rating.
7. Generate Hire, Hold, or Reject recommendations.
8. Maintain consistency across candidates.
9. Avoid bias based on candidate background.
10. Keep final hiring decisions with a human panel.

Dynamic reasoning follow-ups, fairness verification, and ATS connectivity require additional implementation or validation before being considered complete.

---

## 6. Prerequisites

Install the following software:

- Node.js 22 or another compatible Node.js version
- npm
- Git
- Docker Desktop
- A Supabase project
- A Groq API key

Docker Desktop should be running before testing coding submissions that require Docker execution.

---

## 7. Local Installation

### Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd tech-interviewer-agent
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the actual GitHub repository URL.

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GROQ_API_KEY=your_groq_api_key

GEMINI_API_KEY=your_gemini_api_key
```

The Gemini key is relevant only to features that still use Gemini. The current batch written-answer evaluation uses Groq.

Never commit `.env.local` or real API keys to GitHub.

### Start the Development Server

```bash
npm run dev
```

Open:

http://localhost:3000

---

## 8. Docker Deployment

The application includes Docker configuration for running the Next.js web service in a production-mode container.

### Build and Start

```bash
docker compose --env-file .env.local up -d --build
```

### Check Container Status

```bash
docker compose --env-file .env.local ps
```

### Access the Application

http://localhost:3001

### View Logs

```bash
docker compose --env-file .env.local logs --tail=100 web
```

### Stop Containers

```bash
docker compose --env-file .env.local down
```

### Important Deployment Limitation

The current Docker Compose configuration runs the Next.js application.

The existing code runner launches Docker containers through the Docker CLI available to the application process.

When Next.js itself runs inside Docker, it does not automatically have access to the host Docker daemon.

Therefore, coding execution inside the containerized deployment requires a separately configured execution service.

Do not expose the host Docker socket to the web application without carefully evaluating the security implications.

The current Docker deployment is local and does not provide a public hosting URL.

---

## 9. Code Execution and Sandbox Security

The code runner supports:

| Language | Runtime |
|---|---|
| Python | Python 3.12 |
| JavaScript | Node.js 22 |
| C++ | GCC 14 |
| Java | OpenJDK 17 |

Each test case runs in a Docker container with restrictions such as:

- Network access disabled.
- Memory limit of 128 MB.
- CPU limit of 0.5 CPUs.
- Process count limit.
- Read-only container filesystem.
- Restricted temporary filesystem.
- Linux capabilities dropped.
- No-new-privileges security option.
- Execution timeout of approximately 5 seconds.
- Output-size restrictions.
- Maximum of 10 test cases per submission.

These controls reduce risk but do not guarantee complete isolation against malicious code.

A production deployment should use a dedicated execution service with additional isolation and operational controls.

---

## 10. AI Evaluation System

The application uses Groq to evaluate written technical answers.

### Evaluation Process

1. Load the candidate's submitted answers.
2. Load the associated questions and rubric information.
3. Submit the written answers for batch evaluation.
4. Receive structured evaluation results.
5. Combine written-answer and coding assessment results.
6. Store evaluations and generate the final scorecard.

### Current Model

```text
openai/gpt-oss-20b
```

### Generated Outputs

- Rubric scores
- Skill-wise evaluation
- Strengths
- Weaknesses
- Evidence-based feedback
- Overall performance score
- Advisory hiring recommendation

AI evaluation should be reviewed by a human, especially when making employment-related decisions.

---

## 11. Reports and Human Hiring Decisions

The reporting system uses real interview data stored in Supabase.

A report can include:

- Candidate name and email
- Interview status
- Overall score
- Skill breakdown
- Evaluation evidence
- Strengths and weaknesses
- AI recommendation
- Human review status

The planned streamlined reporting interface consists of:

### Candidate Results

A simple overview showing candidate names, scores, and a View Report action.

### Detailed Candidate Report

A dedicated view showing the complete scorecard, evidence, AI recommendation, and human review controls.

The final hiring decision is made by an authorized human reviewer, not automatically by the AI model.

---

## 12. ATS Integration — Greenhouse and Lever

The project is being extended to support integration with Applicant Tracking Systems.

Target providers:

- Greenhouse Recruiting
- Lever

### Intended Functionality

- Link an internal candidate to an ATS candidate/application.
- Select the correct external candidate record.
- Push finalized interview results to the ATS.
- Include scores, evidence, and the final human decision.
- Track synchronization status and errors.
- Prevent duplicate submissions.

### Security Requirements

- Server-side API communication only.
- Secure API credentials.
- Authorized administrator access.
- Explicit confirmation before synchronization.
- No automatic rejection based solely on AI recommendations.

### Integration Status

Real Greenhouse and Lever API integration is planned or under development.

It must not be considered operational until the provider APIs have been configured and successful live synchronization has been verified.

Actual integration requires an ATS account, appropriate API access, and the necessary permissions.

---

## 13. Database

Supabase PostgreSQL is used to store application data.

Core data entities include:

| Entity | Purpose |
|---|---|
| candidates | Candidate profiles |
| interviews | Interview records and status |
| questions | Question bank and assessment metadata |
| evaluations | Per-question or per-skill evaluation results |
| reports | Overall scores and recommendations |

The application also uses Supabase Auth for authentication.

ATS integration may introduce additional tables for external candidate mappings and synchronization logs.

Database migrations and Row Level Security policies should be applied according to the application's actual schema.

---

## 14. Security and Fairness

The application is designed around the following principles:

### Human Oversight

AI recommendations are advisory. Final hiring decisions remain with human reviewers.

### Consistent Assessment

Candidates should be evaluated using consistent question selection rules and scoring rubrics.

### Fairness

Evaluation should focus on demonstrated technical ability rather than college, background, or unrelated personal characteristics.

### Answer Protection

Reference answers and private test cases should not be exposed to candidate-facing interfaces.

### Secret Management

API keys and privileged Supabase credentials must remain server-side.

### Sandboxed Execution

Candidate programs should run in isolated execution environments with resource restrictions.

These safeguards require testing and review before production use.

---

## 15. Testing Checklist

Before a final demonstration or production deployment, verify:

- [ ] Candidate creation works.
- [ ] Candidate authentication and access rules work.
- [ ] Interview questions load correctly.
- [ ] DSA questions follow the intended difficulty progression.
- [ ] Core CS questions are displayed correctly.
- [ ] Candidate answers are saved.
- [ ] Code execution passes and fails test cases correctly.
- [ ] Code execution works in the chosen deployment environment.
- [ ] AI evaluation completes successfully.
- [ ] Skill-wise scores are stored.
- [ ] Detailed reports display correct data.
- [ ] Human review updates persist.
- [ ] Candidate-facing APIs do not expose answers or hidden test cases.
- [ ] Assessment consistency and fairness are verified.
- [ ] Docker deployment starts successfully.
- [ ] ATS integration is tested with real provider credentials, if enabled.
- [ ] No API keys or sensitive environment files are committed.

---

## 16. Current Project Status

### Implemented and Previously Tested

- Supabase-backed candidate and interview data.
- Admin dashboard with real candidate information.
- Written-answer evaluation using Groq.
- AI-generated scorecards and recommendations.
- Human review functionality.
- Local Docker build and running Next.js container.

### In Progress or Requiring Verification

- Final UI improvements.
- Simplified Candidate Results page.
- Dedicated detailed report experience.
- Dockerized coding runner integration.
- Dynamic reasoning follow-up questions.
- Assessment fairness and answer-protection verification.
- Real Greenhouse and Lever ATS integration.
- Full end-to-end testing.
- Public deployment, if required.

---

## 17. Future Enhancements

Possible future improvements include:

- Adaptive follow-up questioning.
- Additional programming languages.
- Interview analytics.
- PDF or Excel report export.
- Real ATS synchronization.
- Interview scheduling.
- Automated interview notifications.
- Enhanced code execution isolation.
- Public cloud deployment.
- Additional fairness and audit tooling.

---

## 18. Project Purpose

This project demonstrates how AI can assist technical interviewers by automating repetitive assessment tasks while preserving human accountability.

It combines structured questions, executable coding assessments, AI evaluation, persistent reports, and human review into a single technical assessment platform.

The intended outcome is a more consistent and transparent interview process for entry-level software engineering candidates.

---

## 19. License

No license has been specified for this project.

Add a `LICENSE` file if you intend to make the repository available for reuse.

---

## 20. Disclaimer

Tech Interviewer Agent is a hackathon/prototype project.

AI-generated scores and recommendations may contain errors and should not be used as the sole basis for employment decisions.

Before production use, the system requires additional security, privacy, fairness, reliability, and operational testing.
