import { useState, useEffect, useRef } from 'react';

export function useTypewriter(words: string[], speed: number = 100, pause: number = 2500): string {
  const [display, setDisplay] = useState('');
  const stateRef = useRef({
    index: 0,
    char: 0,
    deleting: false,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  useEffect(() => {
    if (words.length === 0) return;

    const s = stateRef.current;
    s.index = 0;
    s.char = 0;
    s.deleting = false;

    const tick = () => {
      const word = words[s.index];

      if (!s.deleting) {
        s.char++;
        if (s.char > word.length) {
          s.deleting = true;
          setDisplay(word);
          s.timer = setTimeout(tick, pause);
          return;
        }
        setDisplay(word.substring(0, s.char));
        s.timer = setTimeout(tick, speed);
      } else {
        s.char--;
        if (s.char <= 0) {
          s.deleting = false;
          s.index = (s.index + 1) % words.length;
          s.char = 0;
          setDisplay('');
          s.timer = setTimeout(tick, speed);
          return;
        }
        setDisplay(word.substring(0, s.char));
        s.timer = setTimeout(tick, speed / 2);
      }
    };

    s.timer = setTimeout(tick, speed);

    return () => {
      if (s.timer) clearTimeout(s.timer);
    };
  }, [words, speed, pause]);

  return display;
}
