import { describe, expect, it } from "vitest";

import { isThinJobDescription } from "#@/application/apply-package";
import {
  decodeJsStringLiteral,
  extractEmbeddedJobJson,
  extractJobListingStructured,
  pickBetterListingDescription,
  scoreListingDescription,
  stripListingChromeFromText
} from "#@/common/extract-job-listing-page";
import { defaultJobPreference } from "#@/job-preference/utils";
import {
  canonicalizeJobUrl,
  extractPublicJobListingFromHtml,
  extractPublicJobListingFromHtmlAsync,
  HarvestedJobSchema,
  harvestJobsFromHtmlAnchors,
  harvestJobsFromMail,
  harvestJobsFromMailBody,
  inferSourceLabelFromUrl,
  isClosedJobListingHtml,
  isClosedJobListingText,
  isValidHarvestedJob,
  mergeJobListingExtract,
  normalizeHarvestApplyMethod,
  parseLinkedInHiringTitle,
  rankJobUrl,
  resolveApplicationSourceFields,
  scoreJobAgainstPreference
} from "#@/mail/job-harvest";

const LINKEDIN_DIGEST = {
  fromEmail: "jobalerts-noreply@linkedin.com",
  subject: "Frontend Lead – React Native at QNBeyond Plus",
  bodyText: `Your job alert for frontend developer in Cairo            
Frontend Lead – React Native
QNBeyond Plus
Cairo, Egypt
Apply with resume & profile
View job: https://www.linkedin.com/comm/jobs/view/4443683970/?trackingId=P%2Bl1q52p1yrPF7miFi2weg%3D%3D&refId=eq25cGj%2Fajoe2CPo%2F7gDbg%3D%3D

---------------------------------------------------------
  
            
Senior Frontend Developer (Angular)
Confidential
Egypt

This company is actively hiring
Apply with resume & profile
View job: https://www.linkedin.com/comm/jobs/view/4444144767/?trackingId=oVUYe%2FlUi4XPJJCI6HnJQw%3D%3D

---------------------------------------------------------
  
            
 Software Engineer - ElectronJS, Desktop (Remote)
Quik Hire Staffing
Egypt
View job: https://www.linkedin.com/comm/jobs/view/4446722402/?trackingId=IC4zwTPb5JPNRozkMYR8%2Bg%3D%3D
`,
  bodyHtml: null as string | null
};

const HIRING_SUGGESTIONS = {
  fromEmail: "jobs-noreply@linkedin.com",
  subject: "Storyteller is hiring for a Remote role",
  bodyText: `Expand your search

Recommendations based on your activity.
  

            
Remote jobs
https://www.linkedin.com/comm/jobs/search-results/?keywords=junior+software+engineer+remote

      
Junior Web Developer
Storyteller
Egypt
View job: https://www.linkedin.com/comm/jobs/view/4446392638/?trackingId=VhlhGeNmEP8b8b3bxqibPQ%3D%3D

---------------------------------------------------------
  
      
Front-End Software Developer
exequt
Cairo
View job: https://www.linkedin.com/comm/jobs/view/4444247981/?trackingId=a084zTyh1YYsrzjl99Dwjw%3D%3D
`,
  bodyHtml: null as string | null
};

const APPLY_NOW = {
  fromEmail: "jobs-noreply@linkedin.com",
  subject: "Salah, apply now to 'Junior Software Engineer — Remote, Egypt'",
  bodyText: `Your saved job at MixRank is still available.

      
Junior Software Engineer — Remote, Egypt
MixRank
Egypt
View job: https://www.linkedin.com/comm/jobs/view/4415454308?trackingId=&refId=

---------------------------------------------------------
  
      
Apply now

      https://www.linkedin.com/comm/jobs/view/4415454308?lipi=foo
      


    


Your other saved jobs        
Senior Frontend Engineer
Yassir
Cairo, Cairo, Egypt
View job: https://www.linkedin.com/comm/jobs/view/4440801290?trackingId=&refId=
`,
  bodyHtml: null as string | null
};

