import { useState, useEffect, useRef } from 'react';

export function useActiveSection(sectionIds: string[]): string {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || '');
  const activeSectionRef = useRef(activeSection);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      const viewportCenter = window.innerHeight / 2;
      let bestSection = activeSectionRef.current;
      let bestDistance = Infinity;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const rect = entry.boundingClientRect;
          const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestSection = entry.target.id;
          }
        }
      });

      if (bestSection !== activeSectionRef.current) {
        activeSectionRef.current = bestSection;
        setActiveSection(bestSection);
      }
    };

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(handleIntersect, {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      });

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [sectionIds]);

  return activeSection;
}
