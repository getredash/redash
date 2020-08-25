import { toHuman } from "@/lib/utils";

export default function getFieldLabel(field) {
  const { title, name } = field;
  return title || toHuman(name);
}
