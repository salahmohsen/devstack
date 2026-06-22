import { useIntersection } from "@/shared/providers/intersection.provider";

import { Contact } from "@/pages/home-page/ui/contact";

const navItems = [
  "projects",
  "experience",
  "certificates",
  ["Full Résumé", "/salahmohsen_frontend_resume.pdf"]
];

export const HomeNav = () => (
  <nav className="relative hidden min-w-max lg:block" aria-label="In-page jump links relative">
    <ul className="mt-16 w-max">
      {navItems.map((el, i) => (
        <NavItem name={el} key={i} />
      ))}
    </ul>
    <Contact />
  </nav>
);

const NavItem = ({ name }: { name: string | string[] }) => {
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
          className={`${active ? "w-16 bg-accent" : "w-8 bg-muted"} group-hover:bg-night group-focus-visible:bg-night dark:group-hover:bg-light dark:group-focus-visible:bg-light mr-4 h-px transition-all duration-200 ease-in-out group-hover:w-16 group-focus-visible:w-16`}
        ></span>
        <span
          className={`${active ? "text-night dark:text-light" : "text-night/50 dark:text-light/50"} group-hover:text-night group-focus-visible:text-night dark:text-nightFaded dark:group-hover:text-light dark:group-focus-visible:text-light text-xs font-bold tracking-widest uppercase`}
        >
          {liveName}
        </span>
      </a>
    </li>
  );
};
