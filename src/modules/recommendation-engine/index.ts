import type { CheckResult, Recommendation, RecommendationPriority } from "@/types";

interface RecommendationRule {
  title: string;
  description: string;
  priority: RecommendationPriority;
}

const RECOMMENDATION_RULES: Record<string, RecommendationRule> = {
  description: {
    title: "Add a repository description",
    description:
      "A clear description helps visitors understand what your project does immediately without having to read the source code or README.",
    priority: "high",
  },
  topics: {
    title: "Add repository topics",
    description:
      "Topics make your repository discoverable and help classify your project by its technologies and purpose.",
    priority: "medium",
  },
  homepage: {
    title: "Link to a homepage or demo",
    description:
      "If this project is deployed or has a dedicated documentation site, linking it in the 'About' section makes it much easier to explore.",
    priority: "high",
  },
  license: {
    title: "Add a license",
    description:
      "Without a license, default copyright laws apply, meaning others cannot legally use or modify your work. Choose an open-source license to clarify permissions.",
    priority: "high",
  },
  "recent-activity": {
    title: "Update or archive the repository",
    description:
      "There has been no activity in the last 12 months. Consider archiving it if it is complete or abandoned, or push a small update to show it is still maintained.",
    priority: "low",
  },
  readme: {
    title: "Add a README.md",
    description:
      "A README is the entry point to your project. It is the single most important document for explaining what the project is, why it exists, and how to use it.",
    priority: "high",
  },
  "readme-purpose": {
    title: "Explain the project purpose",
    description:
      "Add a short 'About' or 'Overview' section to your README that explains what problem this project solves.",
    priority: "high",
  },
  "readme-setup": {
    title: "Document setup instructions",
    description:
      "Add a 'Getting Started' or 'Installation' section explaining how someone else can run this project locally.",
    priority: "high",
  },
  "readme-usage": {
    title: "Add usage examples",
    description:
      "Show how to use the project with code snippets, command line examples, or expected outputs.",
    priority: "medium",
  },
  "readme-screenshots-demo": {
    title: "Add screenshots or a demo link",
    description:
      "Visuals help visitors quickly grasp what a UI or CLI tool looks like without having to install it.",
    priority: "high",
  },
  "readme-tech-stack": {
    title: "List the technologies used",
    description:
      "A brief 'Tech Stack' or 'Built With' section helps recruiters and other developers immediately understand the architecture.",
    priority: "medium",
  },
  "readme-testing": {
    title: "Document testing commands",
    description:
      "Explain how to run the test suite so contributors know how to verify their changes.",
    priority: "medium",
  },
  "readme-roadmap": {
    title: "Add a roadmap or future plans",
    description:
      "Documenting known limitations or planned features shows that you have thought beyond the current implementation.",
    priority: "low",
  },
  "build-manifest": {
    title: "Commit a build manifest",
    description:
      "No package.json, pyproject.toml, Cargo.toml, or equivalent was found. A manifest is essential for defining dependencies.",
    priority: "high",
  },
  lockfile: {
    title: "Commit a dependency lockfile",
    description:
      "Lockfiles (like package-lock.json or yarn.lock) ensure that builds are reproducible by pinning exact dependency versions.",
    priority: "high",
  },
  dockerfile: {
    title: "Add a Dockerfile",
    description:
      "For backend or full-stack projects, a Dockerfile makes it significantly easier for others to run the project in an isolated environment.",
    priority: "medium",
  },
  "github-actions": {
    title: "Set up Continuous Integration",
    description:
      "Adding a GitHub Actions workflow to run your tests or linter on every push gives readers confidence in the project's stability.",
    priority: "medium",
  },
  "tests-present": {
    title: "Add automated tests",
    description:
      "Adding even a few basic unit tests demonstrates a commitment to code quality and maintainability.",
    priority: "medium",
  },
  "security-md": {
    title: "Add a SECURITY.md",
    description:
      "A brief security policy explains how vulnerabilities should be reported, which is good practice for public repositories.",
    priority: "low",
  },
  "env-example": {
    title: "Add a .env.example file",
    description:
      "A committed .env.example file safely documents which environment variables are required to run the project without exposing secrets.",
    priority: "medium",
  },
  "docs-folder": {
    title: "Create a docs folder",
    description:
      "As projects grow, moving detailed documentation (like architecture or deployment guides) into a dedicated docs/ folder keeps the README clean.",
    priority: "low",
  },
};

const PRIORITY_WEIGHTS: Record<RecommendationPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function generateRecommendations(checks: CheckResult[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const check of checks) {
    if (check.status === "failed") {
      const rule = RECOMMENDATION_RULES[check.id];
      if (rule) {
        recommendations.push({
          id: `rec-${check.id}`,
          checkId: check.id,
          title: rule.title,
          description: rule.description,
          priority: rule.priority,
        });
      }
    }
  }

  // Sort by priority (high -> medium -> low)
  return recommendations.sort((a, b) => {
    return PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
  });
}
