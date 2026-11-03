// Note templates for "Teach the AI", guided mode (docs/knowledge-studio.md, section 4): for each category, the
// questions a good note of that kind answers. The owner answers in their own words; a question left empty becomes a
// section marked "awaiting confirmation" that names the question, so the AI says the detail is not published instead
// of guessing. Nothing here is a fact: these are questions only. Pure, no "@" imports (the Node tests read it).

export interface TemplateSection {
  /** The section heading in the note (one subject per section: docs/knowledge-brain.md). */
  heading: string;
  /** The question the owner answers. */
  prompt: string;
  /** A hint of the kind of answer, never a value. */
  hint: string;
}

export const TEMPLATES: Record<string, TemplateSection[]> = {
  service: [
    { heading: "What it is", prompt: "What is this service, in one or two sentences?", hint: "What the client gets." },
    { heading: "Who it is for", prompt: "Who is it for?", hint: "The kind of client or event." },
    { heading: "What is included", prompt: "What is included, and what is not?", hint: "A short list." },
    { heading: "Prices and quotes", prompt: "Is a price published? If not, how is a quote given?", hint: "Only a price you publish; otherwise say how to ask." },
    { heading: "How to ask for it", prompt: "How does someone ask for it?", hint: "The page, form or email to use." },
  ],
  policy: [
    { heading: "The rule", prompt: "What is the rule?", hint: "As you would state it to a client." },
    { heading: "When it applies", prompt: "When or to whom does it apply?", hint: "Bookings, payments, a brand…" },
    { heading: "Exceptions", prompt: "Are there exceptions?", hint: "Leave empty if none are agreed." },
    { heading: "Who to contact", prompt: "Who answers questions about it?", hint: "An email or page." },
  ],
  faq: [
    { heading: "The question", prompt: "What do visitors ask, in their words?", hint: "One question per note section." },
    { heading: "The answer", prompt: "What is the answer?", hint: "Short and direct." },
    { heading: "Where to read more", prompt: "Where can they read more or ask?", hint: "A page or another note." },
  ],
  contact: [
    { heading: "Email", prompt: "Which email address should visitors use?", hint: "Exactly as published." },
    { heading: "Phone", prompt: "Is a phone number published?", hint: "Leave empty if there is none." },
    { heading: "Social accounts", prompt: "Which social accounts are official?", hint: "Names or links as published." },
    { heading: "Reply time", prompt: "How fast does the team usually reply?", hint: "Only what you can keep." },
  ],
  person: [
    { heading: "Role", prompt: "What is this person's published role?", hint: "Only what may be public." },
    { heading: "Background", prompt: "What published background should visitors know?", hint: "Experience, style, achievements." },
    { heading: "How to reach them", prompt: "How should visitors reach them?", hint: "Usually through the brand, not directly." },
  ],
  topic: [
    { heading: "Summary", prompt: "What should visitors know about this subject?", hint: "The main facts." },
    { heading: "Details", prompt: "Which details matter (dates, places, conditions)?", hint: "Only confirmed ones." },
    { heading: "What to do next", prompt: "What should a visitor do next?", hint: "A page, a form, an email." },
  ],
  overview: [
    { heading: "What it is", prompt: "What is this brand, in one or two sentences?", hint: "As on its page." },
    { heading: "What it offers", prompt: "What does it offer?", hint: "Its main services." },
    { heading: "Who is behind it", prompt: "Who is behind it (published names and roles)?", hint: "Only public names." },
    { heading: "Where to go next", prompt: "Where should visitors go next?", hint: "Its page, booking or contact." },
  ],
  relationship: [
    { heading: "How they connect", prompt: "How are these brands, people or projects connected?", hint: "Who manages or works with whom." },
    { heading: "What it means for a visitor", prompt: "What does this mean for a visitor?", hint: "Who to contact for what." },
  ],
};

/** The marker of a question left empty (the compiler's "awaiting confirmation" callout). */
export const pendingLine = (prompt: string) => `> [!pending] Not confirmed yet: ${prompt}`;

/**
 * The note's sections from the owner's answers, in the template's order. An empty answer becomes an "awaiting
 * confirmation" section; an answered one is the owner's words exactly (trimmed). The note's overall status (verified
 * or awaiting confirmation) is decided by the confirmation box, not here.
 */
export const templateSections = (type: string, answers: Record<string, string>): string => {
  const sections = TEMPLATES[type] ?? TEMPLATES.topic!;
  return sections
    .map((s) => {
      const answer = (answers[s.heading] ?? "").trim();
      return `## ${s.heading}\n${answer || pendingLine(s.prompt)}`;
    })
    .join("\n\n");
};

/** The owner's answers as plain text, kept as the draft's original words. */
export const answersText = (type: string, answers: Record<string, string>): string =>
  (TEMPLATES[type] ?? TEMPLATES.topic!)
    .map((s) => ((answers[s.heading] ?? "").trim() ? `${s.prompt}\n${answers[s.heading]!.trim()}` : ""))
    .filter(Boolean)
    .join("\n\n");
