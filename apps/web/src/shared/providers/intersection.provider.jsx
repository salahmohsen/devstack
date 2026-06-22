import { createContext, useContext, useState } from "react";

const IntersectionContext = createContext();

export const IntersectionProvider = ({ children }) => {
  const [sectionIntersectedName, setSectionIntersectedName] = useState("#about");
  const [isIntersecting, setIsIntersecting] = useState(false);

  return (
    <IntersectionContext.Provider
      value={{
        sectionIntersectedName,
        setSectionIntersectedName,
        isIntersecting,
        setIsIntersecting
      }}
    >
      {children}
    </IntersectionContext.Provider>
  );
};

export const useIntersection = () => useContext(IntersectionContext);