const JACK_AND_JILL_DIGEST = {
  fromEmail: "jack@jackandjill.ai",
  subject: "4 new senior frontend roles (Paires, Synapse Analytics, & more)",
  bodyText:
    "New matches for you: Design Engineer at Paires : Fully remote. Senior Frontend Engineer at Synapse Analytics : Hybrid.",
  bodyHtml: `<h3>New matches for you:</h3>
<ul>
<li><a href="https://app.jackandjill.ai/jobs/65c9502b-2144-41d5-b62a-50ef8ac6ccb0/post?source=email&amp;campaign=jack_agent">Design Engineer at Paires</a>: Fully remote. You'd own the frontend architecture.</li>
<li><a href="https://app.jackandjill.ai/jobs/b5cfdb2a-a67f-47ae-8e11-ee4a9826e979/post?source=email&amp;campaign=jack_agent">Senior Frontend Engineer at Synapse Analytics</a>: Based in Maadi, Cairo (Hybrid).</li>
<li><a href="https://app.jackandjill.ai/jobs/d8b63f97-4853-4960-98c0-8d00f54cd176/post?source=email&amp;campaign=jack_agent">Frontend Lead at Talent-360.me</a>: Based in New Cairo (Hybrid).</li>
<li><a href="https://app.jackandjill.ai/jobs/8166d8a8-0359-4a7b-98f6-fbdbda7e2828/post?source=email&amp;campaign=jack_agent">Senior Front-End Engineer at Yassir</a>: Alexandria-based (Hybrid).</li>
</ul>
<h3>Pipeline check</h3>
<p>You also have <a href="https://app.jackandjill.ai/jobs/4524e1f2-f639-422d-ac5d-7547f265a52f/post?source=email&amp;campaign=jack_agent">HumanI</a> sitting in Saved.</p>`
};

describe("canonicalizeJobUrl", () => {
  it("rewrites LinkedIn /comm/jobs/view/{id} to the guest jobs/view URL", () => {
    const raw =
      "https://www.linkedin.com/comm/jobs/view/4443683970/?trackingId=abc&refId=xyz&lipi=foo";
    expect(canonicalizeJobUrl(raw)).toBe("https://www.linkedin.com/jobs/view/4443683970");
  });

  it("rewrites LinkedIn search-results currentJobId to the guest jobs/view URL", () => {
    const raw =
      "https://www.linkedin.com/jobs/search-results/?currentJobId=4440801290&origin=QUALIFICATION_LANDING";
    expect(canonicalizeJobUrl(raw)).toBe("https://www.linkedin.com/jobs/view/4440801290");
  });

  it("normalizes an already-guest LinkedIn listing URL", () => {
    expect(canonicalizeJobUrl("https://linkedin.com/jobs/view/4452452790/")).toBe(
      "https://www.linkedin.com/jobs/view/4452452790"
    );
  });

  it("still strips tracking params on non-LinkedIn hosts", () => {
    expect(
      canonicalizeJobUrl("https://app.jackandjill.ai/jobs/abc?utm_source=email&utm_medium=digest")
    ).toBe("https://app.jackandjill.ai/jobs/abc");
  });
});

describe("harvestJobsFromHtmlAnchors — Jack and Jill digests", () => {
  it("parses Title at Company anchors with listing URLs", () => {
    const jobs = harvestJobsFromHtmlAnchors(JACK_AND_JILL_DIGEST);
    expect(jobs.length).toBe(4);
    const paires = jobs.find((j) => j.companyName === "Paires");
    expect(paires?.title).toBe("Design Engineer");
    expect(paires?.listingUrl).toContain("jackandjill.ai/jobs/65c9502b");
    expect(paires?.workMode).toBe("remote");
    expect(rankJobUrl(paires!.listingUrl)).toBeGreaterThanOrEqual(70);
    expect(isValidHarvestedJob(paires!)).toBe(true);
    // Pipeline company-only chips are skipped
    expect(jobs.every((j) => j.companyName !== "HumanI")).toBe(true);
  });

  it("harvestJobsFromMail merges HTML anchors when body text has no URLs", () => {
    const jobs = harvestJobsFromMail(JACK_AND_JILL_DIGEST);
    expect(jobs.length).toBe(4);
  });
});

