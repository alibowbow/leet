import exam2027 from "./2027.js?v=20260722-essay-part";
import essay2027 from "./2027-essay.js?v=20260722-essay-part";

export const exams = [exam2027];
export const essays = [essay2027];

export const parts = [
  { id: "reasoning", label: "추리논증", exams },
  { id: "essay", label: "논술", exams: essays },
];
