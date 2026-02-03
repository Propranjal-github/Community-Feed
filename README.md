# Playto Community Feed

A high-performance threaded community feed with real-time 24h leaderboard calculations. Built with Django (DRF) and React.

**🚀 Live Demo:** [https://community-feed-rho.vercel.app](https://community-feed-rho.vercel.app)

---

## ⚡️ Quick Start (Run Locally)

We have configured a root-level script to make running the frontend easy, but you will need two terminal windows to run the full stack.

### 1. Backend Setup (Terminal A)
> **⚠️ Important:** Please use **Python 3.12.5** (or any stable version between 3.10 and 3.12). 
> **Do not use Python 3.13 or 3.14** yet, as they are experimental/pre-release and are not yet fully supported by Django 5.

The backend uses SQLite by default, so no extra database installation is required.

```bash
cd backend

# Create & Activate Virtual Env
# Ensure your python command points to Python 3.12
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Dependencies
pip install -r requirements.txt

# Run Migrations & Start Server
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```
*Backend runs on: `http://127.0.0.1:8000`*

### 2. Frontend Setup (Terminal B)

```bash
cd frontend

# Install Node Modules
npm install

# Start Dev Server
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

---

## ⚙️ Configuration (Environment Variables)

The project uses `.env` files to manage configuration. We have included default files (`backend/.env` and `frontend/.env`) for local development convenience.

### Backend (`backend/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Toggle debug mode | `True` |
| `SECRET_KEY` | Django secret key | `django-insecure...` |
| `ALLOWED_HOSTS` | Comma-separated hosts | `localhost,127.0.0.1` |
| `DATABASE_URL` | Database connection string | (Empty = SQLite) |
| `FRONTEND_URL` | URL for CORS/CSRF trust | `http://localhost:5173` |

### Frontend (`frontend/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | URL of the Django Backend | `http://localhost:8000` |

---

## 🐳 (Optional) Running the backend with Docker

This project also includes a Docker setup for the backend as an optional bonus.

**Prerequisites:**
- Docker
- Docker Compose

**Steps:**
1. Build the container:
   ```bash
   docker compose build
   ```
2. Start the services:
   ```bash
   docker compose up
   ```

The backend will be available at `http://localhost:8000`. You can then run the frontend in a separate terminal using `npm run dev` as shown above.

---

## 🧪 Verification: Running the Leaderboard Test

We have included a specific unit test to prove the **24-hour rolling window** logic is mathematically correct (i.e., it strictly excludes points older than 24h).

To run the verification test:

1.  Open your terminal.
2.  Navigate to the backend folder: `cd backend`.
3.  Run the specific test module:

```bash
python manage.py test backend.tests
```

You should see `OK` in the output, confirming the logic holds up against time-travel scenarios.

---

## 🎯 Features & Deliverables

### 1. Core Requirements (The Assignment)
*   **The Feed:** Displays posts with Author and Like counts.
*   **Infinite Threaded Comments:** Users can reply to comments indefinitely. The UI handles deep nesting gracefully.
*   **Gamification Rules:** 
    *   Post Like = **+5 Karma**
    *   Comment Like = **+1 Karma**
*   **Dynamic Leaderboard:** A widget showing the Top 5 Users based strictly on **Karma earned in the last 24 hours**.

### 2. Engineering Polish (The Extra Mile)
These are features and architectural choices included to demonstrate craftsmanship beyond the basic requirements:

*   **🔄 Hybrid Authentication (Real + Mock Fallback):**
    *   **Online Mode:** By default, the app authenticates against the **Django Backend** (JWT/Session based).
    *   **Offline Fallback:** If the backend is unreachable, the app automatically switches to **Mock Mode**, allowing you to test the UI interactions (Login/Signup/Posting) without a server.
*   **🚫 Solved the N+1 Problem:** 
    *   Instead of recursively hitting the DB, the API fetches the entire comment tree in **one single query** using `prefetch_related`.
    *   The "Tree Construction" (Adjacency List -> Recursive Tree) happens in **O(N)** time in the browser (Client-Side), saving the server CPU.
*   **🔒 Concurrency & Integrity:** 
    *   Uses `transaction.atomic()` and `select_for_update()` on the database level.
    *   This prevents Race Conditions (e.g., users double-clicking to inflate votes) and ensures data consistency during high-load.
*   **✨ Optimistic UI Updates:** 
    *   The Like button updates instantly for the user, while the network request happens in the background. If the request fails (e.g., self-vote), the UI reverts gracefully.
*   **📱 Responsive & Accessible:** 
    *   Fully responsive layout using Tailwind CSS.
    *   Includes a "Guest" mode and a "Claim Username" feature for session management.
*   **🛡️ Security:** 
    *   CSRF Protection is fully configured for the API.
    *   Inputs are validated to prevent payload abuse.

---

## 🏗 System Architecture

### Database Design (Adjacency List)
We utilize a self-referential `Comment` model:
```python
class Comment(models.Model):
    parent = models.ForeignKey('self', null=True, ...)
    # ...
```
To fetch a thread efficiently, we do not recursively query parents. We fetch `Comment.objects.filter(post=id)` and let the React Frontend reconstruct the visual hierarchy.

### The "Rolling Window" Leaderboard
To avoid storing a static "score" that gets stale, the leaderboard is calculated on-demand (cached for 60 seconds) using the `KarmaTransaction` ledger:
```sql
SELECT sum(amount) FROM karma_transaction 
WHERE created_at > (NOW() - INTERVAL '24 HOURS')
GROUP BY user_id
ORDER BY sum DESC
LIMIT 5
```
This ensures the leaderboard is mathematically accurate to the second.

### Deployment Strategy
*   **Local:** Auto-detects environment and uses **SQLite**.
*   **Production:** If `DATABASE_URL` is present, switches to **PostgreSQL**.
*   **Serving:** Decoupled architecture. Django runs as a pure API server, and React runs independently (e.g., via Vite or on Vercel).

## 📂 Project Structure

- `frontend/`: React + Vite + Tailwind application.
- `backend/`: Django REST Framework application.
- `EXPLAINER.md`: Detailed breakdown of algorithmic choices.
- `REQUIREMENTS.md`: Detailed dependency list.