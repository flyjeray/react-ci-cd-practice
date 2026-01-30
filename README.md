# React CI/CD Practice

A practice project implementing continuous integration and deployment pipelines with GitHub Actions.

> **Note:** This project was created as a learning exercise to explore CI/CD concepts with GitHub Actions. It demonstrates workflows, custom actions, and deployment strategies suitable for a small React application.

## 📋 Table of Contents

- [Overview](#overview)
- [CI/CD Architecture](#cicd-architecture)
- [Pull Request Workflow](#pull-request-workflow)
- [Deployment Pipeline](#deployment-pipeline)
- [Reusable Workflows & Custom Actions](#reusable-workflows--custom-actions)

## Overview

This is a React TypeScript application built to practice and demonstrate modern CI/CD patterns using GitHub Actions. The project showcases automated testing, code quality checks, parallel job execution, artifact sharing, and continuous deployment to GitHub Pages.

**Key Features:**

- Automated pull request validation with parallel checks
- Continuous deployment to GitHub Pages on merge
- Build artifact sharing across workflow jobs
- Reusable workflow components for notifications
- Custom composite action for Node.js setup
- Slack integration for build status notifications

## CI/CD Architecture

The project implements a complete CI/CD pipeline split across three workflows, each serving a specific purpose:

```
.github/
├── actions/
│   └── setup-node/              # Custom composite action
│       └── action.yaml          # Node.js setup with caching
└── workflows/
    ├── main.yml                 # Pull request validation
    ├── deploy.yaml              # Production deployment
    └── reusable-slack-notify.yml # Shared notification workflow
```

### Pipeline Overview

The CI/CD strategy separates concerns between validation (PR checks) and deployment (production releases), ensuring code quality before any changes reach production.

**Pull Request Flow:**

```
PR Created/Updated
    ↓
Build React App
    ↓
┌────────────┬──────────────┬──────────────┐
│  Lint      │  Type Check  │  Test        │ (Parallel)
│  (ESLint)  │  (TypeScript)│  (Jest)      │
└────────────┴──────────────┴──────────────┘
    ↓
Slack Notification (Success/Failure)
```

**Deployment Flow:**

```
Push to Main Branch
    ↓
Build Production Bundle
    ↓
Deploy to GitHub Pages
    ↓
Slack Notification (Success/Failure)
```

## Pull Request Workflow

**File:** `.github/workflows/main.yml`

**Trigger:** Every pull request targeting the `main` branch

The pull request workflow runs comprehensive quality checks before allowing code to be merged. It's designed to fail fast and provide quick feedback to developers.

### Workflow Features

**Concurrency Control:**

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

When a new commit is pushed to a PR, any in-progress workflow runs for that PR are automatically cancelled. This saves compute resources and provides faster feedback on the latest code.

**Job Execution Strategy:**

1. **Build job** runs first and creates a production build
2. Build artifacts are uploaded for reuse
3. **Lint, Type Check, and Test jobs** run in parallel (no dependencies between them)
4. Each parallel job downloads the build artifact
5. **Notification job** runs after all checks complete

### Job Details

#### Build

Compiles the React application and uploads the build output for subsequent jobs.

```yaml
- uses: ./.github/actions/setup-node # Custom action
  with:
    node-version: 18
- run: npm run build
- uses: actions/upload-artifact@v4
  with:
    name: react-build
    path: ./build
```

By building once and sharing the artifact, the workflow avoids redundant build steps in each validation job.

#### Lint & Formatting

Validates code quality and consistent formatting:

- **ESLint:** Checks for code quality issues and potential bugs
- **Prettier:** Ensures consistent code formatting across the codebase

```bash
npm run lint         # ESLint validation
npm run style-check  # Prettier formatting check
```

#### Type Checking

Runs TypeScript compiler in type-check mode without emitting files:

```bash
npm run typecheck  # tsc --noEmit
```

This catches type errors that could lead to runtime bugs.

#### Jest Testing

Executes the full test suite with coverage reporting:

```bash
npm test  # jest --coverage
```

Tests ensure components behave correctly and prevent regressions.

#### Slack Notification

Sends a summary notification to Slack after all checks complete, whether they succeed or fail. Uses the reusable notification workflow (see below).

## Deployment Pipeline

**File:** `.github/workflows/deploy.yaml`

**Trigger:** Every push to the `main` branch

The deployment workflow handles production releases, building and deploying the application to GitHub Pages.

### Build and Deploy Job

1. **Checkout code** from the main branch
2. **Setup Node.js** with dependency caching
3. **Build production bundle** with optimizations
4. **Deploy to GitHub Pages** using the `peaceiris/actions-gh-pages@v4` action

```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./build
```

The action automatically:

- Creates or updates the `gh-pages` branch
- Pushes the build directory contents
- Configures GitHub Pages if not already set up

### Deployment URL

The application is automatically deployed to: https://flyjeray.github.io/react-ci-cd-practice

## Reusable Workflows & Custom Actions

### Reusable Slack Notification Workflow

**File:** `.github/workflows/reusable-slack-notify.yml`

A workflow designed to be called by other workflows.

**Usage example:**

```yaml
jobs:
  notify:
    uses: ./.github/workflows/reusable-slack-notify.yml
    with:
      status: ${{ (contains(needs.*.result, 'failure') && 'failure') || 'success' }}
      title: "Pull Request ${{ (contains(needs.*.result, 'failure') && 'Failed') || 'Passed' }}"
      message: "PR #${{ github.event.pull_request.number }} checks have finished."
    secrets:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**Inputs:**

- `status`: Determines notification color (success = green, failure = red)
- `title`: Bold header text in Slack message
- `message`: Body text with details and links

**Implementation:**

Uses the `rtCamp/action-slack-notify@v2` action with conditional formatting based on status. Messages include:

- GitHub icon and branding
- Clickable links to workflow runs
- Color-coded status indicators
- Context about what triggered the notification

### Custom Composite Action: `setup-node`

**File:** `.github/actions/setup-node/action.yaml`

A composite action that encapsulates the common Node.js setup pattern used across all workflows.

**What it does:**

1. **Installs Node.js** using the specified version
2. **Restores npm cache** using a hash of `package-lock.json`
3. **Installs dependencies** with `npm ci --prefer-offline`

**Benefits:**

- **DRY principle:** Setup logic defined once, used everywhere
- **Consistent caching:** Same cache strategy across all workflows
- **Maintainability:** Changes to setup process only need to be made in one place
- **Performance:** Dependency caching significantly speeds up workflow runs

**Usage:**

```yaml
- uses: ./.github/actions/setup-node
  with:
    node-version: 18
```
