# Frontend Integration Prompt for Polls API

Use this prompt to integrate the Polls API with your frontend application:

---

**I need help connecting my frontend React/Next.js/Vue application to the Polls API backend. Here are the API endpoints and their specifications:**

## Base URL
The API base URL is: `http://localhost:3000/api` (or your production URL)

## Authentication
Vote and create endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### 1. Get All Active Polls
**Endpoint:** `GET /api/polls`
**Auth Required:** No (public endpoint)
**Response:**
```json
{
  "polls": [
    {
      "id": "poll-id",
      "question": "What is your favorite programming language?",
      "description": "Help us understand the community preferences",
      "created_by": "user-uuid",
      "creator_username": "john_doe",
      "expires_at": "2024-12-31T23:59:59Z",
      "is_active": true,
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z",
      "options": [
        {
          "id": "option-uuid-1",
          "poll_id": "poll-id",
          "option_text": "JavaScript",
          "vote_count": "15",
          "created_at": "2024-01-01T10:00:00Z"
        },
        {
          "id": "option-uuid-2",
          "poll_id": "poll-id",
          "option_text": "Python",
          "vote_count": "12",
          "created_at": "2024-01-01T10:00:01Z"
        },
        {
          "id": "option-uuid-3",
          "poll_id": "poll-id",
          "option_text": "TypeScript",
          "vote_count": "8",
          "created_at": "2024-01-01T10:00:02Z"
        }
      ],
      "total_votes": 35
    }
  ]
}
```

### 2. Get Specific Poll with Detailed Results
**Endpoint:** `GET /api/polls/:id`
**Auth Required:** No (public endpoint)
**Response:**
```json
{
  "poll": {
    "id": "poll-id",
    "question": "What is your favorite programming language?",
    "description": "Help us understand the community preferences",
    "created_by": "user-uuid",
    "creator_username": "john_doe",
    "creator_email": "john@example.com",
    "expires_at": "2024-12-31T23:59:59Z",
    "is_active": true,
    "created_at": "2024-01-01T10:00:00Z",
    "options": [
      {
        "id": "option-uuid-1",
        "poll_id": "poll-id",
        "option_text": "JavaScript",
        "vote_count": "15",
        "vote_percentage": "42.86",
        "created_at": "2024-01-01T10:00:00Z"
      },
      {
        "id": "option-uuid-2",
        "poll_id": "poll-id",
        "option_text": "Python",
        "vote_count": "12",
        "vote_percentage": "34.29",
        "created_at": "2024-01-01T10:00:01Z"
      },
      {
        "id": "option-uuid-3",
        "poll_id": "poll-id",
        "option_text": "TypeScript",
        "vote_count": "8",
        "vote_percentage": "22.86",
        "created_at": "2024-01-01T10:00:02Z"
      }
    ],
    "total_votes": 35
  }
}
```

### 3. Create Poll
**Endpoint:** `POST /api/polls`
**Auth Required:** Yes (authenticated users only)
**Request Body:**
```json
{
  "question": "What is your favorite programming language?",
  "description": "Help us understand the community preferences",
  "options": [
    "JavaScript",
    "Python",
    "TypeScript",
    "Java"
  ],
  "expires_at": "2024-12-31T23:59:59Z"  // Optional ISO 8601 date-time
}
```

**Validation Rules:**
- `question` (required): Poll question text
- `options` (required): Array of at least 2 option strings
- `description` (optional): Additional poll description
- `expires_at` (optional): ISO 8601 date-time format

**Response:**
```json
{
  "message": "Poll created successfully",
  "poll": {
    "id": "poll-id",
    "question": "What is your favorite programming language?",
    "description": "Help us understand the community preferences",
    "created_by": "user-uuid",
    "expires_at": "2024-12-31T23:59:59Z",
    "is_active": true,
    "created_at": "2024-01-01T10:00:00Z",
    "options": [
      { "id": "option-uuid-1", "option_text": "JavaScript", ... },
      { "id": "option-uuid-2", "option_text": "Python", ... },
      ...
    ]
  }
}
```

