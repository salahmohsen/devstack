import { useIntersection } from "@/shared/providers/intersection.provider";

import { useGetDefaultResumeQuery, useGetPortfolioListQuery } from "@/features/portfolio";

import { Contact } from "@/pages/home-page/ui/contact";

export const HomeNav = ({ username }: { username: string }) => {
  const portfolioQuery = useGetPortfolioListQuery(username);
  const defaultResumeQuery = useGetDefaultResumeQuery(username);
  const defaultResume = defaultResumeQuery.data;

  const navItems: (string | [string, string])[] = ["projects", "experience", "certificates"];

  if (defaultResume) {
    navItems.push([
      "Resume",
      `/api/resume/download/?id=${defaultResume.id}&username=${encodeURIComponent(username)}`
    ]);
  }

  return (
    <nav className="relative hidden min-w-max lg:block" aria-label="In-page jump links relative">
      <ul className="mt-16 w-max">
        {navItems.map((el, i) => (
          <NavItem name={el} key={i} />
        ))}
      </ul>
      {portfolioQuery.data?.contacts ? <Contact contacts={portfolioQuery.data.contacts} /> : null}
    </nav>
  );
};

const NavItem = ({ name }: { name: string | [string, string] }) => {
  const liveName = typeof name === "string" ? name : name[0];

  const hash = typeof name === "string" ? `#${name.replace(/\s/g, "").toLowerCase()}` : name[1];
  const isExternal = typeof name !== "string";

  const { sectionIntersectedName, isIntersecting } = useIntersection();
  const active = sectionIntersectedName === hash && isIntersecting;
  return (
    <li>
      <a
        className={`group flex items-center py-3`}
        href={hash}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer noopener" : undefined}
      >
        <span
          className={`${active ? "w-16 bg-accent" : "w-8 bg-muted"} mr-4 h-px transition-all duration-200 ease-in-out group-hover:w-16 group-hover:bg-night group-focus-visible:w-16 group-focus-visible:bg-night dark:group-hover:bg-light dark:group-focus-visible:bg-light`}
        ></span>
        <span
          className={`${active ? "text-night dark:text-light" : "text-night/50 dark:text-light/50"} dark:text-nightFaded text-xs font-bold tracking-widest uppercase group-hover:text-night group-focus-visible:text-night dark:group-hover:text-light dark:group-focus-visible:text-light`}
        >
          {liveName}
        </span>
      </a>
    </li>
  );
};
