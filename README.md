# LazyDesk AI

LazyDesk AI is a local AI-powered digital file cleanup assistant built for the **Hacktoberfest 2026 Open-Source AI Challenge Week 3: Slow and Steady**.

The idea is simple:

> Your files are messy. Your weekend doesn't have to be.

LazyDesk takes a list of messy filenames and uses a local open-weight AI model to suggest cleaner filenames, practical folders, and a safe cleanup plan without touching the user's real files.

---

## Challenge Theme

This project was built for the Hacktoberfest 2026 theme:

**Slow and Steady**

The challenge asks participants to build something with open-source AI that rewards laziness by automating work people usually put off.

LazyDesk is built around that exact idea.

Instead of manually reviewing and organizing files like:

```text
invoice-final2.pdf
project-final-final-v3.docx
IMG_9988.jpg
meeting_notes_latest.txt
expense-receipt-copy.pdf
```

the user can paste them into LazyDesk and let local AI prepare the cleanup plan.

---

# The Problem

Many people have folders like:

```text
Downloads/
Desktop/
Documents/
```

filled with files such as:

```text
final.docx
final-final.docx
final-final-v2.docx
IMG_3488.jpg
invoice2.pdf
notes-new.txt
copy-of-contract.docx
```

Cleaning these files manually means deciding:

- what each file probably is
- what it should be called
- which folder it should belong in
- whether the current filename is already acceptable

That is exactly the kind of small task people keep postponing.

LazyDesk removes most of that decision-making.

---

# The Solution

The user provides:

- Workspace name
- Cleanup mode
- A list of filenames

For example:

```text
Workspace:
Work Downloads

Files:

invoice-ioc-oct.pdf
IMG_1234.jpg
Apex-agreement-final.docx
meeting_notes.txt
expense-receipt.pdf
project-final-final-v2.docx
```

Then the user clicks:

```text
Organize with AI
```

LazyDesk sends the filenames to a local Gemma model through Ollama.

The AI generates a cleanup plan containing:

- original filename
- suggested filename
- suggested folder
- explanation
- confidence level

---

# Example

## Input

```text
invoice-ioc-oct.pdf
Apex-agreement-final.docx
meeting_notes.txt
project-final-final-v2.docx
```

## Example AI Result

```json
{
  "summary": "Organized 4 files into practical folders.",
  "files": [
    {
      "original_name": "invoice-ioc-oct.pdf",
      "suggested_name": "ioc-October-Invoice.pdf",
      "folder": "Finance/Invoices",
      "reason": "The filename appears to describe an invoice for ioc.",
      "confidence": "high"
    },
    {
      "original_name": "Apex-agreement-final.docx",
      "suggested_name": "Apex-Agreement.docx",
      "folder": "Clients/Apex/Contracts",
      "reason": "The filename appears to be a client agreement document.",
      "confidence": "high"
    }
  ]
}
```

## Screenshots

### LazyDesk Workspace

![LazyDesk workspace](docs/screenshots/01-workspace.png)

### AI Cleanup Plan

![LazyDesk cleanup plan](docs/screenshots/02-cleanup-plan.png)

### Edit AI Suggestions

![LazyDesk edit suggestion](docs/screenshots/03-edit-suggestion.png)

### Cleanup History

![LazyDesk cleanup history](docs/screenshots/04-cleanup-history.png)

---

# Lazy Mode

One of the main features is:

**Lazy Mode**

When Lazy Mode is enabled, the user does not need to define folder categories first.

The idea is:

> You provide the mess. AI makes the decisions.

Gemma decides:

- cleaner filenames
- likely folder structure
- organization strategy

The user only needs to review the plan.

---

# Safe by Design

LazyDesk currently creates a **cleanup plan only**.

It does not automatically:

- move files
- rename real files
- delete files
- open file contents

This is intentional.

The AI suggests changes first, and the user stays in control.

The current flow is:

```text
Messy filenames
       ↓
Gemma suggestion
       ↓
Review
       ↓
Edit if needed
       ↓
Approve
       ↓
Save cleanup plan
```

---

# Editable AI Suggestions

AI suggestions are not treated as automatically correct.

Before approving a cleanup plan, the user can edit:

- Suggested filename
- Suggested folder

For example:

```text
AI Suggestion:
Projects/Reports

User changes it to:
Clients/Apex/Reports
```

When the plan is approved, the edited version is saved locally.

This keeps the AI useful without removing human control.

---

# Features

LazyDesk AI currently supports:

- Local AI-powered file organization
- Paste multiple filenames
- Lazy Mode
- Suggested cleaner filenames
- Suggested folder paths
- AI explanation for each suggestion
- Confidence indicators
- Editable AI recommendations
- Cleanup plan approval
- Persistent cleanup history
- Local JSON storage
- Reload saved plans after browser refresh
- Delete saved cleanup plans
- Export cleanup plan as JSON
- No database required
- No paid AI API required