### 4. Vote on Poll
**Endpoint:** `POST /api/polls/:id/vote`
**Auth Required:** Yes (authenticated users only)
**Request Body:**
```json
{
  "option_id": "option-uuid-1"
}
```

**Response:**
```json
{
  "message": "Vote recorded successfully",
  "poll": {
    // Updated poll with new vote counts and percentages
    "id": "poll-id",
    "question": "...",
    "options": [
      {
        "id": "option-uuid-1",
        "option_text": "JavaScript",
        "vote_count": "16",  // Updated count
        "vote_percentage": "44.44"  // Updated percentage
      },
      ...
    ],
    "total_votes": 36
  }
}
```

**Note:** 
- Users can only vote once per poll
- If user votes again, their vote is updated (not a new vote added)
- Returns updated poll with recalculated percentages

## Frontend Implementation Requirements

Please help me implement:

1. **Poll List Component**
   - Display list of all active polls
   - Show poll question, description, creator, expiration date
   - Display option vote counts for each poll (can be collapsed/summarized)
   - Show total votes per poll
   - Handle loading and error states
   - Show poll expiration status (expired/active)
   - Link to individual poll detail page

2. **Poll Detail Component**
   - Display full poll information
   - Show all options with:
     - Option text
     - Vote count
     - Vote percentage (with visual progress bar)
     - Visual representation (charts/progress bars)
   - Display total votes
   - Show creator information
   - Show expiration status
   - **Voting Interface:**
     - Radio buttons or clickable cards for each option
     - "Vote" button (only if user is authenticated)
     - Disable voting if poll expired or user already voted
     - Show user's current vote (if authenticated and voted)
     - After voting, update UI with new results
   - Real-time or manual refresh of results

3. **Poll Creation Form**
   - Form fields:
     - Question (required, text input)
     - Description (optional, textarea)
     - Options (required, dynamic list with add/remove):
       - Minimum 2 options required
       - Allow adding more options
       - Each option must have text
     - Expiration date (optional, date-time picker)
   - Form validation:
     - Question required
     - Minimum 2 options required
     - Each option must not be empty
     - Expiration date must be valid ISO 8601 format if provided
   - Submit button that calls POST `/api/polls`
   - Success message and redirect to poll detail page
   - Only show for authenticated users

4. **Voting Functionality**
   - Voting button/interface on poll detail page
   - POST to `/api/polls/:id/vote` with selected `option_id`
   - Show loading state during vote submission
   - Update poll results after successful vote
   - Handle errors (poll not found, option not found, etc.)
   - Prevent multiple votes (can change vote but only one active)
   - Show which option user voted for (if authenticated)

5. **State Management**
   - Fetch and store polls list
   - Store individual poll details
   - Track user's votes (optional: store locally or fetch from API)
   - Manage loading and error states
   - Handle authentication token storage
   - Refresh poll data after voting

6. **UI/UX Features**
   - Visual progress bars showing vote percentages
   - Charts/graphs for poll results (optional: bar chart, pie chart)
   - Highlight user's selected option
   - Show "You voted for..." indicator
   - Expired poll indicators
   - Poll expiration countdown (optional)
   - Responsive design for mobile/desktop
   - Smooth animations when updating vote counts

## Additional Notes
- Only active polls (`is_active = true`) are returned in the list
- Polls are ordered by `created_at DESC` (most recent first)
- One vote per user per poll (voting again updates the vote)
- Vote percentages are calculated as: `(option_votes / total_votes) * 100`
- If `expires_at` is null, poll never expires
- All authenticated users can create polls and vote
- Viewing polls is public (no auth required)
- Vote counts are returned as strings (convert to numbers for calculations)

Please provide code examples using [your framework: React/Vue/Next.js/etc] with proper TypeScript types, error handling, visual components (progress bars/charts), and best practices.