describe("harvestJobsFromMailBody — multi-line LinkedIn cards", () => {
  it("parses title, company, location, easy_apply from classic digest", () => {
    const jobs = harvestJobsFromMailBody(LINKEDIN_DIGEST);
    expect(jobs.length).toBeGreaterThanOrEqual(3);

    const first = jobs.find((j) => j.listingUrl.includes("4443683970"));
    expect(first).toBeDefined();
    expect(first!.title).toBe("Frontend Lead – React Native");
    expect(first!.companyName).toBe("QNBeyond Plus");
    expect(first!.location).toMatch(/Cairo|Egypt/i);
    expect(first!.applyMethod).toBe("easy_apply");
    expect(first!.source).toBe("linkedin");
    expect(isValidHarvestedJob(first!)).toBe(true);

    const angular = jobs.find((j) => j.listingUrl.includes("4444144767"));
    expect(angular?.title).toContain("Senior Frontend Developer");
    expect(angular?.companyName).toBe("Confidential");
  });

  it("parses facet suggestions without using subject as title", () => {
    const jobs = harvestJobsFromMailBody(HIRING_SUGGESTIONS);
    expect(jobs.every((j) => !/is hiring for a/i.test(j.title))).toBe(true);
    const story = jobs.find((j) => j.listingUrl.includes("4446392638"));
    expect(story?.title).toBe("Junior Web Developer");
    expect(story?.companyName).toBe("Storyteller");
    expect(story?.location).toBe("Egypt");
  });

  it("parses saved-job reminder cards", () => {
    const jobs = harvestJobsFromMailBody(APPLY_NOW);
    const mix = jobs.find((j) => j.listingUrl.includes("4415454308"));
    expect(mix?.title).toMatch(/Junior Software Engineer/i);
    expect(mix?.companyName).toBe("MixRank");
    expect(mix?.location).toBe("Egypt");
    // same job id only once
    expect(jobs.filter((j) => j.listingUrl.includes("4415454308")).length).toBe(1);
    const yassir = jobs.find((j) => j.listingUrl.includes("4440801290"));
    expect(yassir?.title).toBe("Senior Frontend Engineer");
    expect(yassir?.companyName).toBe("Yassir");
  });
});