---

# Tech Stack

## Frontend

- React
- Vite
- CSS

## Backend

- Node.js
- Express

## AI

- Ollama
- Gemma 3 1B

## Storage

- Local JSON files
- Node.js File System API

---

# Architecture

```text
User
 │
 │ Pastes messy filenames
 ▼
React Frontend
 │
 ▼
Node.js / Express
 │
 ▼
Ollama
 │
 ▼
Gemma 3 1B
 │
 ▼
Structured Cleanup Plan
 │
 ├── Suggested filename
 ├── Suggested folder
 ├── Reason
 └── Confidence
 │
 ▼
User Review / Edit
 │
 ▼
Approve
 │
 ▼
Local JSON Storage
```

---

# Project Structure

```text
lazydesk-ai/
│
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   │
│   ├── package.json
│   └── ...
│
├── server/
│   ├── data/
│   │   └── cleanup-plans.json
│   │
│   ├── index.js
│   └── package.json
│
├── README.md
├── .gitignore
└── LICENSE
```

---

# Local JSON Persistence

LazyDesk does not require MySQL, PostgreSQL, MongoDB, or another database.

Generated plans are saved in:

```text
server/data/cleanup-plans.json
```

Example:

```json
[
  {
    "id": "plan-id",
    "workspace_name": "Work Downloads",
    "mode": "lazy",
    "summary": "Organized 6 files into practical folders.",
    "status": "APPROVED",
    "files": [
      {
        "id": "file-id",
        "original_name": "invoice-ioc-oct.pdf",
        "suggested_name": "ioc-October-Invoice.pdf",
        "folder": "Finance/Invoices",
        "reason": "Appears to be an invoice for ioc.",
        "confidence": "high"
      }
    ],
    "created_at": "2026-10-22T00:00:00.000Z",
    "approved_at": "2026-10-22T00:05:00.000Z"
  }
]
```

Because the data is saved to disk, cleanup history remains available after refreshing the browser or restarting the frontend.

---

# How the AI Works

The frontend sends a request similar to:

```json
{
  "workspaceName": "Work Downloads",
  "mode": "lazy",
  "files": [
    "invoice-ioc-oct.pdf",
    "IMG_1234.jpg",
    "Apex-agreement-final.docx",
    "meeting_notes.txt"
  ]
}
```

The backend builds a prompt for Gemma.

The model is instructed to:

- never delete files
- never invent file contents
- preserve file extensions
- suggest professional filenames
- create practical folders
- avoid overly long filenames
- preserve recognizable client or project names
- return valid JSON only

---

# Structured AI Output

Gemma returns:

```json
{
  "summary": "",
  "files": [
    {
      "original_name": "",
      "suggested_name": "",
      "folder": "",
      "reason": "",
      "confidence": "high"
    }
  ]
}
```

Confidence must be:

```text
high
medium
low
```

Structured JSON makes the result easier to validate and display in the UI.

---

# API Endpoints

## Health Check

```http
GET /api/health
```

---

## Generate Cleanup Plan

```http
POST /api/generate-cleanup-plan
```

Example:

```json
{
  "workspaceName": "Work Downloads",
  "mode": "lazy",
  "files": ["invoice-ioc-oct.pdf", "IMG_1234.jpg", "Apex-agreement-final.docx"]
}
```

---

## Get Cleanup Plans

```http
GET /api/cleanup-plans
```

---

## Get One Cleanup Plan

```http
GET /api/cleanup-plans/:id
```

---

## Approve Cleanup Plan

```http
PATCH /api/cleanup-plans/:id/approve
```

The frontend can also send edited file suggestions before approval.

Example:

```json
{
  "files": [
    {
      "id": "file-id",
      "suggested_name": "Apex-HRMS-Agreement.docx",
      "folder": "Clients/Apex/Contracts"
    }
  ]
}
```

---

## Delete Cleanup Plan

```http
DELETE /api/cleanup-plans/:id
```

---

# Installation

## Requirements

Install:

- Node.js 18+
- npm
- Ollama

---

# Install Ollama

Download Ollama from:

```text
https://ollama.com
```

Verify:

```bash
ollama --version
```

---

# Install Gemma

LazyDesk currently uses:

```text
gemma3:1b
```

Download it:

```bash
ollama pull gemma3:1b
```

Check installed models:

```bash
ollama list
```

Test manually:

```bash
ollama run gemma3:1b
```

Exit with:

```text
/bye
```

---

# Run the Backend

From the project root:

```bash
cd server
npm install
npm run dev
```

Backend:

```text
http://localhost:5000
```

