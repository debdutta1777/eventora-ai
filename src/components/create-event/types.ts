import type { Ref } from "react";
import type { FormState, FormError } from "@/lib/event-form";
export interface StepProps {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  stepHeading: Ref<HTMLHeadingElement>;
  error: FormError | null;
}