describe("HarvestedJobSchema LLM coercion", () => {
  it("accepts company alias and Unknown applyMethod casing", () => {
    const parsed = HarvestedJobSchema.safeParse({
      listingUrl: "https://app.jackandjill.ai/jobs/26e1df7c-bf89-48ed-9802-686b545b8a97/post",
      title: "Senior Front-End Engineer (React)",
      company: "Symbiotic",
      location: "Unknown",
      applyMethod: "Unknown",
      description: "Unknown",
      pageAccess: "Login wall"
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.companyName).toBe("Symbiotic");
    expect(parsed.data.applyMethod).toBe("unknown");
    expect(parsed.data.title).toBe("Senior Front-End Engineer (React)");
  });

  it("normalizes Easy Apply labels", () => {
    expect(normalizeHarvestApplyMethod("Easy Apply")).toBe("easy_apply");
    expect(normalizeHarvestApplyMethod("EXTERNAL")).toBe("external");
  });
});

describe("scoreJobAgainstPreference", () => {
  const prefs = {
    ...defaultJobPreference(),
    workModes: ["remote" as const],
    roleKeywords: ["frontend", "react", "engineer", "developer", "software"],
    minMatchScore: 40
  };

  it("scores frontend title highly", () => {
    const r = scoreJobAgainstPreference(
      {
        title: "Senior Frontend Engineer",
        companyName: "Acme",
        location: "Remote",
        listingUrl: "https://www.linkedin.com/jobs/view/1",
        applyUrl: null,
        applyMethod: "easy_apply",
        workMode: "remote",
        source: "linkedin"
      },
      { ...prefs, workModes: ["remote"] }
    );
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(70);
  });

  it("rejects non-matching titles when keywords set", () => {
    const r = scoreJobAgainstPreference(
      {
        title: "Graphic Designer",
        companyName: "Studio",
        location: "Cairo",
        listingUrl: "https://www.linkedin.com/jobs/view/2",
        applyUrl: null,
        applyMethod: "unknown",
        workMode: null,
        source: "linkedin"
      },
      { ...prefs, workModes: ["remote"] }
    );
    expect(r.passed).toBe(false);
  });

  it("rejects garbage titles", () => {
    const r = scoreJobAgainstPreference(
      {
        title: "Storyteller is hiring for a Remote role",
        companyName: "Unknown company",
        listingUrl: "https://www.linkedin.com/jobs/view/3",
        applyUrl: null,
        applyMethod: "unknown",
        source: "linkedin"
      },
      { ...prefs, workModes: ["remote"] }
    );
    expect(r.passed).toBe(false);
  });

  it("treats multi workModes as OR (any preferred mode matches)", () => {
    const multi = {
      ...defaultJobPreference(),
      workModes: ["remote" as const, "hybrid" as const],
      minMatchScore: 40
    };
    const baseJob = {
      title: "Software Engineer",
      companyName: "Acme",
      location: "Berlin",
      listingUrl: "https://www.linkedin.com/jobs/view/10",
      applyUrl: null,
      applyMethod: "external" as const,
      source: "linkedin" as const
    };

    const hybrid = scoreJobAgainstPreference({ ...baseJob, workMode: "hybrid" }, multi);
    expect(hybrid.reasons.some((r) => r.includes("matches preferred"))).toBe(true);
    expect(hybrid.score).toBeGreaterThanOrEqual(60);

    const remote = scoreJobAgainstPreference({ ...baseJob, workMode: "remote" }, multi);
    expect(remote.reasons.some((r) => r.includes("matches preferred"))).toBe(true);

    const onsite = scoreJobAgainstPreference({ ...baseJob, workMode: "onsite" }, multi);
    expect(onsite.reasons.some((r) => r.includes("not in preferred"))).toBe(true);
    expect(onsite.score).toBeLessThan(hybrid.score);
  });

  it("does not filter by work mode when workModes is empty", () => {
    const open = {
      ...defaultJobPreference(),
      minMatchScore: 40
    };
    const r = scoreJobAgainstPreference(
      {
        title: "Engineer",
        companyName: "Acme",
        location: "NYC",
        listingUrl: "https://www.linkedin.com/jobs/view/11",
        applyUrl: null,
        applyMethod: "unknown",
        workMode: "onsite",
        source: "linkedin"
      },
      open
    );
    expect(r.reasons.every((reason) => !reason.includes("work mode"))).toBe(true);
  });

  const frontendEvidence = {
    roleTitles: ["Senior Frontend Engineer", "Full Stack Developer"],
    organizations: ["Acme"],
    stackNames: ["React", "TypeScript", "Next.js", "Node.js"],
    featuredStackNames: ["React", "TypeScript"],
    projectTitles: ["Personal Hub"]
  };

  const openPrefs = defaultJobPreference();

  it("passes a profile-aligned role when preferences are open", () => {
    const r = scoreJobAgainstPreference(
      {
        title: "Senior React Engineer",
        companyName: "Linear",
        location: "Remote",
        listingUrl: "https://www.linkedin.com/jobs/view/20",
        applyUrl: null,
        applyMethod: "easy_apply",
        workMode: "remote",
        source: "linkedin",
        description: "Build product UI with React and TypeScript."
      },
      openPrefs,
      frontendEvidence
    );
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.reasons.some((reason) => /stack|experience|featured/i.test(reason))).toBe(true);
  });

  it("rejects orthogonal careers when profile evidence exists", () => {
    const nurse = scoreJobAgainstPreference(
      {
        title: "Registered Nurse",
        companyName: "City Hospital",
        location: "Cairo",
        listingUrl: "https://www.linkedin.com/jobs/view/21",
        applyUrl: null,
        applyMethod: "unknown",
        workMode: "onsite",
        source: "linkedin"
      },
      openPrefs,
      frontendEvidence
    );
    expect(nurse.passed).toBe(false);
    expect(nurse.reasons).toContain("no profile evidence fit");

    const sales = scoreJobAgainstPreference(
      {
        title: "Enterprise Account Executive",
        companyName: "SaaS Co",
        location: "NYC",
        listingUrl: "https://www.linkedin.com/jobs/view/22",
        applyUrl: null,
        applyMethod: "unknown",
        workMode: "hybrid",
        source: "linkedin"
      },
      openPrefs,
      frontendEvidence
    );
    expect(sales.passed).toBe(false);
  });

  it("does not let profile stacks override an explicit role-keyword miss", () => {
    const r = scoreJobAgainstPreference(
      {
        title: "Registered Nurse",
        companyName: "Clinic",
        listingUrl: "https://www.linkedin.com/jobs/view/23",
        applyUrl: null,
        applyMethod: "unknown",
        source: "linkedin",
        description: "We use React internally."
      },
      { ...prefs, roleKeywords: ["frontend", "react"] },
      frontendEvidence
    );
    expect(r.passed).toBe(false);
    expect(r.reasons).toContain("no role keyword in title");
  });
});