Test:

```text
http://localhost:5000/api/health
```

Expected:

```json
{
  "success": true,
  "message": "LazyDesk AI API is running"
}
```

---

# Run the Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Vite normally runs at:

```text
http://localhost:5173
```

---

# Test Data

Try:

```text
invoice-ioc-oct.pdf
IMG_1234.jpg
Apex-agreement-final.docx
meeting_notes.txt
expense-receipt.pdf
project-final-final-v2.docx
proposal_new_new_version3.docx
october-payroll-final.xlsx
```

Then click:

```text
Organize with AI
```

Review the suggestions, edit one of them manually, and approve the plan.

Refresh the browser and reopen the plan from Cleanup History to confirm that the approved version was persisted.

---

# Why Open Innovation Matters

Open innovation is particularly useful for LazyDesk because file organization often involves private or work-related information.

Even filenames can reveal sensitive context such as:

```text
client-contract-final.docx
salary-report-october.xlsx
invoice-customer-name.pdf
internal-meeting-notes.txt
```

Using Gemma locally through Ollama means the application does not need to send these filenames to a remote AI service for the core cleanup workflow.

---

## Privacy

The AI inference runs locally.

That means the filenames being organized can remain on the user's computer rather than being sent to a third-party AI API.

This is especially useful for:

- work documents
- client files
- financial files
- internal company files
- personal documents

---

## No Per-Request AI Cost

LazyDesk can be used repeatedly.

Someone might organize:

```text
Downloads
Desktop
Project folders
Client folders
Old archives
```

With a paid cloud AI API, every cleanup request can create additional usage costs.

With a locally installed model, there is no per-request AI provider charge for the core inference.

That makes the idea practical for a small utility people can use whenever their folders become messy.

---

## Offline-Friendly

Once Ollama and Gemma are installed, the AI inference can run locally without depending on a cloud AI API.

This means LazyDesk can continue creating cleanup plans even when internet access is unavailable.

---

## Model Flexibility

Because LazyDesk uses Ollama, the project is not permanently tied to one commercial model provider.

Other compatible open-weight models could be tested later for:

- better filename understanding
- faster inference
- lower memory usage
- better folder categorization
- larger context windows

---

# Why It Fits “Slow and Steady”

The challenge theme is about building something that rewards laziness.

LazyDesk is intentionally built around a task people often avoid:

**organizing digital clutter.**

Instead of:

```text
Open Downloads
↓
Look at 100 files
↓
Rename one
↓
Decide where it belongs
↓
Repeat
↓
Give up
```

LazyDesk changes the workflow to:

```text
Paste filenames
↓
Click Organize with AI
↓
Review the plan
↓
Approve
↓
Done
```

The AI does the boring decision-making.

The user gets to be lazy.

---

# What I Learned

Building LazyDesk helped me explore a different type of AI application.

Instead of generating content for the user, the AI is used to reduce repetitive decision-making.

I practiced:

- Running Gemma locally with Ollama
- Connecting React to local AI
- Creating structured prompts
- Validating AI-generated JSON
- Building persistent JSON storage
- Designing review and approval workflows
- Allowing users to edit AI suggestions
- Creating safer AI automation
- Designing an interface around minimal manual effort

One important lesson was that automation does not have to immediately perform destructive actions.

A safe AI tool can first create a recommendation, let the user review it, and only then move toward automation.

For LazyDesk, that means the current version creates a cleanup plan without touching the user's real files.

---

# Hacktoberfest 2026

LazyDesk AI was built for:

**Hacktoberfest 2026 Open-Source AI Challenge Week 3: Slow and Steady**

The challenge asks participants to build something using open-source AI that rewards laziness and automates a task people would rather not do manually.

LazyDesk tackles one of those tasks:

> cleaning up digital clutter.

---

# Current Status

The current MVP supports:

- Filename input
- Lazy Mode
- Local Gemma inference
- Cleanup plan generation
- Suggested filenames
- Suggested folder structures
- Reasons and confidence levels
- Editable AI suggestions
- Approval workflow
- Local JSON persistence
- Cleanup history
- Delete saved plans
- JSON export

---

# Future Improvements

Possible future improvements include:

- Read filenames directly from a selected folder
- Actual safe file renaming
- Actual folder creation
- Move files after explicit confirmation
- Undo support
- Duplicate detection using file hashes
- File content analysis
- PDF/document metadata analysis
- Batch folder processing
- Ignore rules
- User-defined folder preferences
- Scheduled cleanup
- Background organization
- Local embeddings
- Multiple AI model support

A future version could move from:

```text
Recommend
```

to:

```text
Recommend
→ Review
→ Execute
→ Undo
```

while keeping safety and user control at the center.

---

# License

MIT
