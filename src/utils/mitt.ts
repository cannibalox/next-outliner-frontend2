import _mitt, { type EventType } from "mitt";

const mitt = <EVENTS extends Record<EventType, unknown>>() => {
  const emitter = _mitt<EVENTS>();

  return Object.assign(emitter, {
    once: (type: keyof EVENTS, listener: (event: EVENTS[keyof EVENTS]) => void) => {
      const fn = (event: EVENTS[keyof EVENTS]) => {
        emitter.off(type, fn);
        listener(event);
      };
      emitter.on(type, fn);
    },
  });
};

export default mitt;
