"use client";

// The Prototype tools bar (role switcher, layout options, "Pre-fill sample content") is design scaffolding. The testing edition
// is the registered user's flow for user testing, so the bar is not drawn: a participant cannot change role, switch layout or
// fill a form. Every screen still mounts this component, so it stays and renders nothing.
export function PrototypeTools() {
  return null;
}