describe("HarvestedJobSchema source coerce", () => {
  it("accepts free-text source as sourceLabel and nulls enum", () => {
    const parsed = HarvestedJobSchema.safeParse({
      title: "Fullstack Developer",
      companyName: "EY",
      listingUrl:
        "https://app.jackandjill.ai/jobs/e98c1955-b37c-40d1-b341-a135a70042c7/post?source=email",
      applyMethod: "unknown",
      source: "Jack & Jill AI"
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.source).toBeNull();
    expect(parsed.data.sourceLabel).toBe("Jack & Jill AI");
  });

  it("keeps valid enum source", () => {
    const parsed = HarvestedJobSchema.safeParse({
      title: "Engineer",
      companyName: "Acme",
      listingUrl: "https://www.linkedin.com/jobs/view/1",
      source: "linkedin"
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.source).toBe("linkedin");
  });
});

describe("resolveApplicationSourceFields", () => {
  it("maps jackandjill host to other + label", () => {
    const r = resolveApplicationSourceFields({
      listingUrl: "https://app.jackandjill.ai/jobs/1",
      modelSourceLabel: "Should not win"
    });
    expect(r.source).toBe("other");
    expect(r.sourceLabel).toBe("Jack & Jill");
    expect(inferSourceLabelFromUrl("https://app.jackandjill.ai/jobs/1")).toBe("Jack & Jill");
  });

  it("uses model label only when host unknown", () => {
    const r = resolveApplicationSourceFields({
      listingUrl: "https://careers.example-unknown-ats.xyz/jobs/1",
      modelSourceLabel: "Custom ATS"
    });
    expect(r.source).toBe("other");
    expect(r.sourceLabel).toBe("Custom ATS");
  });
});

describe("LinkedIn guest page extract", () => {
  it("parses hiring title meta", () => {
    const r = parseLinkedInHiringTitle(
      "Storyteller hiring Junior Web Developer in Egypt | LinkedIn"
    );
    expect(r.companyName).toBe("Storyteller");
    expect(r.title).toBe("Junior Web Developer");
    expect(r.location).toBe("Egypt");
  });

  it("extracts role, company, and description from guest HTML", () => {
    const html = `
      <html><head>
        <title>Storyteller hiring Junior Web Developer in Egypt | LinkedIn</title>
        <meta property="og:title" content="Storyteller hiring Junior Web Developer in Egypt | LinkedIn">
        <meta property="og:description" content="Posted 10:26:05 PM. Up to EUR 15,000 salary. See this and similar jobs on LinkedIn.">
      </head><body>
        <h1 class="top-card-layout__title font-sans">Junior Web Developer</h1>
        <a class="topcard__org-name-link topcard__flavor--black-link" href="/company/x">Storyteller</a>
        <span class="topcard__flavor--bullet">Egypt</span>
        <div class="show-more-less-html__markup">
          <p>Up to EUR 15,000 salary on a full time, permanent employment contract</p>
          <p>Fully remote working anywhere in Egypt!</p>
          <p>ABOUT US Storyteller is a high growth product company.</p>
        </div>
      </body></html>`;
    const e = extractPublicJobListingFromHtml(
      html,
      "https://www.linkedin.com/jobs/view/4446392638/"
    );
    expect(e.title).toBe("Junior Web Developer");
    expect(e.companyName).toBe("Storyteller");
    expect(e.location).toBe("Egypt");
    expect(e.description).toMatch(/EUR 15,000/);
    expect(e.description).toMatch(/ABOUT US/);
    expect(e.source).toBe("linkedin");
    expect(e.workMode).toBe("remote");
  });

  it("reads Yassir guest criteria (Full-time) and decodes apostrophes without inventing Hybrid", () => {
    const html = `
      <html><head>
        <title>Yassir hiring Senior Frontend Engineer in Cairo, Cairo, Egypt | LinkedIn</title>
        <meta property="og:title" content="Yassir hiring Senior Frontend Engineer in Cairo, Cairo, Egypt | LinkedIn">
        <meta property="og:site_name" content="LinkedIn">
      </head><body>
        <h1 class="top-card-layout__title">Senior Frontend Engineer</h1>
        <a class="topcard__org-name-link topcard__flavor--black-link">Yassir</a>
        <span class="topcard__flavor--bullet">Cairo, Cairo, Egypt</span>
        <div class="show-more-less-html__markup">
          <p>About Your Role As Frontend Developer. Design and build web applications using React.js</p>
          <p>Must have technical skills with at least 5 years of experience. Language: Javascript. Framework: React.JS</p>
          <p>Nice to have technical skills. Caching, Redis server.</p>
          <p>Don&apos;t just apply for a job, come and be a part of our journey.</p>
        </div>
        <ul class="description__job-criteria-list">
          <li class="description__job-criteria-item">
            <h3 class="description__job-criteria-subheader">Employment type</h3>
            <span class="description__job-criteria-text">Full-time</span>
          </li>
          <li class="description__job-criteria-item">
            <h3 class="description__job-criteria-subheader">Job function</h3>
            <span class="description__job-criteria-text">Engineering and Information Technology</span>
          </li>
        </ul>
      </body></html>`;
    const e = extractPublicJobListingFromHtml(
      html,
      "https://www.linkedin.com/jobs/view/4440801290/"
    );
    expect(e.companyName).toBe("Yassir");
    expect(e.title).toBe("Senior Frontend Engineer");
    expect(e.employmentType).toBe("full_time");
    expect(e.department).toMatch(/Engineering/);
    expect(e.workMode ?? null).toBeNull();
    expect(e.description).toMatch(/Don't just apply/);
    expect(e.description).not.toMatch(/&apos;/);
    expect(e.experience).toMatch(/5 years/i);
  });

  it("does not keep Similar jobs carousel text in the description", () => {
    const realJd = `
      At BairesDev®, we've been leading the way in technology projects for over 15 years.
      We deliver cutting-edge solutions to giants like Google and the most innovative startups.
      Semi Senior React Developer at BairesDev
      Join our development team as a Semi Senior React Developer to build complex web applications.
      What You'll Do: Devise practical React-based solutions, debug complex issues, code reviews.
      Here's What We Are Looking For: 3+ years of React, TypeScript, and modern frontend tooling.
    `.repeat(2);
    const html = `
      <html><body>
        <h1 class="top-card-layout__title">Semi Senior React Developer - Remote Work | REF#296501</h1>
        <a class="topcard__org-name-link">BairesDev</a>
        <span class="topcard__flavor--bullet">Cairo, Cairo, Egypt</span>
        <div class="description__text description__text--rich">
          <section class="show-more-less-html">
            <div class="show-more-less-html__markup show-more-less-html__markup--clamp-after-5">
              ${realJd}
            </div>
          </section>
        </div>
        <p>Referrals increase your chances of interviewing at BairesDev by 2x</p>
        <section class="similar-jobs">
          <h2>Similar jobs</h2>
          <ul>
            <li>Semi Senior React Developer - Remote Work | REF#296505 BairesDev Egypt</li>
            <li>Senior Frontend Engineer Zeal New Cairo</li>
            <li>Frontend Engineer Bayzat Cairo</li>
            <li>Senior Front-End Engineer exequt MENA Cairo</li>
            <li>Senior Front-End Engineer exequt Cairo</li>
            <li>Front End Engineer NoGood Egypt</li>
          </ul>
        </section>
        <section><h2>People also viewed</h2><p>Explore top content on LinkedIn</p></section>
      </body></html>`;

    const e = extractPublicJobListingFromHtml(
      html,
      "https://www.linkedin.com/jobs/view/4435341357/"
    );
    expect(e.title).toMatch(/Semi Senior React/);
    expect(e.companyName).toBe("BairesDev");
    expect(e.description).toMatch(/BairesDev®/);
    expect(e.description).toMatch(/What You'll Do/);
    expect(e.description).not.toMatch(/Similar jobs/i);
    expect(e.description).not.toMatch(/People also viewed/i);
    expect(e.description).not.toMatch(/Referrals increase your chances/i);
    expect(e.description).not.toMatch(/exequt MENA/);
    expect(e.description).not.toMatch(/Bayzat/);

    // Quality scoring prefers clean body over longer chrome-filled text
    const chromeHeavy =
      `${realJd}\n\nSimilar jobs\nSenior Frontend Engineer Zeal\nFrontend Engineer Bayzat\n`.repeat(
        3
      );
    expect(scoreListingDescription(realJd)).toBeGreaterThan(scoreListingDescription(chromeHeavy));
    expect(pickBetterListingDescription(chromeHeavy, realJd)).toMatch(/What You'll Do/);
    expect(stripListingChromeFromText(chromeHeavy)).not.toMatch(/Similar jobs/i);
  });

  it("async extract does not let Readability chrome beat guest markup", async () => {
    const realJd =
      "At BairesDev we build complex React applications for enterprise clients. ".repeat(20) +
      "Requirements include TypeScript, testing, and mentoring junior developers.";
    const html = `
      <html><head><title>BairesDev hiring Semi Senior React Developer | LinkedIn</title>
      <meta property="og:description" content="Posted yesterday. Short teaser. See this and similar jobs on LinkedIn.">
      </head><body>
        <h1 class="top-card-layout__title">Semi Senior React Developer</h1>
        <a class="topcard__org-name-link">BairesDev</a>
        <div class="show-more-less-html__markup">${realJd}</div>
        <section class="similar-jobs"><h2>Similar jobs</h2>
          ${"Senior Frontend Engineer at OtherCo Egypt. ".repeat(40)}
        </section>
      </body></html>`;
    const e = await extractPublicJobListingFromHtmlAsync(
      html,
      "https://www.linkedin.com/jobs/view/4435341357/"
    );
    expect(e.description).toMatch(/BairesDev we build/);
    expect(e.description).not.toMatch(/Similar jobs/i);
    expect(e.description).not.toMatch(/OtherCo/);
  });

  it("fills empty seed description from extract", () => {
    const seed = {
      title: "Junior Web Developer",
      companyName: "Storyteller",
      location: "Egypt",
      listingUrl: "https://www.linkedin.com/jobs/view/4446392638/",
      applyUrl: null,
      applyMethod: "unknown" as const,
      description: null,
      source: "linkedin" as const
    };
    const merged = mergeJobListingExtract(seed, {
      description: "Full posting body with requirements and benefits."
    });
    expect(merged.description).toMatch(/Full posting body/);
  });

  it("marks LinkedIn closed-job guest card as listingClosed", () => {
    // Mirrors https://www.linkedin.com/jobs/view/4446737057/ closed banner
    const html = `
      <html><head>
        <title>Hire Feed hiring React Native Developer (Remote) in Egypt | LinkedIn</title>
        <meta property="og:title" content="Hire Feed hiring React Native Developer (Remote) in Egypt | LinkedIn">
      </head><body>
        <h1 class="top-card-layout__title">React Native Developer (Remote)</h1>
        <a class="topcard__org-name-link">Hire Feed</a>
        <figure class="closed-job closed-job__flavor topcard__flavor-row">
          <span class="closed-job__icon closed-job__icon--error-pebble lazy-load"></span>
          <figcaption class="closed-job__flavor--closed">No longer accepting applications</figcaption>
        </figure>
        <div class="show-more-less-html__markup">
          <p>Role: React Native Developer (Remote). Location: Remote.</p>
        </div>
      </body></html>`;
    expect(isClosedJobListingHtml(html)).toBe(true);
    const e = extractPublicJobListingFromHtml(
      html,
      "https://www.linkedin.com/jobs/view/4446737057/"
    );
    expect(e.listingClosed).toBe(true);
    expect(e.title).toBe("React Native Developer (Remote)");
    expect(e.companyName).toBe("Hire Feed");
  });

  it("does not mark open guest postings as closed", () => {
    const html = `
      <html><body>
        <h1 class="top-card-layout__title">Open Role</h1>
        <a class="topcard__org-name-link">Acme</a>
        <figcaption class="num-applicants__caption">Be among the first 25 applicants</figcaption>
        <div class="show-more-less-html__markup"><p>We are hiring a full stack engineer with React.</p></div>
      </body></html>`;
    expect(isClosedJobListingHtml(html)).toBe(false);
    expect(
      extractPublicJobListingFromHtml(html, "https://www.linkedin.com/jobs/view/1/").listingClosed
    ).toBeUndefined();
  });

  it("detects closed phrases in plain text", () => {
    expect(isClosedJobListingText("No longer accepting applications")).toBe(true);
    expect(isClosedJobListingText("This job has expired on Indeed")).toBe(true);
    expect(isClosedJobListingText("Great team, remote role, apply today")).toBe(false);
  });
});

describe("site-agnostic listing extract (JSON-LD + embedded SPA JSON)", () => {
  it("decodes \\xHH JS string escapes", () => {
    expect(decodeJsStringLiteral("\\x22hello\\x22")).toBe('"hello"');
    expect(decodeJsStringLiteral("a\\/b")).toBe("a/b");
  });

  it("extracts JobPosting from JSON-LD", () => {
    const html = `<html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        "title": "Senior Frontend Engineer",
        "description": "<p>We need a senior frontend engineer with React, TypeScript, and system design experience across large product surfaces.</p><p>Remote-friendly team with strong design partnership.</p><p>You will own complex UI systems, mentor other engineers, partner with product, and ship high-quality experiences used by thousands of customers every day.</p><p>Requirements include 5+ years building web apps, deep React knowledge, accessibility awareness, and excellent communication skills.</p>",
        "hiringOrganization": { "@type": "Organization", "name": "Acme Labs" },
        "jobLocationType": "TELECOMMUTE"
      }
      </script>
    </head><body></body></html>`;
    const e = extractJobListingStructured(html);
    expect(e.title).toBe("Senior Frontend Engineer");
    expect(e.companyName).toBe("Acme Labs");
    expect(e.workMode).toBe("remote");
    expect(e.description).toMatch(/React, TypeScript/);
    expect(e.descriptionSource).toBe("jsonld");
    expect(isThinJobDescription(e.description)).toBe(false);
  });

  it("mines full JD from JSON.parse embedded SPA payloads (any ATS)", () => {
    // Mirrors career SPAs that put the posting only inside script (visible body ~empty).
    const jobJson = JSON.stringify([
      {
        Salary: null,
        Remote_Job: true,
        Posting_Title: "Senior Frontend and UI/UX Engineer (Egypt)",
        Job_Description:
          "<html><body><p>This is a remote position.</p><ul><li>8+ years of hands-on experience in building complex and scalable frontend products using TypeScript, React, Vue.js, and Next.js.</li><li>Architect and implement robust, reusable, and maintainable frontend components and libraries.</li><li>Experience with RESTful and GraphQL APIs, state management (Tanstack Query, Redux, Zustand), and CI/CD.</li><li>Proficient understanding of Agile/Scrum methodologies and experience working in an Agile environment.</li></ul></body></html>",
        Job_Opening_Name: "Senior Frontend and UI/UX Engineer (Egypt)",
        company_name: "GamaLearn",
        Publish: true,
        id: "605103000011550001"
      }
    ]);
    const escaped = jobJson.replace(/\\/g, "\\\\").replace(/"/g, "\\x22");
    const html = `<!DOCTYPE html><html><head>
      <title>GamaLearn - Senior Frontend and UI/UX Engineer (Egypt) - Remote Job</title>
      <meta name="description" content="GamaLearn This is a remote position. 8+ years of hands-on experience truncated…" />
      <meta property="og:site_name" content="GamaLearn" />
    </head><body>
      <script>var jobs = JSON.parse('${escaped}');</script>
    </body></html>`;

    const embedded = extractEmbeddedJobJson(html);
    expect(embedded).not.toBeNull();
    expect(embedded!.title).toBe("Senior Frontend and UI/UX Engineer (Egypt)");
    expect(embedded!.companyName).toBe("GamaLearn");
    expect(embedded!.workMode).toBe("remote");
    expect(embedded!.description).toMatch(/TypeScript, React, Vue\.js/);
    expect(isThinJobDescription(embedded!.description)).toBe(false);

    const e = extractPublicJobListingFromHtml(
      html,
      "https://example.com/jobs/Careers/605103000011550001/Senior-Frontend-and-UI-UX-Engineer"
    );
    expect(e.title).toBe("Senior Frontend and UI/UX Engineer (Egypt)");
    expect(e.companyName).toBe("GamaLearn");
    expect(e.description).toMatch(/Tanstack Query/);
    expect(isThinJobDescription(e.description)).toBe(false);
  });

  it("keeps meta-only pages thin when no structured body exists", () => {
    const html = `<html><head>
      <meta name="description" content="Short teaser only." />
      <title>Some Role</title>
    </head><body>Chrome only</body></html>`;
    const e = extractJobListingStructured(html);
    expect(e.description).toBeTruthy();
    expect(isThinJobDescription(e.description ?? "")).toBe(true);
  });
});
