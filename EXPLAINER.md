# Technical Explainer

## 1. The Tree: Nested Comments Architecture

**How did you model the nested comments in the database?**
I used the **Adjacency List** pattern. The `Comment` model contains a `parent` ForeignKey that points to `self`. This is simple, referentially integers, and works well for threaded conversations where depth is usually shallow (< 10 levels).

**How did you serialize them without killing the DB?**
The "N+1 Problem" usually occurs here if you recursively fetch children for every comment.
*   **The Bug:** Fetching a post (1 query) -> fetching 10 comments (1 query) -> fetching authors for each comment (10 queries) -> fetching replies (10 queries).
*   **The Fix:** I flattened the serialization.
    1.  The Backend fetches **all** comments for a post in a single query using `prefetch_related`.
    2.  The API returns a **flat array** of comments, each containing a `parentId`.
    3.  The **Frontend** (React) performs the "Tree Construction" (converting the flat list into a recursive structure) in memory.
    
    This keeps the Database work O(1) (constant number of queries per feed load) rather than O(N).

## 2. The Math: 24h Rolling Leaderboard

The requirement was to count Karma *earned* in the last 24 hours. A simple `User.karma` field is insufficient because it doesn't know *when* points were earned.

**The Solution:**
I implemented a `KarmaTransaction` ledger. Every like creates a transaction record with a timestamp.

**The SQL/QuerySet:**
```python
# backend/views.py

# 1. Define the sliding window (Now minus 24 hours)
time_threshold = timezone.now() - timedelta(hours=24)

# 2. Filter & Aggregate
leaders = KarmaTransaction.objects.filter(
    created_at__gte=time_threshold
).values(
    'user__username', 
    'user__id'
).annotate(
    score=Sum('amount')
).order_by('-score')[:5]
```
This allows for a dynamic, real-time calculation that is strictly accurate to the second.

## 3. The AI Audit

**Scenario:**
When asked to generate the Comment Serializer, the AI assistant provided a standard recursive definition:
```python
# AI SUGGESTION
parentId = serializers.PrimaryKeyRelatedField(queryset=Comment.objects.all())
```

**The Hidden Bug:**
The AI failed to account for **Circular Dependencies**.
If a malicious user (or a bug) sets a comment's `parentId` to its own ID, the Frontend's recursive tree-building algorithm would enter an infinite loop, causing a **Stack Overflow** and crashing the user's browser.

**The Fix:**
I intervened and added a robust cycle detection check in the Serializer's `validate()` method to enforce strict Directed Acyclic Graph (DAG) rules:

```python
# CORRECTED CODE (backend/serializers.py)
def validate(self, data):
    # Ensure a comment cannot reply to itself (Cycle Detection)
    if self.instance and 'parent' in data:
        parent = data['parent']
        if parent and parent.id == self.instance.id:
            raise serializers.ValidationError("A comment cannot reply to itself.")
    return data
```
