---
name: job-notifier-harvest
description: >
  Use when extracting open job listings from a Career Inbox job_notifier email
  (LinkedIn digests, Indeed, Google Job Alerts, Jack and Jill, similar).
  Produces structured jobs with real listing URLs from the email HTML/text.
version: 1.0.0
tags:
  - mail
  - harvest
  - jobs
---

# Job notifier harvest (mail → listings)

You extract every **distinct open role** from a job-notifier email.
There is no regex scraper. You must find listing URLs in the provided **body text and HTML**.

## When isJobNotifier is true

The email’s primary purpose is promoting open roles (alerts, digests, multi-role AI pitches).
If it is only application status, recruiter 1:1, or noise → `isJobNotifier=false`, `jobs=[]`.

## Extracting jobs

For each role card / bullet / link group:

| Field         | Rules                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listingUrl`  | **Required.** Real `http(s)` URL present in the email. Prefer the role’s detail/apply link. Never invent URLs. Prefer job-detail links over search-results or unsubscribe. |
| `title`       | Role title as shown (e.g. Design Engineer).                                                                                                                                |
| `companyName` | Employer name as shown.                                                                                                                                                    |
| `location`    | Free text if present.                                                                                                                                                      |
| `applyMethod` | `easy_apply` if Easy Apply / apply with resume & profile; `external` if company site / external apply; `email` if mailto; else `unknown`.                                  |
| `workMode`    | `remote` \| `hybrid` \| `onsite` when stated; else omit/null.                                                                                                              |

### HTML digests (Jack and Jill, many HTML newsletters)

Listing URLs often live **only in `<a href="...">`**, not in plain text.
Scan the HTML (or the “HTML WITH LINKS” section) carefully.
Typical pattern: `Title at Company` as anchor text, optional blurb after a colon.
Skip bare company chips in “pipeline check” sections that are not new open roles unless they clearly include a job link **and** a role title.

### LinkedIn-style text cards

Often multi-line: Title → Company → Location → “View job: https://…/jobs/view/ID”.

## Quality

- One job object per distinct listing URL (dedupe by job id when obvious).
- Skip unsubscribe, preference centers, pixels, pure search result pages without a job id.
- Max ~20 jobs.
- Empty `jobs[]` only when no listing URLs exist (still set isJobNotifier if the mail is clearly a digest with missing links).

## Output

Structured JSON only via the schema. Short `reason` / notes string for logging.
