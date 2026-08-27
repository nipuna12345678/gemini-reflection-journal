# Gemini Reflection Journal & AI Conversational Vault

A secure, user-authenticated journaling and reflection web application powered by **Google Gemini 3.6 Flash**, **Firebase Authentication (Google Sign-In)**, and **Cloud Firestore** with strict per-user document isolation.

---

## 1. Agentic Threat Modeling & Security Review

| Threat Zone | Identified Risks | Countermeasures Implemented |
| :--- | :--- | :--- |
| **Input Surfaces** | Prompt injection, malicious payloads, payload deserialization crashes, oversized inputs. | Express `express.json({ limit: '10mb' })` ordering guarantee, defensive null-safe payload ingestion, type guards, and input length limits. |
| **Planning & Reasoning** | System instruction bypass, model hallucinations, unhandled model outages. | Decoupled system prompts with strict behavioral guardrails; Resilient 4-tier model fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`). |
| **Tool Execution & APIs** | SSRF, privilege escalation via backend routes, unauthorized endpoint invocation. | Server-side proxying for all Gemini API calls; API keys kept strictly server-side; no arbitrary command execution sinks. |
| **Memory & State** | Session hijacking, cross-user document snooping, undefined property crashes in database drivers. | Strict owner-bound Firestore security rules (`request.auth.uid == userId`); recursive undefined-stripping (`stripUndefined`) prior to all Firestore mutations. |
| **Inter-System Communication** | Secret key leakage, unencrypted data in transit, expired auth tokens. | Google Secret Manager integration; zero hardcoded API keys; TLS 1.3 encryption across all client-to-server and server-to-Gemini communications. |

---

## 2. Architecture & Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **User Identity** | Firebase Authentication | Secure federated Google Sign-In with zero password storage. |
| **Backend Database** | Cloud Firestore | User-isolated document storage for multi-turn reflection transcripts, takeaways, and metadata. |
| **AI Engine** | Gemini 3.6 Flash | Multi-turn conversational journaling, cognitive reframing, auto-tagging, and aggregate synthesis. |
| **Backend Server** | Express.js + Vite | Full-stack server proxying Gemini requests and serving the SPA. |
| **Secret Management** | Secret Manager / Env Vars | Secure storage of operational API keys without client exposure. |

---

## 3. Cloud Firestore Security Rules

Deploy the following owner-bound rules in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all by default (zero insecure defaults)
    match /{document=**} {
      allow read, write: if false;
    }

    // Strict user isolation: only the authenticated user can access their documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /reflections/{reflectionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 4. Google Cloud Secret Manager Setup

Store your Gemini API key in Secret Manager and grant access to the Cloud Run runtime service account:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 5. Google Cloud Run Deployment Flow

Deploy the application as a containerized service:

```bash
# Build and deploy to Cloud Run
gcloud run deploy gemini-reflection-journal \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest

# Apply required campaign labeling for automated challenge verification
gcloud run services update gemini-reflection-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Test Walkthroughs

Walk through these verified test cases to validate all application capabilities:

### Test Case 1: Landing Page & Google Authentication
1. Navigate to the application URL in your browser.
2. Verify that the landing page displays feature pillars, security details, and a prominent **"Sign In with Google"** CTA.
3. Click **"Sign In with Google"** (or **"Continue as Guest / Demo"**).
4. Confirm successful sign-in transitions the UI seamlessly into the private **Reflection Dashboard**.
5. Verify the user profile avatar and Firestore UID isolation badge appear in the top navigation bar.

### Test Case 2: Multi-Turn Journaling & Gemini Conversation
1. Select a reflection mode (e.g., **"Daily Reflection"** or **"Creative Brainstorm"**).
2. Type an initial thought into the text composer (e.g., *"I felt overwhelmed with project deadlines today and want to break down my priorities."*).
3. Click **"Start Reflection"** (or press `Cmd/Ctrl + Enter`).
4. Verify that Gemini returns a compassionate, structured reflection with markdown formatting and identified themes.
5. In the follow-up composer, submit a follow-up reply (e.g., *"What should I focus on first tomorrow morning?"*).
6. Verify that Gemini maintains conversational context across the multi-turn session.

### Test Case 3: Auto-Analysis & Firestore Persistence
1. Click the **"AI Insights"** button on the session toolbar.
2. Verify that Gemini analyzes the session and automatically populates:
   - An evocative session title.
   - An executive summary.
   - Key bulleted takeaways.
   - Categorical topic tags.
   - Sentiment badge (e.g., *Reflective*, *Determined*).
3. Observe the Firestore status badge update to **"Vaulted @ [timestamp]"**.
4. Refresh the browser page or open the **"Journal History"** tab to verify that the entry is permanently preserved in Firestore.

### Test Case 4: Search, Filtering & Data Export
1. Navigate to the **"Journal History"** tab.
2. Type a keyword into the search bar (e.g., *"deadlines"* or a specific tag).
3. Verify that entries filter in real time.
4. Click on an entry card to open the **Full Transcript Modal**.
5. Click **"Export .md"** and verify that a formatted Markdown file is downloaded.
6. Click **"Copy Text"** and verify the clipboard confirmation.
7. Click **"Resume"** to continue chatting with Gemini in that historical session.

### Test Case 5: Multi-Session AI Growth Synthesis
1. Click on the **"AI Synthesis"** tab in the navigation bar.
2. Click **"Generate Growth Synthesis"**.
3. Verify that Gemini synthesizes recurring patterns, emotional arcs, and breakthroughs across past journal entries.

### Test Case 6: Sign Out & Privacy Isolation
1. Click the **"Sign Out"** button in the header.
2. Confirm the app returns to the landing page and closes the active Firestore listener.
