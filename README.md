<p align="center">
  <img
    src="frontend/public/Screenshot 2026-05-29 160612.png"
    alt="BNA Platform logo"
  >
</p>

<h1 align="center">
  BNA Platform - Intelligent Banking Investment Platform
</h1>

<p align="center">
  <strong>
    Web platform, business intelligence, conversational analytics and machine-learning forecasting for banking investments.
  </strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=20232A" alt="React 19">
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" alt="Node.js and Express">
  <img src="https://img.shields.io/badge/SQL_Server-Data_Warehouse-CC2927?logo=microsoftsqlserver&logoColor=white" alt="SQL Server Data Warehouse">
  <img src="https://img.shields.io/badge/Python-Machine_Learning-3776AB?logo=python&logoColor=white" alt="Python Machine Learning">
  <img src="https://img.shields.io/badge/Power_BI-Embedded_Report-F2C811?logo=powerbi&logoColor=20232A" alt="Power BI embedded report">
</p>



---
## Table of Contents

- [Project Overview](#project-overview)
- [Business Context and Problem Statement](#business-context-and-problem-statement)
- [Project Objectives](#project-objectives)
- [Main Features](#main-features)
- [System Architecture](#system-architecture)
- [Part I - BNA Web Platform](#part-i---bna-web-platform)
- [Part II - Business Intelligence](#part-ii---business-intelligence)
- [Part III - AI Chatbot and Machine Learning](#part-iii---ai-chatbot-and-machine-learning)
- [Technology Stack](#technology-stack)
- [Database Architecture](#database-architecture)
- [Data Flow and ETL Pipeline](#data-flow-and-etl-pipeline)
- [Security and Access Control](#security-and-access-control)
- [Installation and Configuration](#installation-and-configuration)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Screenshots and Demonstrations](#screenshots-and-demonstrations)
- [Testing and Validation](#testing-and-validation)
- [Current Limitations](#current-limitations)
- [Future Improvements](#future-improvements)
- [Contributors](#contributors)
- [License](#license) 
## Project Overview

BNA Platform is an intelligent solution for managing, monitoring and analyzing bank investments. It combines an operational web application, a decision-support layer based on a SQL Server Data Warehouse and Power BI, a conversational assistant, and a machine-learning forecasting module.

The repository contains the React frontend, the Node.js/Express API and the Python forecasting pipeline. The SSIS packages, Power BI report authoring files and SQL Server deployment scripts are not versioned in this repository their availability and configuration can be found in their respective repositories.

## Business Context and Problem Statement

Investment data is often distributed across operational systems, spreadsheets and reporting workbooks. This makes it difficult to maintain a consistent view of amounts, objectives, maturities, currencies and performance across branches and regional structures.

BNA Platform addresses this situation by providing:

- A centralized interface for authenticated users and administrators.
- A common operational API connected to SQL Server.
- A Data Warehouse-oriented view of placements and objectives.
- Embedded Power BI reporting for consolidated decision support.
- A chatbot that translates authorized natural-language questions into controlled analytical queries.
- A forecasting workflow for historical placement data.

The platform is intended for internal decision support. It must be deployed with appropriate database permissions, network controls and information-security policies before handling production banking data.

## Project Objectives

1. Centralize placement-related operational workflows.
2. Enforce role-based access to users, messages, forecasts and analytical data.
3. Improve visibility into investment amounts, objectives, currencies and maturity.
4. Reduce manual reporting and spreadsheet-based consolidation.
5. Provide controlled natural-language access to Data Warehouse indicators.
6. Compare forecasting models and expose their results to authorized users.
7. Establish a foundation for future integration between operational data, BI dashboards and predictive analytics.


## Main Features

| Area | Confirmed capabilities in this repository |
| --- | --- |
| Authentication | Login, JWT issuance, token verification, session refresh and logout |
| Account security | bcrypt password hashing, active/inactive status, mandatory first-login password change |
| User administration | Admin-only listing, filtering, creation, update and deletion workflows |
| Organizational scope | Agency, regional direction, central direction and administrator roles |
| Messaging | Authenticated user messaging and administrator message management |
| Notifications | Notification summary endpoints used by the frontend |
| BI access | Embedded Power BI report page configured in the React frontend |
| AI assistant | Authenticated natural-language questions, scoped SQL generation and SQL Server execution |
| Forecasting | CSV/Excel upload, Python training pipeline, model comparison, results and forecast preview |

## System Architecture

```mermaid
flowchart LR
    U[Authorized user] --> FE[React frontend]
    FE --> API[Node.js and Express API]
    API --> AUTH[(SQL Server\nBNA auth database)]
    API --> DW[(SQL Server\nBNA Data Warehouse)]
    FE --> PBI[Power BI report\nembedded URL]
    API --> GROQ[Groq API\nchatbot generation]
    API --> PY[Python forecasting process]
    PY --> FILES[Forecast input and output files]
    DW --> PBI
```

The frontend communicates with the backend through HTTP requests under `/api`. The backend maintains separate SQL Server connection pools for the authentication database and the Data Warehouse. The forecasting route starts the Python process and returns generated summaries and forecast outputs to the frontend.

## Part I - BNA Web Platform

### Purpose and Architecture

The web application centralizes access to investment information and related workflows. React provides the user interface and routing. Node.js and Express expose the API, enforce authentication and authorization, communicate with SQL Server, and orchestrate the Python forecasting process.

### Frontend

The frontend is a Create React App application using React 19, React Router and Recharts. Its confirmed pages and modules include:

- Login and session bootstrap.
- Mandatory first-login password change.
- Home and application layout with role-aware navigation.
- Power BI dashboard embedding.
- Forecast upload, training status, model comparison and visualizations.
- User management for administrators.
- User messaging and administrator message management.
- Floating chatbot available after authentication and after the mandatory password change.

### Backend

The Express API exposes the following route groups:

| Route | Responsibility | Access |
| --- | --- | --- |
| `/api/health` | API health check | Public |
| `/api/auth` | Login, current user and password change | Login is public; other endpoints require JWT |
| `/api/users` | User administration | JWT, completed password change and Admin role |
| `/api/chat` | Conversational analytical assistant | JWT and completed password change |
| `/api/messages` | User and administrator messaging | JWT and completed password change |
| `/api/notifications` | Notification summaries | API route protection applies according to implementation |
| `/api/forecast` | Upload, train, status, results and forecast preview | JWT and completed password change |

The server also configures CORS for the local frontend origins, parses JSON requests with a 1 MB limit, returns JSON errors and exposes a health endpoint.

### User Roles and Authorization

The implementation recognizes four roles:

| Role | Confirmed scope |
| --- | --- |
| `Admin` | User administration, administrator messaging and national analytical access |
| `Agence` | Access associated with the user's agency code |
| `Direction regional` | Access associated with the user's regional direction code |
| `Direction central` | National analytical access; assignable by the user API but not creatable as an additional Admin |

The user administration controller enforces a single protected administrator account in the current implementation. New users are created with a server-generated temporary password, stored as a bcrypt hash, and marked to change their password on first use. SMTP delivery is optional and depends on configuration.

### Authentication and Password Lifecycle

1. The user submits credentials to `POST /api/auth/login`.
2. The backend checks the account status and compares the password with its bcrypt hash.
3. A JWT containing the user identity, role and structure code is returned.
4. Protected requests send the token in `Authorization: Bearer <token>`.
5. The backend verifies the signature and expiration before authorizing the request.
6. Sensitive routes query the database to reject accounts whose `must_change_password` flag is still active.

The frontend locally checks the token expiration to avoid sending an obviously expired token; this is only a convenience check. Signature verification remains a backend responsibility.

The confirmed password feature is a mandatory password change through `/api/auth/change-password`. A self-service forgotten-password or password-reset workflow is not confirmed in the repository and is therefore not documented as implemented.

### Operational Traceability

The application stores user creation dates and status information and routes operations through authenticated controllers. Database load timestamps are also represented in the documented Data Warehouse facts. A complete business audit-log table or immutable event history is not visible in this repository and should be added if formal audit requirements apply.

## Part II - Business Intelligence

### Data Integration and ETL

The documented target flow is designed to transform source placement files into a queryable Data Warehouse:

1. Excel files are supplied as source data.
2. SSIS packages, when configured in the deployment environment, extract and validate the files.
3. Data is loaded into an Operational Data Store (ODS).
4. Cleaning and transformation standardize dates, amounts, currencies, structures, maturity and objectives.
5. Quality checks identify missing values, invalid formats, duplicates and inconsistent business attributes.
6. Validated data is loaded into the Data Warehouse.
7. SQL Server Agent can schedule the packages when job configuration is available.

No `.dtsx` package, ODS schema, SQL Agent job or ETL deployment script is present in this repository. The steps above describe the BI architecture and must be aligned with the actual SSIS environment before production use.

```mermaid
flowchart LR
    XLS[Excel source files] --> SSIS[SSIS extraction and transformation\nwhen configured]
    SSIS --> ODS[(ODS\noperational staging)]
    ODS --> QC[Cleaning, validation\nand quality checks]
    QC --> DW[(SQL Server\nData Warehouse)]
    DW --> PBI[Power BI dashboards]
    DW --> CHAT[Scoped chatbot queries]
    AGENT[SQL Server Agent\noptional scheduling] --> SSIS
```

### Data Quality Responsibilities

An operational ETL implementation should define rejection and remediation rules for:

- Missing or malformed subscription and maturity dates.
- Invalid amounts, rates, currencies or durations.
- Duplicate placement records.
- Unknown agencies, regional directions, products or maturity bands.
- Missing objectives or incompatible objective currency.
- Partial file loads and failed database transactions.

The Python forecasting pipeline contains its own input normalization and validation for CSV and Excel files, but that logic is not a replacement for an enterprise ETL quality process.

### Data Warehouse Model

The repository documents the following Data Warehouse structures:

| Table | Role |
| --- | --- |
| `DW.FAIT_PLACEMENT` | Main fact table; one row represents a financial placement according to the chatbot schema |
| `DW.FAIT_OBJECTIF` | Commercial or investment objectives by structure and year |
| `DW.DIM_TEMPS` | Calendar and date attributes, including subscription and maturity dates |
| `DW.DIM_STRUCTURE` | Agency and regional-direction attributes |
| `DW.DIM_MATURITE` | Contractual and residual maturity bands |
| `DW.DIM_PRODUIT` | Financial product attributes used by the chatbot schema |
| `DW.DIM_DEVISE` | Currency attributes used by the chatbot schema |
| `DW.DIM_ACTIVITE` | Economic activity attributes used by the chatbot schema |

The model follows a dimensional approach: facts hold measurable events and amounts, while dimensions provide the analytical axes. The exact physical keys and all relationships must be confirmed against the deployed SQL Server schema. The chatbot code explicitly references structure and time joins, including separate time aliases for subscription and maturity dates.

Relevant measures and attributes include placement amounts, interest rates, interest charges, effective duration, subscription dates, maturity dates, structures, currencies, contractual maturity, residual maturity and placement objectives. The implementation stores amounts in millimes in the documented fact schema and converts them for some chatbot displays; reporting conventions should be standardized in the BI layer.

### Power BI

The React dashboard embeds a configured Power BI report URL and provides a full-screen link. The code describes the report as a consolidated placement KPI view. The following analytical views are appropriate to the documented model and are part of the intended BI scope:

- Placement amounts by agency, regional direction and structure.
- Actual performance compared with objectives.
- Objective achievement rate.
- Dinar versus foreign-currency analysis.
- Subscription dates, maturity dates and residual maturity.
- Interest rates, interest charges and placement duration.
- KPI cards, filters and interactive slicers.
- BNA-inspired visual identity.

The repository does not contain the Power BI `.pbix` file or DAX source. Therefore, the exact measures, refresh policy, workspace permissions and visuals must be documented from the deployed Power BI artifact rather than inferred here.

The business value of this layer is a more consistent performance view, less manual consolidation, faster monitoring and better support for operational and strategic decisions.

## Part III - AI Chatbot and Machine Learning

### AI Chatbot

The chatbot is implemented as an authenticated assistant integrated into the React application and the Express API. It accepts a natural-language question, asks the configured Groq model to generate a T-SQL query based on an embedded Data Warehouse schema, executes the controlled query against SQL Server and returns a natural-language response.

The current implementation confirms the use of the Groq SDK and model name `llama-3.3-70b-versatile` in the backend. The assistant is not described as a general-purpose banking advisor; it is a controlled analytical interface for the documented BNA Data Warehouse.

#### Security and Scope Controls

- Chat requests require a valid JWT and a completed first-login password change.
- Agency users are restricted to their agency code.
- Regional-direction users are restricted to their regional code.
- Admin and central-direction users have national scope in the current scope service.
- The backend applies the territorial filter independently of the generated query.
- Generated SQL must start with `SELECT` and rejects data-modification, administrative, multi-statement and comment patterns.
- The chatbot prompt requires a structure join and includes business rules for dates, currencies, objectives and maturity.
- Conversation history is kept per authenticated user in server memory; it is not a persistent audit store.

Because the chatbot generates SQL, production deployment should add database least privilege, query timeouts, monitoring, prompt and output logging policies, and a review of any debug SQL exposure outside development.

### Machine Learning

The forecasting component is confirmed as implemented. The frontend uploads `.csv`, `.xlsx` or `.xls` files, starts a training run through the backend, displays status and reads generated comparison and forecast outputs.

#### Confirmed Pipeline

- Input normalization for common date and amount column names.
- Optional placement-count, interest-rate and duration features.
- Date parsing, monthly alignment, duplicate removal and missing-date handling.
- Numeric conversion and interpolation for supported numeric series.
- IQR-based outlier treatment in the preprocessing flow.
- Temporal hold-out evaluation and five-fold `TimeSeriesSplit` evaluation when the data is sufficient.
- Model comparison and best-model selection.
- CSV and Excel export of model comparison, forecast horizon and cleaned history.

#### Confirmed Models and Metrics

| Model | Implementation |
| --- | --- |
| SARIMA | Seasonal `auto_arima` with monthly seasonality and a fallback SARIMA configuration |
| Random Forest | `RandomForestRegressor` with lag/feature-based forecasting helpers |
| XGBoost | `XGBRegressor` with lag/feature-based forecasting helpers |

The implemented metrics are RMSE and SMAPE. The repository contains the evaluation code but does not provide a universal accuracy score: scores depend on the uploaded dataset, period, preprocessing result and run. No dataset or benchmark result is bundled in this repository.

#### Integration Opportunities

The current forecast outputs are exposed through the platform's forecast page. Future work can publish validated forecasts to Power BI, persist model versions and training metadata in SQL Server, schedule retraining, add confidence intervals and monitor drift. These are evolution paths, not claims about current implementation.

## Technology Stack

| Layer | Technologies confirmed in the repository |
| --- | --- |
| Frontend | React 19, React Router, Recharts, Create React App |
| Backend | Node.js, Express 5, CORS, Multer |
| Authentication | JSON Web Tokens, bcryptjs |
| Data access | `mssql` and SQL Server |
| Chatbot | `groq-sdk`, configured Groq model |
| Email | Nodemailer, optional SMTP configuration |
| Machine learning | Python, pandas, NumPy, scikit-learn, pmdarima, XGBoost, openpyxl |
| Reporting | Power BI embedded report URL configured by the frontend |

## Database Architecture

The backend uses two configured SQL Server databases:

```mermaid
flowchart TB
    API[Express API]
    API --> AUTH[(DB_NAME_AUTH\nBNA authentication database)]
    API --> DWH[(DB_NAME_DW\nplacement Data Warehouse)]
    AUTH --> USERS[dbo.Users]
    DWH --> FACTS[DW facts and dimensions]
```

The authentication database contains `dbo.Users`, including identity, role, structure code, status, password hash and first-login password flag. The Data Warehouse connection is used by the chatbot and is the expected source for BI reporting. Database credentials must be provided through environment variables and must never be committed.

## Data Flow and ETL Pipeline

### Operational and Analytical Flow

```mermaid
sequenceDiagram
    participant User
    participant React
    participant API as Express API
    participant Auth as Auth SQL Server
    participant DW as Data Warehouse
    participant Model as Python ML pipeline

    User->>React: Sign in
    React->>API: POST /api/auth/login
    API->>Auth: Validate account and bcrypt hash
    Auth-->>API: User record
    API-->>React: JWT and public user
    User->>React: Ask question or request forecast
    React->>API: Authenticated request
    API->>DW: Scoped analytical query
    DW-->>API: Results
    API-->>React: Response or forecast data
    API->>Model: Upload path and output directory
    Model-->>API: Summary and exported files
```

The separate SSIS-to-ODS-to-Data-Warehouse flow is described in [Data Integration and ETL](#data-integration-and-etl). Its concrete packages and schedules must be supplied by the BI deployment.

## Security and Access Control

- JWT verification is enforced by Express middleware on protected routes.
- Passwords are hashed with bcrypt and are not returned in public user objects.
- Inactive accounts are rejected during login and current-user checks.
- First-login users cannot access sensitive business routes until the password is changed.
- Admin-only routes enforce the `Admin` role server-side.
- Chatbot scope is applied server-side and does not rely only on frontend filtering.
- SQL parameters are used for ordinary database operations such as login and scope lookup.
- Uploads are restricted to CSV/Excel extensions and 15 MB by the forecast route.
- Secrets and database credentials belong in environment variables.

The frontend stores the JWT in `localStorage` in the current implementation. A production security review should assess the associated XSS risk, Content Security Policy, cookie strategy, HTTPS enforcement, secret rotation, rate limiting and audit requirements.

## Installation and Configuration

The repository contains two Node.js packages and one Python environment. Install dependencies separately in each component.

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

Install the Python dependencies from the checked-in requirements file in a Python environment:

```powershell
cd ..\ml-forecast
python -m pip install -r requirements.txt
```

Before starting the application, configure SQL Server databases, a database user, JWT settings and any optional integrations. The repository does not include database creation scripts or sample credentials.

## Environment Variables

The following names are read by the current code. Values are deployment-specific and must not be copied from this documentation.

| Variable | Purpose | Required when |
| --- | --- | --- |
| `PORT` | Express listening port | Starting the backend |
| `DB_SERVER` | SQL Server host | Database access |
| `DB_NAME_AUTH` | Authentication database name | Database access |
| `DB_NAME_DW` | Data Warehouse database name | DW access and chatbot |
| `DB_USER` | SQL Server login | Database access |
| `DB_PASSWORD` | SQL Server password | Database access |
| `JWT_SECRET` | JWT signing secret | Authentication |
| `JWT_EXPIRES_IN` | JWT lifetime accepted by the JWT library | Authentication |
| `GROQ_API_KEY` | Groq API credential | Chatbot |
| `PYTHON_PATH` | Python executable used by the backend | Forecast training |
| `FORECAST_OUTPUT_DIR` | Optional forecast output directory | Forecast customization |
| `FORECAST_UPLOAD_DIR` | Optional forecast upload directory | Forecast customization |
| `SMTP_DISABLED` | Disables SMTP when set to `true` or `1` | Optional email behavior |
| `SMTP_HOST` | SMTP server host | Welcome credential email |
| `SMTP_PORT` | SMTP server port | Welcome credential email |
| `SMTP_SECURE` | Enables secure SMTP mode | Welcome credential email |
| `SMTP_USER` | SMTP username and fallback sender | Welcome credential email |
| `SMTP_PASS` | SMTP password | Authenticated SMTP |
| `SMTP_FROM` | Sender address override | Welcome credential email |
| `FRONTEND_BASE_URL` | Frontend base URL used in email links | Welcome credential email |
| `FRONTEND_LOGIN_URL` | Optional explicit login URL in emails | Welcome credential email |
| `NODE_ENV` | Controls development-only chatbot debug SQL response | Runtime behavior |

The frontend currently defines its API base URL and Power BI embed URL in `frontend/src/config.js`. They are source configuration values rather than documented secrets; deployments should externalize them when environment-specific configuration is required.

## Running the Application

Start the backend in one terminal:

```powershell
cd backend
npm start
```

Start the React development server in another terminal:

```powershell
cd frontend
npm start
```

The backend code is configured for the local frontend origins `http://localhost:3000` and `http://127.0.0.1:3000`. The API base URL currently used by the frontend is `http://localhost:5000/api`; ensure that `PORT` and the frontend configuration agree in the target environment.

The backend also exposes `GET /api/health` for a basic API availability check. Forecast execution additionally requires a working Python executable and all packages in `ml-forecast/requirements.txt`.

## Project Structure

```text
backend/
  config/              SQL Server connection pools
  controllers/         Authentication, users, messages, notifications, forecasts
  middleware/          JWT, role and first-login guards
  routes/              Express API route groups
  services/            Chat scope, email and forecast orchestration
  templates/email/     Welcome credential email template
  data/forecast/       Forecast uploads and generated outputs
  server.js            Express entry point
frontend/
  public/              Static HTML and manifest
  src/components/      Reusable UI modules
  src/context/         Chatbot context
  src/hooks/            Authentication, notifications and toast hooks
  src/pages/           Routed application pages
  src/routes/          React route configuration
  src/services/        API client services
  src/styles/          Theme and global styles
  App.js               React entry component
ml-forecast/
  models/              SARIMA, Random Forest and XGBoost implementations
  metrics.py           RMSE and SMAPE
  preprocessing.py     Input normalization and cleaning
  pipeline.py          Training, evaluation and export orchestration
  train_and_predict.py Python CLI called by Node.js
  requirements.txt     Python dependencies
```

## Screenshots and Demonstrations

Screenshots are not included in the current repository. Add approved, anonymized images here before publishing the project:

```text
docs/screenshots/login.png
docs/screenshots/dashboard.png
docs/screenshots/forecast.png
docs/screenshots/chatbot.png
```

Do not include real customer information, credentials, tokens, internal URLs or confidential banking data in demonstrations. A future demo section should cover login, dashboard filtering, forecast execution, chatbot scope and administrator user management.

## Testing and Validation

No automated test suite or test command is defined in the checked-in `package.json` files. The following validation activities are available from the implementation:

- Check backend availability with `GET /api/health`.
- Verify login, JWT rejection and inactive-account behavior against a non-production database.
- Verify first-login route protection and successful password change.
- Verify each role with test accounts mapped to representative structures.
- Verify chatbot SQL restrictions and agency/regional scope using non-sensitive test data.
- Verify forecast upload validation, training status, generated summary and model comparison outputs.
- Run `npm run build` from `frontend` before a frontend deployment.

Power BI refresh, SSIS data quality checks, SQL Server permissions and SQL Agent scheduling require validation in their respective environments because those artifacts are not stored here.

## Current Limitations

- SSIS packages, ODS definitions, SQL Agent jobs and Power BI authoring files are external to this repository.
- The exact Power BI measures, refresh schedule and workspace security are not visible in source code.
- A self-service forgotten-password/reset flow is not confirmed.
- The JWT is stored in browser `localStorage` by the current frontend.
- Chat history is held in backend process memory and is lost when the server restarts.
- Forecast state and generated files use local filesystem storage and a single training run per server instance.
- Forecast results depend on the uploaded data; no benchmark dataset or fixed score is included.
- No automated test suite, migration system or database deployment scripts are included.
- A complete immutable business audit trail is not visible in the repository.

## Future Improvements

1. Version SQL migrations, Data Warehouse contracts and sanitized seed data.
2. Add SSIS packages or an equivalent documented ETL deployment and monitoring process.
3. Version the Power BI semantic model, DAX measures and refresh configuration in an appropriate controlled repository.
4. Implement a secure forgotten-password workflow with expiring, single-use reset tokens.
5. Move secrets and environment-specific frontend configuration out of source code.
6. Replace process-local chat history and forecast state with durable, access-controlled storage.
7. Add automated unit, integration, security and end-to-end tests.
8. Strengthen production controls with HTTPS, rate limiting, CSP, secret rotation, auditing and database least privilege.
9. Persist model versions, data lineage, training metadata and forecast monitoring results.
10. Publish validated predictions and confidence information to Power BI and operational screens.

## Contributors

This project was developed as a final-year academic project. Add the verified contributor names, affiliations and contact details before publishing:

| Contributor | Role | Contact |
| --- | --- | --- |
| `[Contributor name]` | Project development | `[Contact or profile]` |
| `[Supervisor name]` | Academic supervision | `[Contact or profile]` |

## License

No repository-level `LICENSE` file is currently present. The backend package metadata declares `ISC`, but that package metadata alone does not establish a license for the complete repository. Add an approved license file and replace this section with its exact terms before public distribution.
